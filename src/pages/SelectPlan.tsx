import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ArrowRight, ExternalLink, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCurrency } from "@/hooks/useCurrency";
import { toast } from "sonner";
import foremanLogo from "@/assets/foreman-logo.png";
import { track } from "@/utils/analytics";
import { useIsNative, openExternalUrl } from "@/hooks/useIsNative";
import { supabase } from "@/integrations/supabase/client";
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

export default function SelectPlan() {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrency();
  const [teamSize, setTeamSize] = useState(1);
  const [interval, setInterval] = useState<"month" | "year">("month");
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const isNative = useIsNative();

  if (isNative) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <div className="flex items-center justify-center gap-3 mb-4">
              <img src={foremanLogo} alt="Foreman" className="h-10 w-10 rounded-lg" />
              <span className="text-2xl font-bold">Foreman</span>
            </div>
            <CardTitle>Manage Your Subscription</CardTitle>
            <CardDescription>
              Subscription management is available on the web. Visit foreman.ie to choose a plan or manage billing.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="gap-2"
              onClick={() => openExternalUrl("https://foreman.ie/settings?tab=team-billing")}
            >
              <ExternalLink className="h-4 w-4" />
              Open foreman.ie
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isAnnual = interval === "year";
  const basePrice = isAnnual ? PRICING.ANNUAL_BASE_PLAN : PRICING.BASE_PLAN;
  const seatPrice = isAnnual ? PRICING.ANNUAL_EXTRA_SEAT : PRICING.EXTRA_SEAT;
  const extraSeats = Math.max(0, teamSize - PRICING.BASE_USERS);
  const total = basePrice + extraSeats * seatPrice;
  const monthlySavings = isAnnual
    ? (PRICING.BASE_PLAN * 12 + extraSeats * PRICING.EXTRA_SEAT * 12) - total
    : 0;

  const handleCheckout = async () => {
    try {
      setIsCheckingOut(true);
      track("checkout_started", { plan: "foreman", interval, quantity: teamSize });

      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: { teamSize, interval },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.url) {
        toast.info("Redirecting to checkout...");
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("Failed to start checkout. Please try again.");
    } finally {
      setIsCheckingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-lg py-12 px-4">
        <Button
          variant="ghost"
          size="sm"
          className="mb-6 gap-1 text-muted-foreground"
          onClick={() => navigate("/settings?tab=team-billing")}
        >
          ← Back to Settings
        </Button>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-6">
            <img src={foremanLogo} alt="Foreman" className="h-10 w-10 rounded-lg" />
            <span className="text-2xl font-bold">Foreman</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-3">
            One plan. Every feature.
          </h1>
          <p className="text-muted-foreground">
            {formatCurrency(PRICING.BASE_PLAN)}/month includes {PRICING.BASE_USERS} users. +{formatCurrency(PRICING.EXTRA_SEAT)}/mo per extra seat.
          </p>
        </div>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-2 mb-6">
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

        {/* Plan Card */}
        <Card className="border-primary/50 mb-8">
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
              onClick={handleCheckout}
              disabled={isCheckingOut}
            >
              {isCheckingOut ? "Processing..." : "Subscribe Now"}
              {!isCheckingOut && <ArrowRight className="h-4 w-4" />}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              14-day free trial · Cancel anytime · VAT may apply
            </p>
          </CardContent>
        </Card>

        {/* FAQ */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-center">Common Questions</h3>
          <FaqCard
            q="What's the platform fee?"
            a="Foreman charges 1.5% on payments collected through Stripe Connect. No payment, no fee — we only earn when you earn."
          />
          <FaqCard
            q="What's included in the free trial?"
            a="Full access to every feature for 14 days — including Foreman AI voice, GPS tracking, and reports. No credit card required. Cancel anytime."
          />
          <FaqCard
            q="Can I add or remove seats later?"
            a="Yes — adjust your team size anytime from Settings. Changes are pro-rated automatically."
          />
          <FaqCard
            q="Can I switch between monthly and annual?"
            a="Yes — you can switch billing frequency anytime from Manage Billing. If you switch to annual, you'll get the 15% discount applied immediately."
          />
        </div>

        <p className="text-center text-sm text-muted-foreground mt-8">
          14-day free trial · Cancel anytime · VAT may apply
        </p>
      </div>
    </div>
  );
}

function FaqCard({ q, a }: { q: string; a: string }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">{q}</CardTitle></CardHeader>
      <CardContent className="text-sm text-muted-foreground">{a}</CardContent>
    </Card>
  );
}
