import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  ArrowRight,
  Users,
  Sparkles,
  Calculator,
} from "lucide-react";

interface PricingPreviewSectionProps {
  formatPrice: (eur: number, decimals?: number) => string;
}

const BASE_PRICE = 39;
const EXTRA_SEAT = 15;
const PLATFORM_FEE = 0.029;

const features = [
  "Unlimited quotes & invoices",
  "Job scheduling & calendar",
  "Customer management & GPS tracking",
  "Foreman AI — text & voice assistant",
  "Expense tracking & documents",
  "Reports, dashboards & recurring invoices",
  "Xero & QuickBooks sync",
  "PDF generation, email & team collaboration",
];

const teamExamples = [
  { label: "Solo", seats: 1, cost: BASE_PRICE },
  { label: "Team of 3", seats: 3, cost: BASE_PRICE + 2 * EXTRA_SEAT },
  { label: "Team of 5", seats: 5, cost: BASE_PRICE + 4 * EXTRA_SEAT },
  { label: "Team of 10", seats: 10, cost: BASE_PRICE + 9 * EXTRA_SEAT },
];

export function PricingPreviewSection({ formatPrice }: PricingPreviewSectionProps) {
  const [monthlyInvoice, setMonthlyInvoice] = useState(5000);

  const platformEarnings = monthlyInvoice * PLATFORM_FEE;
  const breakeven = Math.ceil(BASE_PRICE / PLATFORM_FEE);
  const coveragePercent = Math.min((platformEarnings / BASE_PRICE) * 100, 100);

  return (
    <section id="pricing" className="py-16 sm:py-24 px-4 sm:px-6 bg-muted/30 border-y border-border">
      <div className="container mx-auto max-w-3xl">
        {/* Header */}
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-foreground mb-3">
            One plan. Every feature.{" "}
            <span className="bg-gradient-to-r from-primary to-teal-400 bg-clip-text text-transparent">
              AI included.
            </span>
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto text-base">
            {formatPrice(BASE_PRICE)}/month for 1 user. Just {formatPrice(EXTRA_SEAT)}/mo per extra seat.
          </p>
        </div>

        {/* Single Plan Card */}
        <div className="relative p-6 sm:p-8 rounded-2xl bg-card border-2 border-primary shadow-[0_0_30px_-5px_hsl(159,100%,45%,0.2)] max-w-lg mx-auto mb-12">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="text-sm font-semibold text-primary">Everything included</span>
          </div>

          <div className="mb-5">
            <span className="text-4xl font-extrabold text-primary">{formatPrice(BASE_PRICE)}</span>
            <span className="text-sm text-muted-foreground">/month</span>
            <p className="text-sm text-muted-foreground mt-1">
              1 user included · +{formatPrice(EXTRA_SEAT)}/mo per extra seat
            </p>
          </div>

          <ul className="space-y-2.5 mb-6">
            {features.map((f) => (
              <li key={f} className="flex items-center gap-2.5 text-sm">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                <span className="text-foreground">{f}</span>
              </li>
            ))}
          </ul>

          <p className="text-xs text-muted-foreground text-center mb-4">
            14-day free trial · No credit card required · Cancel anytime
          </p>

          <Link to="/signup">
            <Button className="w-full gap-2" size="lg">
              Start Free Trial
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        {/* Earn-Back Calculator */}
        <div className="max-w-lg mx-auto p-6 rounded-2xl bg-card border border-border mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Calculator className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-bold text-foreground">Foreman pays for itself</h3>
          </div>

          <label className="text-sm font-medium text-foreground block mb-3">
            How much do you invoice per month?
          </label>
          <div className="flex items-center gap-4 mb-2">
            <Slider
              value={[monthlyInvoice]}
              onValueChange={([v]) => setMonthlyInvoice(v)}
              min={500}
              max={50000}
              step={500}
              className="flex-1"
            />
            <span className="text-lg font-bold text-foreground min-w-[80px] text-right">
              {formatPrice(monthlyInvoice, 0)}
            </span>
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Platform fee earned</span>
                <span className="font-semibold text-primary">{formatPrice(platformEarnings)}/mo</span>
              </div>
              <Progress value={coveragePercent} className="h-2.5" />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>{formatPrice(0)}</span>
                <span>Subscription: {formatPrice(BASE_PRICE)}/mo</span>
              </div>
            </div>

            <p className="text-sm text-foreground">
              {platformEarnings >= BASE_PRICE ? (
                <>
                  <span className="font-semibold text-primary">Your subscription is fully covered.</span>{" "}
                  You earn {formatPrice(platformEarnings - BASE_PRICE)}/mo extra.
                </>
              ) : (
                <>
                  Process just <span className="font-semibold">{formatPrice(breakeven)}</span> in invoices
                  and your subscription pays for itself.
                </>
              )}
            </p>
          </div>
        </div>

        {/* Team Size Examples */}
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-2 justify-center mb-4">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Simple team pricing</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {teamExamples.map((t) => (
              <div key={t.label} className="text-center p-3 rounded-xl bg-muted/50 border border-border">
                <p className="text-xs text-muted-foreground mb-1">{t.label}</p>
                <p className="text-lg font-bold text-foreground">{formatPrice(t.cost)}</p>
                <p className="text-xs text-muted-foreground">/month</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
