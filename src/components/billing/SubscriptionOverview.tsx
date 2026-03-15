import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  CreditCard,
  ExternalLink,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { useSubscription, useOrgMembers } from "@/hooks/useSubscription";
import { PRICING, type SeatType } from "@/hooks/useSubscriptionTier";
import { useCurrency } from "@/hooks/useCurrency";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";
import { useState } from "react";

const SEAT_PRICES: Record<SeatType, number> = {
  lite: PRICING.LITE_SEAT,
  connect: PRICING.CONNECT_SEAT,
  grow: PRICING.GROW_SEAT,
};

export function SubscriptionOverview() {
  const { data: subscription, isLoading: subLoading } = useSubscription();
  const { data: members } = useOrgMembers();
  const { formatCurrency } = useCurrency();
  const [isLoading, setIsLoading] = useState(false);

  const handleManageBilling = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-customer-portal-session");
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch {
      toast.error("Failed to open billing portal");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartSubscription = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: { interval: "month" },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch {
      toast.error("Failed to start checkout");
    } finally {
      setIsLoading(false);
    }
  };

  if (subLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const status = subscription?.status;
  const isTrialing = status === "trialing";
  const isActive = status === "active";
  const isCancelled = subscription?.cancel_at_period_end;
  const isPastDue = status === "past_due";
  const isExpired = status === "expired";

  // Compute seat breakdown
  const seatCounts: Record<SeatType, number> = { lite: 0, connect: 0, grow: 0 };
  members?.forEach((m) => {
    if (seatCounts[m.seat_type] !== undefined) seatCounts[m.seat_type]++;
  });
  const totalMonthly = Object.entries(seatCounts).reduce(
    (sum, [type, count]) => sum + SEAT_PRICES[type as SeatType] * count,
    0
  );

  // Trial progress
  const trialDaysRemaining = subscription?.trial_ends_at
    ? Math.max(0, differenceInDays(new Date(subscription.trial_ends_at), new Date()))
    : 0;
  const trialProgress = isTrialing && subscription?.trial_ends_at
    ? Math.max(0, ((14 - trialDaysRemaining) / 14) * 100)
    : 0;

  const getStatusBadge = () => {
    if (isPastDue) return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Past Due</Badge>;
    if (isCancelled) return <Badge variant="secondary" className="gap-1"><XCircle className="h-3 w-3" />Cancelling</Badge>;
    if (isTrialing) return <Badge className="bg-blue-500/10 text-blue-700 dark:text-blue-400 hover:bg-blue-500/10 gap-1"><Clock className="h-3 w-3" />Trial</Badge>;
    if (isActive) return <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/10 gap-1"><CheckCircle2 className="h-3 w-3" />Active</Badge>;
    if (isExpired) return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Expired</Badge>;
    return null;
  };

  // No subscription at all
  if (!subscription || isExpired) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Subscription
          </CardTitle>
          <CardDescription>Start your free trial to unlock all features</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 space-y-4">
            <div className="p-6 rounded-lg border border-dashed space-y-3">
              <p className="text-lg font-semibold">Start your 14-day free trial</p>
              <p className="text-sm text-muted-foreground">
                No credit card required. Full access to all features including Foreman AI.
              </p>
              <Button onClick={handleStartSubscription} disabled={isLoading} size="lg">
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Start Free Trial"
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Subscription
              {getStatusBadge()}
            </CardTitle>
            <CardDescription>
              {subscription?.current_period_end
                ? `${isCancelled ? "Access ends" : "Next billing"}: ${format(new Date(subscription.current_period_end), "MMMM d, yyyy")}`
                : "Manage your subscription and billing"
              }
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Trial countdown */}
        {isTrialing && (
          <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/20 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Trial Period</p>
              <span className="text-sm font-bold text-blue-700 dark:text-blue-400">
                {trialDaysRemaining} day{trialDaysRemaining !== 1 ? "s" : ""} remaining
              </span>
            </div>
            <Progress value={trialProgress} className="h-2" />
            <p className="text-xs text-muted-foreground">
              Your trial ends {subscription?.trial_ends_at
                ? format(new Date(subscription.trial_ends_at), "MMMM d, yyyy")
                : "soon"
              }. Subscribe to keep full access.
            </p>
          </div>
        )}

        {/* Past due warning */}
        {isPastDue && (
          <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/20 space-y-2">
            <p className="text-sm font-medium text-destructive">Payment Failed</p>
            <p className="text-xs text-muted-foreground">
              Your last payment didn't go through. Please update your payment method to avoid losing access.
            </p>
          </div>
        )}

        {/* Cancelled notice */}
        {isCancelled && (
          <div className="p-4 rounded-lg bg-muted space-y-2">
            <p className="text-sm font-medium">Subscription Cancelled</p>
            <p className="text-xs text-muted-foreground">
              You'll keep access until {subscription?.current_period_end
                ? format(new Date(subscription.current_period_end), "MMMM d, yyyy")
                : "the end of your billing period"
              }. Resubscribe anytime to continue.
            </p>
          </div>
        )}

        {/* Seat breakdown */}
        {(isActive || isTrialing) && members && members.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-3">
            {(["lite", "connect", "grow"] as SeatType[]).map((type) => (
              seatCounts[type] > 0 && (
                <div key={type} className="p-3 rounded-lg bg-muted/50 space-y-1">
                  <p className="text-xs text-muted-foreground capitalize">{type} Seats</p>
                  <p className="text-lg font-bold">{seatCounts[type]}</p>
                  <p className="text-xs text-muted-foreground">
                    × {formatCurrency(SEAT_PRICES[type])}/mo
                  </p>
                </div>
              )
            ))}
          </div>
        )}

        {/* Total cost */}
        {(isActive || isTrialing) && totalMonthly > 0 && (
          <>
            <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5">
              <span className="text-sm font-medium">Total Monthly</span>
              <span className="text-lg font-bold text-primary">{formatCurrency(totalMonthly)}</span>
            </div>
          </>
        )}

        <Separator />

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {isPastDue ? "Update payment method" : "Manage your subscription"}
            </p>
            <p className="text-xs text-muted-foreground">
              {isPastDue
                ? "Update your card to restore full access"
                : "Change plan, update payment, or view invoices"
              }
            </p>
          </div>
          <Button variant="outline" onClick={handleManageBilling} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <ExternalLink className="h-4 w-4 mr-2" />
                {isPastDue ? "Update Payment" : "Manage Billing"}
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
