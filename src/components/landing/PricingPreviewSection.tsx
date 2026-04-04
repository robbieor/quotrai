import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ArrowRight, X, Users, Mic, Building2 } from "lucide-react";
import { PRICING } from "@/hooks/useSubscriptionTier";

interface PricingPreviewSectionProps {
  formatPrice: (eur: number, decimals?: number) => string;
}

const tiers = [
  {
    name: "Lite",
    tagline: "Run your business",
    icon: Users,
    bullets: [
      "Unlimited quotes & invoices",
      "Job scheduling & calendar",
      "Customer management",
      "GPS time tracking",
      "PDF generation & email",
      "Team collaboration",
    ],
    popular: false,
    cta: "Start Free Trial",
  },
  {
    name: "Connect",
    tagline: "Automate your business",
    icon: Mic,
    bullets: [
      "Everything in Lite",
      "Foreman AI text & voice assistant",
      `${PRICING.VOICE_MINUTES_PER_SEAT} voice minutes/month`,
      "Expense tracking & documents",
      "Business reports & dashboards",
      "Recurring invoices",
    ],
    popular: true,
    cta: "Start Free Trial",
  },
  {
    name: "Grow",
    tagline: "Scale your business",
    icon: Building2,
    bullets: [
      "Everything in Connect",
      "Unlimited voice minutes",
      `Reduced ${PRICING.GROW_PLATFORM_FEE}% platform fee`,
      "Xero & QuickBooks sync",
      "Advanced reporting & leads",
      "Priority support & API access",
    ],
    popular: false,
    cta: "Start Free Trial",
  },
];

const monthlyPrices = [PRICING.LITE_SEAT, PRICING.CONNECT_SEAT, PRICING.GROW_SEAT];
const annualPrices = [PRICING.ANNUAL_LITE_SEAT, PRICING.ANNUAL_CONNECT_SEAT, PRICING.ANNUAL_GROW_SEAT];

const comparisonRows: { feature: string; lite: string; connect: string; grow: string }[] = [
  { feature: "Quotes & Invoices", lite: "✓", connect: "✓", grow: "✓" },
  { feature: "Job Scheduling", lite: "✓", connect: "✓", grow: "✓" },
  { feature: "GPS Time Tracking", lite: "✓", connect: "✓", grow: "✓" },
  { feature: "Customer Management", lite: "✓", connect: "✓", grow: "✓" },
  { feature: "AI Assistant (Text)", lite: "—", connect: "✓", grow: "✓" },
  { feature: "AI Voice Minutes", lite: "—", connect: `${PRICING.VOICE_MINUTES_PER_SEAT}/mo`, grow: "Unlimited" },
  { feature: "Expense Tracking", lite: "—", connect: "✓", grow: "✓" },
  { feature: "Reports & Dashboards", lite: "—", connect: "✓", grow: "Advanced" },
  { feature: "Recurring Invoices", lite: "—", connect: "✓", grow: "✓" },
  { feature: "Xero / QuickBooks Sync", lite: "—", connect: "—", grow: "✓" },
  { feature: "Lead Management", lite: "—", connect: "—", grow: "✓" },
  { feature: "API & Webhooks", lite: "—", connect: "—", grow: "✓" },
  { feature: "Platform Fee", lite: `${PRICING.PLATFORM_FEE}%`, connect: `${PRICING.PLATFORM_FEE}%`, grow: `${PRICING.GROW_PLATFORM_FEE}%` },
];

export function PricingPreviewSection({ formatPrice }: PricingPreviewSectionProps) {
  const [interval, setInterval] = useState<"monthly" | "annual">("monthly");

  return (
    <section id="pricing" className="py-16 sm:py-24 px-4 sm:px-6 bg-muted/30 border-y border-border">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center mb-10 sm:mb-14">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-foreground mb-4">
            Plans that grow{" "}
            <span className="bg-gradient-to-r from-primary to-teal-400 bg-clip-text text-transparent">
              with your business.
            </span>
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Start at {formatPrice(PRICING.LITE_SEAT)}/seat. Add AI when you're ready. 14-day free trial on all plans.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center bg-muted rounded-full p-1 gap-1">
            <button
              onClick={() => setInterval("monthly")}
              className={`min-h-[44px] px-5 sm:px-6 rounded-full text-sm font-semibold transition-all ${
                interval === "monthly" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setInterval("annual")}
              className={`min-h-[44px] px-5 sm:px-6 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${
                interval === "annual" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Annual
              <span className="bg-green-600 text-white text-[12px] font-bold px-2 py-0.5 rounded-full">-15%</span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid sm:grid-cols-3 gap-6 mb-8">
          {tiers.map((tier, i) => {
            const monthly = monthlyPrices[i];
            const annual = annualPrices[i];
            const annualMonthly = Math.round(annual / 12);
            const price = interval === "monthly" ? monthly : annualMonthly;
            const yearlySavings = monthly * 12 - annual;

            return (
              <div
                key={tier.name}
                className={`relative p-6 rounded-2xl bg-card flex flex-col ${
                  tier.popular
                    ? "border-2 border-primary shadow-[0_0_30px_-5px_hsl(159,100%,45%,0.2)]"
                    : "border border-border"
                }`}
              >
                {tier.popular && (
                  <Badge className="absolute -top-3 left-6 bg-primary text-primary-foreground px-3 py-1 text-xs font-semibold">
                    Most Popular
                  </Badge>
                )}
                <div className="flex items-center gap-3 mb-1">
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${tier.popular ? "bg-primary/10" : "bg-muted"}`}>
                    <tier.icon className={`h-4 w-4 ${tier.popular ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <h3 className="text-lg font-bold text-foreground">{tier.name}</h3>
                </div>
                <p className="text-sm font-semibold text-primary mb-3">{tier.tagline}</p>
                <div className="mb-4">
                  <span className={`text-3xl font-extrabold ${tier.popular ? "text-primary" : "text-foreground"}`}>
                    {formatPrice(price)}
                  </span>
                  <span className="text-sm text-muted-foreground">/seat/mo</span>
                  {interval === "annual" && yearlySavings > 0 && (
                    <p className="text-xs font-medium text-green-600 mt-1">
                      Save {formatPrice(yearlySavings)}/seat/yr
                    </p>
                  )}
                </div>
                <ul className="space-y-2 flex-1 mb-5">
                  {tier.bullets.map((b) => (
                    <li key={b} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="text-foreground">{b}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/signup">
                  <Button
                    className="w-full gap-2"
                    variant={tier.popular ? "default" : "outline"}
                  >
                    {tier.cta}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            );
          })}
        </div>

        {/* Bulk discount callout */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-green-600/10 border border-green-600/20 rounded-full px-5 py-2.5">
            <Users className="h-4 w-4 text-green-600" />
            <span className="text-sm font-semibold text-green-600">
              Teams of {PRICING.BULK_DISCOUNT_THRESHOLD}+ save an extra {PRICING.BULK_DISCOUNT * 100}% on every seat
            </span>
          </div>
        </div>

        {/* Feature Comparison Table */}
        <div className="mb-8">
          <h3 className="text-lg font-bold text-foreground text-center mb-6">Compare all features</h3>
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full text-sm min-w-[500px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 pr-4 font-medium text-muted-foreground sticky left-0 bg-muted/30 z-10 min-w-[160px]">Feature</th>
                  <th className="text-center py-3 px-3 font-semibold text-foreground">Lite</th>
                  <th className="text-center py-3 px-3 font-semibold text-primary">Connect</th>
                  <th className="text-center py-3 px-3 font-semibold text-foreground">Grow</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row) => (
                  <tr key={row.feature} className="border-b border-border/50">
                    <td className="py-2.5 pr-4 text-foreground sticky left-0 bg-muted/30 z-10">{row.feature}</td>
                    <td className="py-2.5 px-3 text-center">
                      <CellValue value={row.lite} />
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <CellValue value={row.connect} />
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <CellValue value={row.grow} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Full pricing link */}
        <div className="text-center">
          <Link to="/pricing">
            <Button variant="outline" size="lg" className="gap-2 font-semibold">
              View full pricing & FAQ
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

function CellValue({ value }: { value: string }) {
  if (value === "✓") {
    return <CheckCircle2 className="h-4 w-4 text-primary inline-block" />;
  }
  if (value === "—") {
    return <X className="h-4 w-4 text-muted-foreground/40 inline-block" />;
  }
  return <span className="text-xs font-medium text-foreground">{value}</span>;
}
