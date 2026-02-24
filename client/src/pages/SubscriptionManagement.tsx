import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertCircle, CreditCard, Calendar } from "lucide-react";
import { PRODUCTS } from "../../../server/products";

export function SubscriptionManagement() {
  const [isProcessing, setIsProcessing] = useState(false);
  const { data: subscriptionStatus, refetch } = trpc.subscription.getStatus.useQuery();
  const createCheckout = trpc.subscription.createCheckout.useMutation();
  const createBillingPortal = trpc.subscription.createBillingPortal.useMutation();
  const cancelSubscription = trpc.subscription.cancel.useMutation();
  const reactivateSubscription = trpc.subscription.reactivate.useMutation();

  const product = PRODUCTS.PATIENT_PORTAL_MONTHLY;
  const status = subscriptionStatus?.status || "inactive";
  const isActive = status === "active" || status === "trialing";

  const handleSubscribe = async () => {
    setIsProcessing(true);
    try {
      const result = await createCheckout.mutateAsync({
        successUrl: `${window.location.origin}/subscription?success=true`,
        cancelUrl: `${window.location.origin}/subscription?canceled=true`,
      });

      if (result.url) {
        window.open(result.url, "_blank");
      }
    } catch (error) {
      console.error("Error creating checkout:", error);
      alert("Failed to create checkout session. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManageBilling = async () => {
    setIsProcessing(true);
    try {
      const result = await createBillingPortal.mutateAsync({
        returnUrl: window.location.href,
      });

      if (result.url) {
        window.open(result.url, "_blank");
      }
    } catch (error) {
      console.error("Error creating billing portal:", error);
      alert("Failed to open billing portal. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel your subscription? You'll retain access until the end of your billing period.")) {
      return;
    }

    setIsProcessing(true);
    try {
      await cancelSubscription.mutateAsync();
      await refetch();
      alert("Subscription canceled. You'll retain access until the end of your billing period.");
    } catch (error) {
      console.error("Error canceling subscription:", error);
      alert("Failed to cancel subscription. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReactivate = async () => {
    setIsProcessing(true);
    try {
      await reactivateSubscription.mutateAsync();
      await refetch();
      alert("Subscription reactivated successfully!");
    } catch (error) {
      console.error("Error reactivating subscription:", error);
      alert("Failed to reactivate subscription. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500"><CheckCircle2 className="w-4 h-4 mr-1" /> Active</Badge>;
      case "trialing":
        return <Badge className="bg-blue-500"><CheckCircle2 className="w-4 h-4 mr-1" /> Trial</Badge>;
      case "past_due":
        return <Badge className="bg-yellow-500"><AlertCircle className="w-4 h-4 mr-1" /> Past Due</Badge>;
      case "canceled":
        return <Badge className="bg-gray-500"><XCircle className="w-4 h-4 mr-1" /> Canceled</Badge>;
      default:
        return <Badge className="bg-gray-400"><XCircle className="w-4 h-4 mr-1" /> Inactive</Badge>;
    }
  };

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Patient Portal Subscription</h1>
        <p className="text-muted-foreground">
          Manage your subscription to access the full patient portal features
        </p>
      </div>

      {/* Current Status Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Subscription Status</CardTitle>
            {getStatusBadge()}
          </div>
        </CardHeader>
        <CardContent>
          {isActive ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>
                  {subscriptionStatus?.subscriptionEndDate
                    ? `Renews on ${new Date(subscriptionStatus.subscriptionEndDate).toLocaleDateString()}`
                    : "Active subscription"}
                </span>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleManageBilling} disabled={isProcessing}>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Manage Billing
                </Button>
                <Button variant="outline" onClick={handleCancel} disabled={isProcessing}>
                  Cancel Subscription
                </Button>
              </div>
            </div>
          ) : status === "past_due" ? (
            <div className="space-y-4">
              <p className="text-sm text-yellow-600">
                Your payment failed. Please update your payment method to continue access.
              </p>
              <Button onClick={handleManageBilling} disabled={isProcessing}>
                Update Payment Method
              </Button>
            </div>
          ) : status === "canceled" ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Your subscription was canceled. Reactivate to regain access.
              </p>
              <Button onClick={handleReactivate} disabled={isProcessing}>
                Reactivate Subscription
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                You don't have an active subscription. Subscribe to access the patient portal.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Subscription Plan Card */}
      {!isActive && (
        <Card>
          <CardHeader>
            <CardTitle>{product.name}</CardTitle>
            <CardDescription>{product.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold">${(product.priceInCents / 100).toFixed(2)}</span>
                <span className="text-muted-foreground">/ month</span>
              </div>

              <div className="space-y-2">
                <p className="font-semibold">Features included:</p>
                <ul className="space-y-2">
                  {product.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Button
                onClick={handleSubscribe}
                disabled={isProcessing}
                size="lg"
                className="w-full"
              >
                {isProcessing ? "Processing..." : "Subscribe Now"}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Secure payment powered by Stripe. Cancel anytime.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
