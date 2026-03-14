import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { 
  Users, 
  Check, 
  CreditCard, 
  ExternalLink, 
  Loader2,
  Calculator,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useSubscription } from "@/hooks/useSubscription";
import { useTeamMembers } from "@/hooks/useTeam";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { PRICING, STARTER_SEAT_DETAILS, PRO_SEAT_DETAILS } from "@/hooks/useSubscriptionTier";
import { useCurrency } from "@/hooks/useCurrency";

export function SubscriptionPricing() {
  const { data: subscription, isLoading: subscriptionLoading } = useSubscription();
  const { data: teamMembers } = useTeamMembers();
  const { formatCurrency } = useCurrency();
  const [isLoading, setIsLoading] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [calcSeats, setCalcSeats] = useState(3);
  const [billingInterval, setBillingInterval] = useState<"monthly" | "annual">("monthly");

  const proMonthly = PRICING.BASE_SEAT;
  const proAnnualTotal = PRICING.ANNUAL_SEAT;
  const proAnnualMonthly = Math.round(proAnnualTotal / 12);

  const totalSeats = teamMembers?.length || 1;
  const totalMonthlyCost = billingInterval === "monthly" 
    ? totalSeats * proMonthly 
    : totalSeats * proAnnualMonthly;

  const calcPrice = billingInterval === "monthly" ? proMonthly : proAnnualMonthly;
  const calcTotal = calcSeats * calcPrice;

  const handleManageBilling = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-customer-portal-session");
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to open billing portal");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartSubscription = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: { quantity: totalSeats, interval: billingInterval === "annual" ? "year" : "month" },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to start checkout");
    } finally {
      setIsLoading(false);
    }
  };

  const hasActiveSubscription = subscription?.status === "active" || subscription?.status === "trialing";

  return (
    <div className="space-y-6">
      {/* Billing Toggle */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => setBillingInterval("monthly")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            billingInterval === "monthly"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          Monthly
        </button>
        <button
          onClick={() => setBillingInterval("annual")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors relative ${
            billingInterval === "annual"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          Annual
          <Badge className="absolute -top-2 -right-4 bg-green-600 text-[10px] px-1.5 py-0">
            -15%
          </Badge>
        </button>
      </div>

      {/* Seat Type Cards */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Starter Seat */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-muted">
                <Users className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="text-lg">Starter</CardTitle>
                <CardDescription>Core features, no AI</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              {billingInterval === "monthly" ? (
                <>
                  <span className="text-3xl font-bold">{formatCurrency(PRICING.STARTER_SEAT)}</span>
                  <span className="text-muted-foreground">/seat/month</span>
                </>
              ) : (
                <>
                  <span className="text-3xl font-bold">{formatCurrency(Math.round(PRICING.ANNUAL_STARTER_SEAT / 12))}</span>
                  <span className="text-muted-foreground">/seat/month</span>
                  <p className="text-xs text-muted-foreground mt-1">{formatCurrency(PRICING.ANNUAL_STARTER_SEAT)}/seat billed annually</p>
                </>
              )}
            </div>
            <ul className="space-y-2">
              {STARTER_SEAT_DETAILS.features.map((feature, idx) => (
                <li key={idx} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Pro Seat */}
        <Card className="relative overflow-hidden border-primary/50">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16" />
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Pro</CardTitle>
                <CardDescription>Full access + Foreman AI</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              {billingInterval === "monthly" ? (
                <>
                  <span className="text-3xl font-bold">{formatCurrency(proMonthly)}</span>
                  <span className="text-muted-foreground">/seat/month</span>
                </>
              ) : (
                <>
                  <span className="text-3xl font-bold">{formatCurrency(proAnnualMonthly)}</span>
                  <span className="text-muted-foreground">/seat/month</span>
                  <p className="text-xs text-muted-foreground mt-1">{formatCurrency(proAnnualTotal)}/seat billed annually</p>
                  <p className="text-xs font-medium text-green-600">Save {formatCurrency((proMonthly * 12) - proAnnualTotal)}/seat per year</p>
                </>
              )}
            </div>
            <ul className="space-y-2">
              {PRO_SEAT_DETAILS.features.map((feature, idx) => (
                <li key={idx} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Current Subscription Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Your Current Subscription
          </CardTitle>
          <CardDescription>
            {hasActiveSubscription 
              ? `Next billing date: ${subscription?.current_period_end ? format(new Date(subscription.current_period_end), "MMMM d, yyyy") : "N/A"}`
              : "Start your subscription to unlock all features"
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasActiveSubscription ? (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 rounded-lg bg-muted/50 space-y-1">
                  <p className="text-sm text-muted-foreground">Team Seats</p>
                  <p className="text-2xl font-bold">{totalSeats}</p>
                  <p className="text-xs text-muted-foreground">
                    × {formatCurrency(billingInterval === "monthly" ? proMonthly : proAnnualMonthly)}/month each
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-primary/10 space-y-1">
                  <p className="text-sm text-muted-foreground">Total Monthly</p>
                  <p className="text-2xl font-bold text-primary">{formatCurrency(totalMonthlyCost)}</p>
                  <p className="text-xs text-muted-foreground">
                    + {PRICING.PLATFORM_FEE}% on payments collected
                  </p>
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Manage your subscription</p>
                  <p className="text-xs text-muted-foreground">
                    Update payment method, view invoices, or cancel
                  </p>
                </div>
                <Button variant="outline" onClick={handleManageBilling} disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Manage Billing
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-6 space-y-4">
              <div className="p-4 rounded-lg border border-dashed">
                <p className="text-lg font-medium mb-2">Start your 30-day free trial</p>
                <p className="text-sm text-muted-foreground mb-4">
                  No credit card required. Full Pro access including Foreman AI.
                </p>
                <Button onClick={handleStartSubscription} disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    `Start Free Trial${billingInterval === "annual" ? " (Annual)" : ""}`
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pricing Calculator */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              <CardTitle>Pricing Calculator</CardTitle>
            </div>
            <Switch checked={showCalculator} onCheckedChange={setShowCalculator} />
          </div>
          <CardDescription>Estimate your monthly cost based on team size</CardDescription>
        </CardHeader>
        {showCalculator && (
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Team Members</label>
                  <div className="flex items-center gap-4 mt-2">
                    <Button variant="outline" size="icon" onClick={() => setCalcSeats(Math.max(1, calcSeats - 1))}>-</Button>
                    <span className="text-2xl font-bold w-12 text-center">{calcSeats}</span>
                    <Button variant="outline" size="icon" onClick={() => setCalcSeats(calcSeats + 1)}>+</Button>
                    <span className="text-muted-foreground">× {formatCurrency(calcPrice)}</span>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-lg bg-muted/50 space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Seats ({calcSeats} × {formatCurrency(calcPrice)})</span>
                  <span>{formatCurrency(calcTotal)}</span>
                </div>
                {calcSeats >= PRICING.BULK_DISCOUNT_THRESHOLD && (
                  <div className="flex justify-between text-sm text-green-600 font-medium">
                    <span>Bulk discount ({PRICING.BULK_DISCOUNT * 100}% off)</span>
                    <span>-{formatCurrency(Math.round(calcTotal * PRICING.BULK_DISCOUNT))}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-bold">
                  <span>Monthly Total</span>
                  <span className="text-primary">
                    {formatCurrency(calcSeats >= PRICING.BULK_DISCOUNT_THRESHOLD
                      ? Math.round(calcTotal * (1 - PRICING.BULK_DISCOUNT))
                      : calcTotal
                    )}
                  </span>
                </div>
                {billingInterval === "annual" && (
                  <div className="flex justify-between text-sm text-green-600 font-medium">
                    <span>Annual savings</span>
                    <span>{formatCurrency(calcSeats * ((proMonthly * 12) - proAnnualTotal))}/year</span>
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  + {PRICING.PLATFORM_FEE}% on payments collected · Starter seats available at {formatCurrency(PRICING.STARTER_SEAT)}/mo
                </p>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* FAQ */}
      <Card>
        <CardHeader>
          <CardTitle>Frequently Asked Questions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="font-medium">What's the difference between Starter and Pro?</p>
            <p className="text-sm text-muted-foreground mt-1">
              <strong>Starter</strong> ({formatCurrency(PRICING.STARTER_SEAT)}/mo) gives you quotes, invoices, jobs, and customer management.{" "}
              <strong>Pro</strong> ({formatCurrency(proMonthly)}/mo) adds Foreman AI voice & text, GPS tracking, reports, and accounting sync.
            </p>
          </div>
          <Separator />
          <div>
            <p className="font-medium">What's the {PRICING.PLATFORM_FEE}% platform fee?</p>
            <p className="text-sm text-muted-foreground mt-1">
              When customers pay invoices through Quotr, we take {PRICING.PLATFORM_FEE}% of the payment. No payment, no fee — we only earn when you earn.
            </p>
          </div>
          <Separator />
          <div>
            <p className="font-medium">Can I cancel anytime?</p>
            <p className="text-sm text-muted-foreground mt-1">
              Yes, cancel anytime. Your data is preserved and you keep access until the end of your billing period.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
