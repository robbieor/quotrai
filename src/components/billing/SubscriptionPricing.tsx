import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Loader2, ArrowRight, Minus, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCurrency } from "@/hooks/useCurrency";
import { useIsNative } from "@/hooks/useIsNative";

const BASE_PRICE = 39;
const EXTRA_SEAT = 19;
const BASE_USERS = 3;

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
  const [isLoading, setIsLoading] = useState(false);

  if (isNative) return null;

  const extraSeats = Math.max(0, teamSize - BASE_USERS);
  const totalMonthly = BASE_PRICE + extraSeats * EXTRA_SEAT;

  const handleSubscribe = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: { teamSize, interval: "month" },
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
      <Card className="border-primary/50">
        <CardContent className="p-6 sm:p-8 space-y-6">
          {/* Price */}
          <div className="text-center">
            <div className="flex items-baseline justify-center gap-1 mb-1">
              <span className="text-4xl font-bold">{formatCurrency(totalMonthly)}</span>
              <span className="text-muted-foreground">/month</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {teamSize <= BASE_USERS
                ? `${teamSize} ${teamSize === 1 ? "user" : "users"} — included in base plan`
                : `${BASE_USERS} included + ${extraSeats} extra ${extraSeats === 1 ? "seat" : "seats"} × ${formatCurrency(EXTRA_SEAT)}`}
            </p>
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
