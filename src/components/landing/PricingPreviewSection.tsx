import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  ArrowRight,
  Calculator,
  TrendingUp,
} from "lucide-react";
import { ALL_TIERS, PRICING, type TierDetails } from "@/hooks/useSubscriptionTier";

interface PricingPreviewSectionProps {
  formatPrice: (eur: number, decimals?: number) => string;
}

const PLATFORM_FEE = PRICING.PLATFORM_FEE / 100;

export function PricingPreviewSection({ formatPrice }: PricingPreviewSectionProps) {
  const [billing, setBilling] = useState<"month" | "year">("year");
  const [monthlyInvoice, setMonthlyInvoice] = useState(5000);

  const isAnnual = billing === "year";

  // Earn-back calculator pegged to Crew tier (the recommended plan)
  const crew = ALL_TIERS.find((t) => t.id === "crew")!;
  const crewMonthlyEquiv = isAnnual ? crew.annual / 12 : crew.monthly;
  const platformEarnings = monthlyInvoice * PLATFORM_FEE;
  const coveragePercent = Math.min((platformEarnings / crewMonthlyEquiv) * 100, 100);
  const isFullyCovered = platformEarnings >= crewMonthlyEquiv;
  const surplus = platformEarnings - crewMonthlyEquiv;
  const breakeven = Math.ceil(crewMonthlyEquiv / PLATFORM_FEE);

  return (
    <section id="pricing" className="py-16 sm:py-24 px-4 sm:px-6 bg-muted/30 border-y border-border">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4">
            <TrendingUp className="h-3.5 w-3.5" />
            Software that pays for itself
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-foreground mb-3">
            Pick the plan that runs your business.{" "}
            <span className="bg-gradient-to-r from-primary to-teal-400 bg-clip-text text-transparent">
              AI optional.
            </span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-base">
            Three plans. No seat caps. The 2.9% platform fee on integrated payments earns most teams their subscription back inside a month.
          </p>
        </div>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <button
            onClick={() => setBilling("month")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              !isAnnual
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBilling("year")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${
              isAnnual
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            Annual
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-green-500/15 text-green-600 dark:text-green-400">
              Save 15%
            </span>
          </button>
        </div>

        {/* 3 Tier Cards */}
        <div className="grid md:grid-cols-3 gap-5 mb-12">
          {ALL_TIERS.map((tier) => (
            <TierCard
              key={tier.id}
              tier={tier}
              isAnnual={isAnnual}
              formatPrice={formatPrice}
            />
          ))}
        </div>

        {/* Earn-back mini card */}
        <div className="max-w-xl mx-auto p-5 rounded-2xl bg-card border border-border">
          <div className="flex items-center gap-2 mb-3">
            <Calculator className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">
              How fast does the Crew plan pay for itself?
            </span>
          </div>

          <label className="text-xs text-muted-foreground block mb-2">
            Monthly invoicing volume
          </label>
          <div className="flex items-center gap-3 mb-3">
            <Slider
              value={[monthlyInvoice]}
              onValueChange={([v]) => setMonthlyInvoice(v)}
              min={500}
              max={50000}
              step={500}
              className="flex-1"
            />
            <span className="text-sm font-bold text-foreground min-w-[72px] text-right">
              {formatPrice(monthlyInvoice, 0)}
            </span>
          </div>

          <Progress value={coveragePercent} className="h-2 mb-2" />

          <div className="flex justify-between text-xs text-muted-foreground mb-2">
            <span>
              Fee earned: <span className="font-semibold text-primary">{formatPrice(platformEarnings)}</span>/mo
            </span>
            <span>Crew cost: {formatPrice(crewMonthlyEquiv)}/mo</span>
          </div>

          {isFullyCovered ? (
            <p className="text-xs font-semibold text-green-600 dark:text-green-400">
              ✓ Subscription covered. You earn {formatPrice(surplus)} extra/mo.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Invoice {formatPrice(breakeven, 0)} to fully cover it.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function TierCard({
  tier,
  isAnnual,
  formatPrice,
}: {
  tier: TierDetails;
  isAnnual: boolean;
  formatPrice: (eur: number, decimals?: number) => string;
}) {
  const displayPrice = isAnnual ? tier.annual / 12 : tier.monthly;
  const billingNote = isAnnual ? "/mo, billed annually" : "/month";
  const isHighlighted = tier.highlighted;

  return (
    <div
      className={`relative p-6 rounded-2xl bg-card flex flex-col ${
        isHighlighted
          ? "border-2 border-primary shadow-[0_0_30px_-5px_hsl(159,100%,45%,0.2)]"
          : tier.id === 'business'
          ? "border-2 border-amber-500/40 shadow-[0_0_30px_-8px_hsl(38,92%,50%,0.2)]"
          : "border border-border"
      }`}
    >
      {tier.badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span
            className={`px-3 py-1 text-xs font-bold rounded-full whitespace-nowrap ${
              tier.id === 'business'
                ? 'bg-amber-500 text-white'
                : 'bg-primary text-primary-foreground'
            }`}
          >
            {tier.badge}
          </span>
        </div>
      )}

      <div className="mb-4 pt-2">
        <h3 className="text-lg font-bold text-foreground">{tier.name}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{tier.tagline}</p>
      </div>

      <div className="mb-4">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-extrabold text-foreground">
            {formatPrice(displayPrice)}
          </span>
          <span className="text-xs text-muted-foreground">{billingNote}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {tier.includedSeats} {tier.includedSeats === 1 ? "user" : "users"} included
          {tier.extraSeatMonthly !== undefined && (
            <> · +{formatPrice(tier.extraSeatMonthly)}/mo per extra seat</>
          )}
        </p>
      </div>

      <ul className="space-y-2 mb-6 flex-1">
        {tier.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <span className="text-foreground">{f}</span>
          </li>
        ))}
      </ul>

      <Link to="/signup" className="mt-auto">
        <Button
          className="w-full gap-2"
          variant={isHighlighted ? "default" : "outline"}
        >
          Start Free Trial
          <ArrowRight className="h-4 w-4" />
        </Button>
      </Link>
    </div>
  );
}
