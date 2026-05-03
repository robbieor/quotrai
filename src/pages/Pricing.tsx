import { useState } from "react";
import { SEOHead } from "@/components/shared/SEOHead";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import {
  CheckCircle2,
  ArrowRight,
  Zap,
  ExternalLink,
  Calculator,
} from "lucide-react";
import foremanLogo from "@/assets/foreman-logo.png";
import { useIsNative, openExternalUrl } from "@/hooks/useIsNative";
import { ALL_TIERS, PRICING, type TierDetails } from "@/hooks/useSubscriptionTier";

const PLATFORM_FEE = PRICING.PLATFORM_FEE / 100;

const faqs = [
  {
    q: "What's included in the 14-day free trial?",
    a: "Full Crew plan access — every feature, including Revamo AI text & voice. No credit card required. You only pay if you decide to continue after 14 days.",
  },
  {
    q: "How does the platform fee work?",
    a: "Revamo charges 2.9% on payments collected through Stripe Connect — built right into your invoices. No payment, no fee — we only earn when you earn.",
  },
  {
    q: "What's the difference between the plans?",
    a: "Solo gets you the core ops tools for one person. Crew adds Revamo AI (text + voice) — most teams pick this. Business gives you 3 included seats, unlimited AI voice, advanced reporting & exports, priority support, and a faster AI processing lane.",
  },
  {
    q: "Can I add more team members?",
    a: "Yes — Crew and Business support extra seats at €19/mo each. Solo is single-user only; upgrade to Crew when you take someone on.",
  },
  {
    q: "Can I switch tiers or cancel anytime?",
    a: "Yes — change plan or cancel with one click. No contracts, no termination fees. You keep access until the end of your billing period.",
  },
  {
    q: "Do you integrate with my accounting software?",
    a: "Crew and Business sync with Xero and QuickBooks. Invoices, payments and contacts flow automatically — no double entry.",
  },
];

export default function Pricing() {
  const isNative = useIsNative();
  const [billing, setBilling] = useState<"month" | "year">("year"); // annual default
  const [monthlyInvoice, setMonthlyInvoice] = useState(5000);

  if (isNative) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center space-y-6">
          <img src={foremanLogo} alt="Revamo" className="h-16 w-16 rounded-2xl mx-auto" />
          <h1 className="text-2xl font-bold">Manage Your Subscription</h1>
          <p className="text-muted-foreground">
            Subscriptions are managed through the Revamo website. Tap below to view plans and billing.
          </p>
          <Button
            size="lg"
            className="w-full gap-2"
            onClick={() => openExternalUrl("https://foreman.ie/settings")}
          >
            Open foreman.ie
            <ExternalLink className="h-4 w-4" />
          </Button>
          <Link to="/dashboard">
            <Button variant="ghost" size="sm" className="mt-2">Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  const isAnnual = billing === "year";
  const crew = ALL_TIERS.find((t) => t.id === "crew")!;
  const crewMonthlyEquiv = isAnnual ? crew.annual / 12 : crew.monthly;
  const platformEarnings = monthlyInvoice * PLATFORM_FEE;
  const breakeven = Math.ceil(crewMonthlyEquiv / PLATFORM_FEE);
  const coveragePercent = Math.min((platformEarnings / crewMonthlyEquiv) * 100, 100);

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Pricing — Solo €29 · Crew €49 · Business €89 | Revamo"
        description="Three simple plans for trade businesses. Crew (€49/mo) includes Revamo AI text & voice. Business (€89/mo) gets unlimited AI voice, 3 seats, advanced reports & priority support. 14-day free trial."
        path="/pricing"
      />

      {/* Nav */}
      <nav className="border-b border-border bg-background/80 backdrop-blur-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={foremanLogo} alt="Revamo" className="h-8 w-8 rounded-lg" />
            <span className="text-lg font-bold tracking-tight font-manrope lowercase">revamo</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link to="/login">
              <Button variant="ghost" size="sm">Login</Button>
            </Link>
            <Link to="/signup">
              <Button size="sm" className="gap-1">
                Start Free Trial
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-16 sm:pt-20 pb-6 sm:pb-8 px-4 sm:px-6 text-center">
        <div className="container mx-auto max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/15 border border-primary/30 mb-6">
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Three plans. No seat caps. AI included on Crew.</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-4">
            Pick the plan that runs your business.
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
            Save 15% on annual. 14-day free trial · No credit card · Cancel anytime.
          </p>
        </div>
      </section>

      {/* Billing toggle */}
      <section className="px-4 sm:px-6 mb-8">
        <div className="flex items-center justify-center gap-2">
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
      </section>

      {/* 3 Tier Cards */}
      <section className="pb-12 px-4 sm:px-6">
        <div className="container mx-auto max-w-5xl">
          <div className="grid md:grid-cols-3 gap-5">
            {ALL_TIERS.map((tier) => (
              <PricingTierCard key={tier.id} tier={tier} isAnnual={isAnnual} />
            ))}
          </div>
        </div>
      </section>

      {/* Earn-Back Calculator */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 bg-muted/30 border-t border-b border-border">
        <div className="container mx-auto max-w-lg">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Calculator className="h-5 w-5 text-primary" />
            <h2 className="text-xl sm:text-2xl font-extrabold">The Crew plan pays for itself</h2>
          </div>

          <p className="text-sm text-muted-foreground text-center mb-6">
            How much does your business invoice per month?
          </p>

          <div className="space-y-4">
            <div className="text-center">
              <span className="text-3xl font-bold">€{monthlyInvoice.toLocaleString()}</span>
              <span className="text-muted-foreground">/month</span>
            </div>

            <Slider
              value={[monthlyInvoice]}
              onValueChange={(v) => setMonthlyInvoice(v[0])}
              min={0}
              max={50000}
              step={500}
              className="w-full"
            />

            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Platform fee earned (2.9%)</span>
                <span className="font-semibold">€{platformEarnings.toFixed(0)}/mo</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Crew subscription</span>
                <span className="font-semibold">€{crewMonthlyEquiv.toFixed(0)}/mo</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2.5">
                <div
                  className="bg-primary h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${coveragePercent}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                {coveragePercent >= 100
                  ? "✅ Your subscription is fully covered by platform fee earnings alone."
                  : `Process just €${breakeven.toLocaleString()} in invoices and your subscription pays for itself.`}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Fee Comparison */}
      <section className="py-12 sm:py-16 px-4 sm:px-6">
        <div className="container mx-auto max-w-3xl">
          <h2 className="text-xl sm:text-2xl font-extrabold text-center mb-2">
            How do payment fees compare?
          </h2>
          <p className="text-sm text-muted-foreground text-center mb-6">
            Total cost when your customer pays a €1,000 invoice online.
          </p>
          <div className="rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Provider</TableHead>
                  <TableHead className="font-semibold">Processing</TableHead>
                  <TableHead className="font-semibold">Platform</TableHead>
                  <TableHead className="font-semibold">Total</TableHead>
                  <TableHead className="font-semibold hidden sm:table-cell">Includes Software</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="bg-primary/5 border-l-2 border-l-primary font-medium">
                  <TableCell className="font-bold font-manrope lowercase">revamo</TableCell>
                  <TableCell>~1.7%</TableCell>
                  <TableCell>1.2%</TableCell>
                  <TableCell className="font-bold text-primary">~2.9%</TableCell>
                  <TableCell className="hidden sm:table-cell">✅ Full platform + AI</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Jobber</TableCell>
                  <TableCell>2.5% + 25¢</TableCell>
                  <TableCell>—</TableCell>
                  <TableCell>~3.1%</TableCell>
                  <TableCell className="hidden sm:table-cell">Paid separately ($49–$249/mo)</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Square</TableCell>
                  <TableCell>2.6% + 10¢</TableCell>
                  <TableCell>—</TableCell>
                  <TableCell>~2.7%</TableCell>
                  <TableCell className="hidden sm:table-cell">Basic POS only</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Bank Transfer</TableCell>
                  <TableCell>Free</TableCell>
                  <TableCell>—</TableCell>
                  <TableCell>0%</TableCell>
                  <TableCell className="hidden sm:table-cell">❌ No tracking or automation</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-3">
            Revamo is the only option where your payment fees include full job management, invoicing, and AI — no separate software subscription needed to break even.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 sm:py-24 px-4 sm:px-6">
        <div className="container mx-auto max-w-3xl">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-center mb-10">
            Frequently Asked Questions
          </h2>
          <div className="space-y-1">
            {faqs.map((faq, i) => (
              <div key={i} className="py-5">
                <p className="font-semibold text-foreground mb-2">{faq.q}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                {i < faqs.length - 1 && <Separator className="mt-5" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 text-center bg-muted/30 border-t border-border">
        <div className="container mx-auto max-w-2xl">
          <h2 className="text-2xl sm:text-4xl font-extrabold mb-4">
            Ready to ditch the paperwork?
          </h2>
          <p className="text-muted-foreground text-lg mb-8">
            Join trade professionals who run their entire business from Revamo.
          </p>
          <Link to="/signup">
            <Button size="lg" className="text-lg px-10 py-7 font-semibold gap-2">
              Start Free Trial
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
          <p className="text-xs text-muted-foreground mt-4">
            14-day free trial · No credit card required · Cancel anytime
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4 sm:px-6">
        <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <img src={foremanLogo} alt="Revamo" className="h-6 w-6 rounded" />
            <span>© {new Date().getFullYear()} Revamo Ltd</span>
          </div>
          <div className="flex gap-4">
            <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function PricingTierCard({ tier, isAnnual }: { tier: TierDetails; isAnnual: boolean }) {
  const displayPrice = isAnnual ? tier.annual / 12 : tier.monthly;
  const isHighlighted = tier.highlighted;

  return (
    <div
      className={`relative p-6 sm:p-7 rounded-2xl bg-card flex flex-col ${
        isHighlighted
          ? "border-2 border-primary shadow-[0_0_40px_-8px_hsl(159,100%,45%,0.25)]"
          : tier.id === 'business'
          ? "border-2 border-amber-500/40 shadow-[0_0_40px_-12px_hsl(38,92%,50%,0.25)]"
          : "border border-border"
      }`}
    >
      {tier.badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span
            className={`px-3 py-1 text-xs font-bold rounded-full whitespace-nowrap ${
              tier.id === 'business'
                ? 'bg-amber-500 text-white shadow-[0_4px_14px_-2px_hsl(38,92%,50%,0.4)]'
                : 'bg-primary text-primary-foreground'
            }`}
          >
            {tier.badge}
          </span>
        </div>
      )}

      <div className="mb-4 pt-1">
        <h3 className="text-xl font-bold text-foreground">{tier.name}</h3>
        <p className="text-xs text-muted-foreground mt-1">{tier.tagline}</p>
      </div>

      <div className="mb-5">
        <div className="flex items-baseline gap-1">
          <span className="text-5xl font-extrabold text-foreground">
            €{Math.round(displayPrice)}
          </span>
          <span className="text-sm text-muted-foreground">
            /mo{isAnnual ? ", billed annually" : ""}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">
          {tier.includedSeats} {tier.includedSeats === 1 ? "user" : "users"} included
          {tier.extraSeatMonthly !== undefined ? (
            <> · +€{tier.extraSeatMonthly}/mo per extra seat</>
          ) : (
            <> · single-user only</>
          )}
        </p>
      </div>

      <ul className="space-y-2.5 mb-6 flex-1">
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
          size="lg"
          variant={isHighlighted ? "default" : "outline"}
        >
          Start Free Trial
          <ArrowRight className="h-4 w-4" />
        </Button>
      </Link>
      <p className="text-[11px] text-center text-muted-foreground mt-2">
        14-day trial · No card required
      </p>
    </div>
  );
}
