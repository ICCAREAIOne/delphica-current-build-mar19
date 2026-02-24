import Stripe from "stripe";
import { PRODUCTS } from "./products";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

/**
 * Create a Stripe checkout session for patient portal subscription
 */
export async function createSubscriptionCheckout(params: {
  userId: number;
  userEmail: string;
  userName: string;
  successUrl: string;
  cancelUrl: string;
}) {
  const product = PRODUCTS.PATIENT_PORTAL_MONTHLY;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: params.userEmail,
    client_reference_id: params.userId.toString(),
    metadata: {
      user_id: params.userId.toString(),
      customer_email: params.userEmail,
      customer_name: params.userName,
    },
    line_items: [
      {
        price_data: {
          currency: product.currency,
          product_data: {
            name: product.name,
            description: product.description,
          },
          unit_amount: product.priceInCents,
          recurring: {
            interval: product.interval,
          },
        },
        quantity: 1,
      },
    ],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    allow_promotion_codes: true,
    subscription_data: {
      metadata: {
        user_id: params.userId.toString(),
      },
    },
  });

  return {
    sessionId: session.id,
    url: session.url,
  };
}

/**
 * Create a Stripe billing portal session for subscription management
 */
export async function createBillingPortalSession(params: {
  stripeCustomerId: string;
  returnUrl: string;
}) {
  const session = await stripe.billingPortal.sessions.create({
    customer: params.stripeCustomerId,
    return_url: params.returnUrl,
  });

  return {
    url: session.url,
  };
}

/**
 * Get subscription details from Stripe
 */
export async function getSubscription(subscriptionId: string) {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    return {
      id: subscription.id,
      status: subscription.status,
      currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    };
  } catch (error) {
    console.error("[Stripe] Error retrieving subscription:", error);
    return null;
  }
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(subscriptionId: string) {
  try {
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
    return {
      success: true,
      cancelAt: new Date((subscription as any).current_period_end * 1000),
    };
  } catch (error) {
    console.error("[Stripe] Error canceling subscription:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Reactivate a canceled subscription
 */
export async function reactivateSubscription(subscriptionId: string) {
  try {
    await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    });
    return { success: true };
  } catch (error) {
    console.error("[Stripe] Error reactivating subscription:", error);
    return { success: false, error: String(error) };
  }
}

export { stripe };
