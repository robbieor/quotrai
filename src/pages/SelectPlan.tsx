import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ArrowRight, MessageSquare, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSubscriptionTier, PRICING, STARTER_SEAT_DETAILS, PRO_SEAT_DETAILS, ENTERPRISE_SEAT_DETAILS } from "@/hooks/useSubscriptionTier";
import { useCurrency } from "@/hooks/useCurrency";
import { toast } from "sonner";
import foremanLogo from "@/assets/foreman-logo.png";
import { track } from "@/utils/analytics";
import { useIsNative, openExternalUrl } from "@/hooks/useIsNative";

export default function SelectPlan() {
  const navigate = useNavigate();
  const { startTrial, isStartingTrial } = useSubscriptionTier();
  const { formatCurrency } = useCurrency();
  const [billingInterval, setBillingInterval] = useState<"monthly" | "annual">("monthly");
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
              Subscription management is available on the web. Visit quotr.work to choose a plan or manage billing.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="gap-2"
              onClick={() => openExternalUrl("https://quotr.work/settings?tab=team-billing")}
            >
              <ExternalLink className="h-4 w-4" />
              Open quotr.work
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const proMonthly = PRICING.BASE_SEAT;
  const proAnnualTotal = PRICING.ANNUAL_SEAT;
  const proAnnualMonthly = Math.round(proAnnualTotal / 12);
  const proSavings = proMonthly * 12 - proAnnualTotal;

  const handleStartTrial = async () => {
    try {
      track("trial_started", { interval: billingInterval });
      await startTrial();
      toast.success("Your 30-day free trial has started!");
      navigate("/dashboard");
    } catch (error) {
      toast.error("Failed to start trial. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl py-12 px-4">
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
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <PlanCard
            details={STARTER_SEAT_DETAILS}
            monthlyPrice={PRICING.STARTER_SEAT}
            annualPrice={PRICING.ANNUAL_STARTER_SEAT}
            billingInterval={billingInterval}
            formatCurrency={formatCurrency}
            subtitle="For solo operators"
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
                <a href="mailto:hello@quotr.ai">
                  <MessageSquare className="h-4 w-4" /> Contact Us
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* CTA Section */}
        <Card className="bg-primary/5 border-primary/20 mb-12">
          <CardContent className="py-8 text-center space-y-4">
            <h2 className="text-2xl font-bold">Start your 30-day free trial</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              No credit card required. Full Pro access including Foreman AI Voice.
            </p>
            <Button
              size="lg"
              onClick={handleStartTrial}
              disabled={isStartingTrial}
              className="gap-2"
            >
              {isStartingTrial ? "Starting..." : "Start Free Trial"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        {/* FAQ Section */}
        <div className="space-y-6">
          <h3 className="text-xl font-semibold text-center">Frequently Asked Questions</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <FaqCard
              q="What's the platform fee?"
              a={`Quotr charges ${PRICING.PLATFORM_FEE}% on payments collected through Stripe Connect. No payment, no fee — we only earn when you earn. Enterprise customers get a reduced ${PRICING.ENTERPRISE_PLATFORM_FEE}% rate.`}
            />
            <FaqCard
              q="Can I upgrade from Starter to Pro?"
              a="Yes! Upgrade anytime and your team instantly gets Foreman AI voice, GPS time-tracking, and advanced reports. You'll be charged pro-rata for the remainder of your billing period."
            />
            <FaqCard
              q="What's included in the free trial?"
              a={`Full Pro access for 30 days — including ${PRICING.VOICE_MINUTES_PER_SEAT} minutes of Foreman AI voice per seat, GPS tracking, and reports. No credit card needed.`}
            />
            <FaqCard
              q="Do you offer bulk discounts?"
              a={`Yes — ${PRICING.BULK_DISCOUNT * 100}% off automatically applied for ${PRICING.BULK_DISCOUNT_THRESHOLD}+ seats on any plan.`}
            />
          </div>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-8">
          All plans include 30-day free trial · Cancel anytime · VAT may apply
        </p>
      </div>
    </div>
  );
}

/* ── Sub-components ──────────────────────────────── */

function BillingToggle({ interval, onChange }: { interval: string; onChange: (v: "monthly" | "annual") => void }) {
  return (
    <div className="flex items-center justify-center gap-3 mb-8">
      <button
        onClick={() => onChange("monthly")}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
          interval === "monthly" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
        }`}
      >
        Monthly
      </button>
      <button
        onClick={() => onChange("annual")}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors relative ${
          interval === "annual" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
        }`}
      >
        Annual
        <Badge className="absolute -top-2 -right-4 bg-green-600 text-[10px] px-1.5 py-0">-15%</Badge>
      </button>
    </div>
  );
}

function PlanCard({
  details, monthlyPrice, annualPrice, billingInterval, formatCurrency, subtitle, highlighted, savings,
}: {
  details: { name: string; features: string[] };
  monthlyPrice: number;
  annualPrice: number;
  billingInterval: string;
  formatCurrency: (n: number) => string;
  subtitle: string;
  highlighted?: boolean;
  savings?: number;
}) {
  const annualMonthly = Math.round(annualPrice / 12);
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
        <ul className="space-y-2">
          {details.features.map((f, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" /><span>{f}</span>
            </li>
          ))}
        </ul>
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
