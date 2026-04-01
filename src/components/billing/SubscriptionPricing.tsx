import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, X, Loader2, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ALL_PLANS, PRICING, STRIPE_PRICES, type PlanDetails, type SeatType } from "@/hooks/useSubscriptionTier";
import { useCurrency } from "@/hooks/useCurrency";
import { useIsNative } from "@/hooks/useIsNative";

interface FeatureRow {
  label: string;
  lite: boolean;
  connect: boolean;
  grow: boolean;
}

const FEATURE_MATRIX: FeatureRow[] = [
  { label: "Jobs / Calendar",        lite: true,  connect: true,  grow: true },
  { label: "Time Tracking",          lite: true,  connect: true,  grow: true },
  { label: "Customer Management",    lite: true,  connect: true,  grow: true },
  { label: "Quotes & Invoices",      lite: true,  connect: true,  grow: true },
  { label: "PDF & Email",            lite: true,  connect: true,  grow: true },
  { label: "Team Collaboration",     lite: true,  connect: true,  grow: true },
  { label: "George AI (text+voice)", lite: false, connect: true,  grow: true },
  { label: "Expense Tracking",       lite: false, connect: true,  grow: true },
  { label: "Documents",              lite: false, connect: true,  grow: true },
  { label: "Reports / Dashboards",   lite: false, connect: true,  grow: true },
  { label: "Recurring Invoices",     lite: false, connect: true,  grow: true },
  { label: "Xero / QuickBooks",      lite: false, connect: false, grow: true },
  { label: "Lead Management",        lite: false, connect: false, grow: true },
  { label: "Advanced Reporting",     lite: false, connect: false, grow: true },
  { label: "API Access",             lite: false, connect: false, grow: true },
];

export function SubscriptionPricing() {
  const { formatCurrency } = useCurrency();
  const isNative = useIsNative();
  const [billingInterval, setBillingInterval] = useState<"monthly" | "annual">("monthly");
  const [isLoading, setIsLoading] = useState<string | null>(null);

  if (isNative) return null;

  const handleSubscribe = async (plan: PlanDetails) => {
    setIsLoading(plan.code);
    try {
      const interval = billingInterval === "annual" ? "year" : "month";
      const priceId = STRIPE_PRICES[plan.code][billingInterval === "annual" ? "annual" : "monthly"];
      
      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: { 
          seatCounts: { [plan.code]: 1 },
          interval,
        },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch {
      toast.error("Failed to start checkout");
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Billing Toggle - sticky on mobile */}
      <div className="sticky top-0 z-10 bg-background py-3 flex justify-center">
        <div className="inline-flex items-center bg-muted rounded-full p-1 gap-1">
          <button
            onClick={() => setBillingInterval("monthly")}
            className={`min-h-[44px] px-6 rounded-full text-sm font-semibold transition-all ${
              billingInterval === "monthly"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingInterval("annual")}
            className={`min-h-[44px] px-6 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${
              billingInterval === "annual"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Annual
            <span className="bg-green-600 text-white text-[12px] font-bold px-2 py-0.5 rounded-full">
              -15%
            </span>
          </button>
        </div>
      </div>

      {/* 3-tier Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {ALL_PLANS.map((plan) => {
          const monthlyPrice = billingInterval === "monthly"
            ? plan.price
            : Math.round(plan.annualPrice / 12);
          const isHighlighted = plan.highlighted;
          const seatKey = plan.code as SeatType;

          return (
            <Card
              key={plan.code}
              className={`relative overflow-hidden transition-all ${
                isHighlighted
                  ? "border-primary/50 shadow-md"
                  : ""
              }`}
            >
              {isHighlighted && (
                <div className="absolute top-0 inset-x-0 h-1 bg-primary" />
              )}
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    {isHighlighted && (
                      <Badge variant="secondary" className="mt-1 gap-1 text-xs">
                        <Star className="h-3 w-3" />
                        Most Popular
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-3xl font-bold">{formatCurrency(monthlyPrice)}</span>
                  <span className="text-muted-foreground">/seat/mo</span>
                  {billingInterval === "annual" && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatCurrency(plan.annualPrice)}/seat billed annually
                    </p>
                  )}
                  {billingInterval === "annual" && (
                    <p className="text-xs font-medium text-green-600">
                      Save {formatCurrency((plan.price * 12) - plan.annualPrice)}/seat per year
                    </p>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Feature matrix */}
                <ul className="space-y-1.5">
                  {FEATURE_MATRIX.map((feature, idx) => {
                    const included = feature[seatKey];
                    return (
                      <li
                        key={idx}
                        className={`flex items-center gap-2 text-sm ${
                          included ? "" : "text-muted-foreground/50"
                        }`}
                      >
                        {included ? (
                          <Check className="h-4 w-4 text-primary shrink-0" />
                        ) : (
                          <X className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                        )}
                        <span>{feature.label}</span>
                      </li>
                    );
                  })}
                </ul>
                <Button
                  className="w-full"
                  variant={isHighlighted ? "default" : "outline"}
                  onClick={() => handleSubscribe(plan)}
                  disabled={isLoading !== null}
                >
                  {isLoading === plan.code ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    `Choose ${plan.name}`
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Platform fee note */}
      <p className="text-xs text-center text-muted-foreground">
        All plans include a {PRICING.PLATFORM_FEE}% platform fee on payments collected (reduced to {PRICING.GROW_PLATFORM_FEE}% on Grow).
        Cancel anytime — your data is always preserved.
      </p>
    </div>
  );
}
