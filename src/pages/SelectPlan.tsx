import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ArrowRight, MessageSquare, ExternalLink, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSubscriptionTier, PRICING, STARTER_SEAT_DETAILS, PRO_SEAT_DETAILS, ENTERPRISE_SEAT_DETAILS } from "@/hooks/useSubscriptionTier";
import { useCurrency } from "@/hooks/useCurrency";
import { toast } from "sonner";
import foremanLogo from "@/assets/foreman-logo.png";
import { track } from "@/utils/analytics";
import { useIsNative, openExternalUrl } from "@/hooks/useIsNative";
import { supabase } from "@/integrations/supabase/client";

export default function SelectPlan() {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrency();
  const [billingInterval, setBillingInterval] = useState<"monthly" | "annual">("monthly");
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

  const proMonthly = PRICING.BASE_SEAT;
  const proAnnualTotal = PRICING.ANNUAL_SEAT;
  const proSavings = proMonthly * 12 - proAnnualTotal;

  const handleChoosePlan = async (seatCode: string, quantity: number) => {
    try {
      setIsCheckingOut(true);
      track("checkout_started", { plan: seatCode, interval: billingInterval, quantity });

      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: {
          seatCounts: { [seatCode]: quantity },
          interval: billingInterval === "annual" ? "year" : "month",
        },
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
      <div className="container max-w-4xl py-12 px-4">
        {/* Back to Settings */}
        <Button
          variant="ghost"
          size="sm"
          className="mb-6 gap-1 text-muted-foreground"
          onClick={() => navigate("/settings?tab=team-billing")}
        >
          ← Back to Settings
        </Button>

        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-6">
            <img src={foremanLogo} alt="Foreman" className="h-10 w-10 rounded-lg" />
            <span className="text-2xl font-bold">Foreman</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Simple, transparent pricing
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Start at {formatCurrency(PRICING.STARTER_SEAT)}/seat. Add AI when you're ready. We earn {PRICING.PLATFORM_FEE}% only when you get paid.
          </p>
        </div>

        {/* Billing Toggle */}
        <BillingToggle interval={billingInterval} onChange={setBillingInterval} />

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <PlanCard
            details={STARTER_SEAT_DETAILS}
            monthlyPrice={PRICING.STARTER_SEAT}
            annualPrice={PRICING.ANNUAL_STARTER_SEAT}
            billingInterval={billingInterval}
            formatCurrency={formatCurrency}
            subtitle="For solo operators"
            seatCode="lite"
            onChoose={handleChoosePlan}
            isLoading={isCheckingOut}
          />

          <PlanCard
            details={PRO_SEAT_DETAILS}
            monthlyPrice={proMonthly}
            annualPrice={proAnnualTotal}
            billingInterval={billingInterval}
            formatCurrency={formatCurrency}
            subtitle="Most popular"
            highlighted
            savings={billingInterval === "annual" ? proSavings : undefined}
            seatCode="connect"
            onChoose={handleChoosePlan}
            isLoading={isCheckingOut}
          />

          <Card className="relative border-muted">
            <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-muted-foreground text-background">Enterprise</Badge>
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-lg">{ENTERPRISE_SEAT_DETAILS.name}</CardTitle>
              <CardDescription>For 10+ staff firms</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <span className="text-4xl font-bold">Custom</span>
                <p className="text-xs text-muted-foreground mt-1">Tailored to your team size</p>
              </div>
              <ul className="space-y-2">
                {ENTERPRISE_SEAT_DETAILS.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" /><span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button variant="outline" className="w-full gap-2" asChild>
                <a href="mailto:support@foreman.ie">
                  <MessageSquare className="h-4 w-4" /> Contact Us
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* CTA Section */}
        <Card className="bg-primary/5 border-primary/20 mb-12">
          <CardContent className="py-8 text-center space-y-4">
            <h2 className="text-2xl font-bold">Start your 7-day free trial</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Choose a plan above to start your 7-day free trial. Cancel anytime.
            </p>
          </CardContent>
        </Card>

        {/* FAQ Section */}
        <div className="space-y-6">
          <h3 className="text-xl font-semibold text-center">Frequently Asked Questions</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <FaqCard
              q="What's the platform fee?"
              a={`Foreman charges ${PRICING.PLATFORM_FEE}% on payments collected through Stripe Connect. No payment, no fee — we only earn when you earn. Enterprise customers get a reduced ${PRICING.ENTERPRISE_PLATFORM_FEE}% rate.`}
            />
            <FaqCard
              q="Can I upgrade from Starter to Pro?"
              a="Yes! Upgrade anytime and your team instantly gets Foreman AI voice, GPS time-tracking, and advanced reports. You'll be charged pro-rata for the remainder of your billing period."
            />
            <FaqCard
              q="What's included in the free trial?"
              a={`Full Pro access for 7 days — including ${PRICING.VOICE_MINUTES_PER_SEAT} minutes of Foreman AI voice per seat, GPS tracking, and reports. Card is collected to ensure seamless transition after your 7-day trial. Cancel anytime — you won't be charged until the trial ends.`}
            />
            <FaqCard
              q="Do you offer bulk discounts?"
              a={`Yes — ${PRICING.BULK_DISCOUNT * 100}% off automatically applied for ${PRICING.BULK_DISCOUNT_THRESHOLD}+ seats on any plan.`}
            />
          </div>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-8">
          All plans include 7-day free trial · Cancel anytime · VAT may apply
        </p>
      </div>
    </div>
  );
}

/* ── Sub-components ──────────────────────────────── */

function BillingToggle({ interval, onChange }: { interval: string; onChange: (v: "monthly" | "annual") => void }) {
  return (
    <div className="sticky top-0 z-10 bg-background py-3 flex justify-center mb-6">
      <div className="inline-flex items-center bg-muted rounded-full p-1 gap-1">
        <button
          onClick={() => onChange("monthly")}
          className={`min-h-[44px] px-6 rounded-full text-sm font-semibold transition-all ${
            interval === "monthly" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Monthly
        </button>
        <button
          onClick={() => onChange("annual")}
          className={`min-h-[44px] px-6 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${
            interval === "annual" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Annual
          <span className="bg-green-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">-15%</span>
        </button>
      </div>
    </div>
  );
}

function PlanCard({
  details, monthlyPrice, annualPrice, billingInterval, formatCurrency, subtitle, highlighted, savings, seatCode, onChoose, isLoading,
}: {
  details: { name: string; features: string[] };
  monthlyPrice: number;
  annualPrice: number;
  billingInterval: string;
  formatCurrency: (n: number) => string;
  subtitle: string;
  highlighted?: boolean;
  savings?: number;
  seatCode: string;
  onChoose: (code: string, quantity: number) => void;
  isLoading: boolean;
}) {
  const [quantity, setQuantity] = useState(1);
  const annualMonthly = Math.round(annualPrice / 12);
  const unitPrice = billingInterval === "monthly" ? monthlyPrice : annualMonthly;
  const totalMonthly = unitPrice * quantity;

  return (
    <Card className={`relative ${highlighted ? "border-primary/50" : ""}`}>
      {highlighted && <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">Most Popular</Badge>}
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-lg">{details.name}</CardTitle>
        <CardDescription>{subtitle}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          {billingInterval === "monthly" ? (
            <>
              <span className="text-4xl font-bold">{formatCurrency(monthlyPrice)}</span>
              <span className="text-muted-foreground">/seat/mo</span>
            </>
          ) : (
            <>
              <span className="text-4xl font-bold">{formatCurrency(annualMonthly)}</span>
              <span className="text-muted-foreground">/seat/mo</span>
              <p className="text-xs text-muted-foreground mt-1">{formatCurrency(annualPrice)}/yr billed annually</p>
              {savings && <p className="text-xs font-medium text-green-600">Save {formatCurrency(savings)}/seat/yr</p>}
            </>
          )}
        </div>

        {/* Seat quantity stepper */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            className="h-8 w-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-30"
            disabled={quantity <= 1}
          >
            <Minus className="h-3 w-3" />
          </button>
          <span className="text-lg font-semibold w-8 text-center">{quantity}</span>
          <button
            onClick={() => setQuantity(Math.min(50, quantity + 1))}
            className="h-8 w-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-30"
            disabled={quantity >= 50}
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
        <p className="text-xs text-center text-muted-foreground">
          {quantity} {quantity === 1 ? "seat" : "seats"} × {formatCurrency(unitPrice)}/mo = <span className="font-semibold text-foreground">{formatCurrency(totalMonthly)}/mo</span>
        </p>

        <ul className="space-y-2">
          {details.features.map((f, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" /><span>{f}</span>
            </li>
          ))}
        </ul>
        <Button
          className="w-full gap-2"
          variant={highlighted ? "default" : "outline"}
          onClick={() => onChoose(seatCode, quantity)}
          disabled={isLoading}
        >
          {isLoading ? "Processing..." : `Choose ${details.name}`}
          {!isLoading && <ArrowRight className="h-4 w-4" />}
        </Button>
        {quantity > 1 && (
          <p className="text-[11px] text-center text-muted-foreground">You can change seat types later in Settings</p>
        )}
      </CardContent>
    </Card>
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
