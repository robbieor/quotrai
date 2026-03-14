import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CreditCard, ExternalLink, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useSubscription, useCreateCheckoutSession, useCreateCustomerPortalSession } from "@/hooks/useSubscription";
import { format } from "date-fns";

const PRICE_ID = import.meta.env.VITE_STRIPE_PRICE_ID || "price_XXXXX";

export function SubscriptionManagement() {
  const { data: subscription, isLoading } = useSubscription();
  const createCheckout = useCreateCheckoutSession();
  const createPortal = useCreateCustomerPortalSession();

  const handleSubscribe = async () => {
    try {
      const result = await createCheckout.mutateAsync({ priceId: PRICE_ID, quantity: 1 });
      if (result.url) {
        window.location.href = result.url;
      }
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleManageSubscription = async () => {
    try {
      const result = await createPortal.mutateAsync();
      if (result.url) {
        window.location.href = result.url;
      }
    } catch (error) {
      // Error handled by mutation
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  const hasActiveSubscription = subscription?.status === "active" || subscription?.status === "trialing";

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/10"><CheckCircle2 className="h-3 w-3 mr-1" />Active</Badge>;
      case "trialing":
        return <Badge className="bg-blue-500/10 text-blue-700 dark:text-blue-400 hover:bg-blue-500/10">Trial</Badge>;
      case "past_due":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Past Due</Badge>;
      case "canceled":
        return <Badge variant="secondary">Canceled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Subscription
        </CardTitle>
        <CardDescription>
          Manage your subscription and billing
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasActiveSubscription ? (
          <>
            <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">Team Plan</p>
                  {subscription?.status && getStatusBadge(subscription.status)}
                </div>
                <p className="text-sm text-muted-foreground">
                  {subscription?.seat_count} seat{subscription?.seat_count !== 1 ? "s" : ""} • €29/seat/month
                </p>
                {subscription?.current_period_end && (
                  <p className="text-xs text-muted-foreground">
                    Renews {format(new Date(subscription.current_period_end), "MMMM d, yyyy")}
                  </p>
                )}
              </div>
              <Button 
                variant="outline" 
                onClick={handleManageSubscription}
                disabled={createPortal.isPending}
              >
                {createPortal.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Manage
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Update payment method, change seats, or cancel your subscription through Stripe's secure portal.
            </p>
          </>
        ) : (
          <>
            <div className="p-4 rounded-lg border border-dashed text-center space-y-3">
              <CreditCard className="h-8 w-8 mx-auto text-muted-foreground" />
              <div>
                <p className="font-medium">No active subscription</p>
                <p className="text-sm text-muted-foreground">
                  Subscribe to invite team members and unlock all features
                </p>
              </div>
              <Button onClick={handleSubscribe} disabled={createCheckout.isPending}>
                {createCheckout.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Subscribe Now"
                )}
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="font-medium">€29/seat/month</p>
                <p className="text-muted-foreground text-xs">Per team member</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="font-medium">Automatic tax</p>
                <p className="text-muted-foreground text-xs">VAT/GST included</p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
