import type { Request, Response } from "express";
import { stripe } from "./stripeService";
import * as db from "./db";

/**
 * Stripe Webhook Handler
 * Processes subscription lifecycle events
 */
export async function handleStripeWebhook(req: Request, res: Response) {
  const sig = req.headers["stripe-signature"];

  if (!sig) {
    console.error("[Webhook] No signature found");
    return res.status(400).send("No signature");
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("[Webhook] Signature verification failed:", err);
    return res.status(400).send(`Webhook Error: ${err}`);
  }

  // Handle test events
  if (event.id.startsWith("evt_test_")) {
    console.log("[Webhook] Test event detected, returning verification response");
    return res.json({ verified: true });
  }

  console.log(`[Webhook] Processing event: ${event.type}`);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = parseInt(session.metadata?.user_id || session.client_reference_id || "0");
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        if (userId && customerId && subscriptionId) {
          // Update user with Stripe customer ID and subscription ID
          await db.updateUserSubscription(userId, {
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            subscriptionStatus: "active",
          });
          console.log(`[Webhook] Subscription created for user ${userId}`);
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const userId = parseInt(subscription.metadata?.user_id || "0");

        if (userId) {
          const status = subscription.status as "active" | "canceled" | "past_due" | "trialing" | "inactive";
          const endDate = new Date((subscription as any).current_period_end * 1000);

          await db.updateUserSubscription(userId, {
            subscriptionStatus: status,
            subscriptionEndDate: endDate,
          });
          console.log(`[Webhook] Subscription updated for user ${userId}: ${status}`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const userId = parseInt(subscription.metadata?.user_id || "0");

        if (userId) {
          await db.updateUserSubscription(userId, {
            subscriptionStatus: "canceled",
            subscriptionEndDate: new Date(subscription.ended_at! * 1000),
          });
          console.log(`[Webhook] Subscription canceled for user ${userId}`);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const subscriptionId = (invoice as any).subscription as string;

        if (subscriptionId) {
          // Find user by subscription ID and update status
          const user = await db.getUserBySubscriptionId(subscriptionId);
          if (user) {
            await db.updateUserSubscription(user.id, {
              subscriptionStatus: "past_due",
            });
            console.log(`[Webhook] Payment failed for user ${user.id}`);
          }
        }
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object;
        const subscriptionId = (invoice as any).subscription as string;

        if (subscriptionId) {
          const user = await db.getUserBySubscriptionId(subscriptionId);
          if (user && user.subscriptionStatus === "past_due") {
            await db.updateUserSubscription(user.id, {
              subscriptionStatus: "active",
            });
            console.log(`[Webhook] Payment succeeded, reactivated user ${user.id}`);
          }
        }
        break;
      }

      default:
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error("[Webhook] Error processing event:", error);
    res.status(500).json({ error: "Webhook processing failed" });
  }
}
