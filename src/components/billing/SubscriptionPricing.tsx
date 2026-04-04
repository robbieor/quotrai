import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, ArrowRight, Minus, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCurrency } from "@/hooks/useCurrency";
import { useIsNative } from "@/hooks/useIsNative";
import { PRICING } from "@/hooks/useSubscriptionTier";

const allFeatures = [
  "Unlimited quotes & invoices",
  "Job scheduling & calendar",
  "Customer management & GPS tracking",
  "Foreman AI — text & voice assistant",
  "Expense tracking & receipt capture",
  "Reports, dashboards & recurring invoices",
  "Xero & QuickBooks sync",
  "PDF generation & team collaboration",
];

export function SubscriptionPricing() {
  const { formatCurrency } = useCurrency();
  const isNative = useIsNative();
  const [teamSize, setTeamSize] = useState(1);
  const [interval, setInterval] = useState<"month" | "year">("month");
  const [isLoading, setIsLoading] = useState(false);

  if (isNative) return null;

  const isAnnual = interval === "year";
  const basePrice = isAnnual ? PRICING.ANNUAL_BASE_PLAN : PRICING.BASE_PLAN;
  const seatPrice = isAnnual ? PRICING.ANNUAL_EXTRA_SEAT : PRICING.EXTRA_SEAT;
  const extraSeats = Math.max(0, teamSize - PRICING.BASE_USERS);
  const total = basePrice + extraSeats * seatPrice;
  const monthlySavings = isAnnual
    ? (PRICING.BASE_PLAN * 12 + extraSeats * PRICING.EXTRA_SEAT * 12) - total
    : 0;

  const handleSubscribe = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: { teamSize, interval },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.url) window.location.href = data.url;
    } catch {
      toast.error("Failed to start checkout");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={() => setInterval("month")}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            !isAnnual
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          Monthly
        </button>
        <button
          onClick={() => setInterval("year")}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${
            isAnnual
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          Annual
          <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-700 dark:text-green-400 border-0">
            Save 15%
          </Badge>
        </button>
      </div>

      <Card className="border-primary/50">
        <CardContent className="p-6 sm:p-8 space-y-6">
          {/* Price */}
          <div className="text-center">
            <div className="flex items-baseline justify-center gap-1 mb-1">
              <span className="text-4xl font-bold">{formatCurrency(total)}</span>
              <span className="text-muted-foreground">/{isAnnual ? "year" : "month"}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {teamSize <= PRICING.BASE_USERS
                ? `${teamSize} ${teamSize === 1 ? "user" : "users"} — included in base plan`
                : `${PRICING.BASE_USERS} included + ${extraSeats} extra ${extraSeats === 1 ? "seat" : "seats"} × ${formatCurrency(seatPrice)}`}
            </p>
            {isAnnual && monthlySavings > 0 && (
              <p className="text-sm text-green-600 dark:text-green-400 font-medium mt-1">
                You save {formatCurrency(monthlySavings)} per year
              </p>
            )}
          </div>

          {/* Team size stepper */}
          <div>
            <p className="text-sm font-medium text-center mb-3">Team size</p>
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => setTeamSize(Math.max(1, teamSize - 1))}
                className="h-10 w-10 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-30"
                disabled={teamSize <= 1}
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="text-2xl font-bold w-12 text-center">{teamSize}</span>
              <button
                onClick={() => setTeamSize(Math.min(50, teamSize + 1))}
                className="h-10 w-10 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-30"
                disabled={teamSize >= 50}
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Features */}
          <ul className="space-y-2.5">
            {allFeatures.map((f, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm">
                <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span>{f}</span>
              </li>
            ))}
          </ul>

          {/* CTA */}
          <Button
            className="w-full gap-2"
            size="lg"
            onClick={handleSubscribe}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Subscribe Now
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            14-day free trial · 1.5% platform fee on payments · Cancel anytime
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
