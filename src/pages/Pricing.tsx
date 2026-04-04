import { useState } from "react";
import { SEOHead } from "@/components/shared/SEOHead";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import {
  Check,
  ArrowRight,
  Zap,
  ExternalLink,
  Calculator,
} from "lucide-react";
import foremanLogo from "@/assets/foreman-logo.png";
import { useIsNative, openExternalUrl } from "@/hooks/useIsNative";

const BASE_PRICE = 39;
const EXTRA_SEAT = 19;
const BASE_USERS = 3;
const PLATFORM_FEE = 0.015;

const allFeatures = [
  "Unlimited quotes & invoices",
  "Job scheduling & calendar",
  "Customer management & GPS tracking",
  "Foreman AI — text & voice assistant",
  "Expense tracking & receipt capture",
  "Reports, dashboards & recurring invoices",
  "Xero & QuickBooks sync",
  "PDF generation, branded emails & team collaboration",
  "Lead pipeline & advanced reporting",
  "API access & webhooks",
];

const teamExamples = [
  { label: "Solo", users: 1, price: BASE_PRICE },
  { label: "Team of 3", users: 3, price: BASE_PRICE },
  { label: "Team of 5", users: 5, price: BASE_PRICE + 2 * EXTRA_SEAT },
  { label: "Team of 10", users: 10, price: BASE_PRICE + 7 * EXTRA_SEAT },
];

const faqs = [
  {
    q: "What's included in the 14-day free trial?",
    a: "Full access to every feature — quotes, invoicing, AI, GPS time tracking. No credit card required. You only pay if you decide to continue after 14 days.",
  },
  {
    q: "How does the platform fee work?",
    a: "Foreman charges 1.5% on payments collected through Stripe Connect. No payment, no fee — we only earn when you earn.",
  },
  {
    q: "How does pricing work for larger teams?",
    a: "€39/month includes up to 3 users. Each additional team member is just €19/month. Everyone gets full access to every feature.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes — cancel with one click. You keep access until the end of your current billing period, no questions asked.",
  },
  {
    q: "Do you integrate with my accounting software?",
    a: "We sync with Xero and QuickBooks. Invoices, payments, and contacts flow automatically — no double entry.",
  },
];

export default function Pricing() {
  const isNative = useIsNative();
  const [monthlyInvoice, setMonthlyInvoice] = useState(5000);

  if (isNative) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center space-y-6">
          <img src={foremanLogo} alt="Foreman" className="h-16 w-16 rounded-2xl mx-auto" />
          <h1 className="text-2xl font-bold">Manage Your Subscription</h1>
          <p className="text-muted-foreground">
            Subscriptions are managed through the Foreman website. Tap below to view plans and billing.
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

  const platformEarnings = monthlyInvoice * PLATFORM_FEE;
  const breakeven = Math.ceil(BASE_PRICE / PLATFORM_FEE);
  const coveragePercent = Math.min((platformEarnings / BASE_PRICE) * 100, 100);

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Pricing — One Plan, Every Feature, AI Included"
        description="€39/month for up to 3 users. Every feature included. Foreman AI built in. 14-day free trial, no credit card required."
        path="/pricing"
      />

      {/* Nav */}
      <nav className="border-b border-border bg-background/80 backdrop-blur-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={foremanLogo} alt="Foreman" className="h-8 w-8 rounded-lg" />
            <span className="text-lg font-bold tracking-tight">Foreman</span>
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
      <section className="pt-16 sm:pt-24 pb-8 sm:pb-12 px-4 sm:px-6 text-center">
        <div className="container mx-auto max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/15 border border-primary/30 mb-6">
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">One plan. Every feature. AI included.</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-4">
            €{BASE_PRICE}/month for your whole team.
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
            Up to {BASE_USERS} users included. Just €{EXTRA_SEAT}/mo per extra seat.
            <br className="hidden sm:block" />
            14-day free trial · No credit card required · Cancel anytime.
          </p>
        </div>
      </section>

      {/* Single Plan Card */}
      <section className="pb-8 px-4 sm:px-6">
        <div className="container mx-auto max-w-lg">
          <div className="rounded-2xl border border-primary bg-gradient-to-b from-primary/5 to-transparent shadow-lg p-6 sm:p-8">
            <div className="text-center mb-6">
              <div className="flex items-baseline justify-center gap-1 mb-1">
                <span className="text-5xl font-extrabold">€{BASE_PRICE}</span>
                <span className="text-muted-foreground text-lg">/month</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Includes {BASE_USERS} team members · +€{EXTRA_SEAT}/mo per extra seat
              </p>
            </div>

            <ul className="space-y-3 mb-8">
              {allFeatures.map((feature, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm">
                  <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <Link to="/signup">
              <Button className="w-full" size="lg">
                Start Free Trial
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
            <p className="text-xs text-center text-muted-foreground mt-3">
              14-day free trial · No credit card required · Cancel anytime
            </p>
          </div>
        </div>
      </section>

      {/* Team Size Examples */}
      <section className="pb-8 px-4 sm:px-6">
        <div className="container mx-auto max-w-lg">
          <div className="grid grid-cols-4 gap-2 text-center">
            {teamExamples.map((ex) => (
              <div key={ex.label} className="rounded-xl border border-border bg-card p-3">
                <p className="text-xs text-muted-foreground mb-1">{ex.label}</p>
                <p className="text-lg font-bold">€{ex.price}</p>
                <p className="text-[10px] text-muted-foreground">/month</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Earn-Back Calculator */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 bg-muted/30 border-t border-b border-border">
        <div className="container mx-auto max-w-lg">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Calculator className="h-5 w-5 text-primary" />
            <h2 className="text-xl sm:text-2xl font-extrabold">Foreman pays for itself</h2>
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
                <span className="text-muted-foreground">Platform fee earned (1.5%)</span>
                <span className="font-semibold">€{platformEarnings.toFixed(0)}/mo</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subscription cost</span>
                <span className="font-semibold">€{BASE_PRICE}/mo</span>
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
                  <TableCell className="font-bold">Foreman</TableCell>
                  <TableCell>~1.5%</TableCell>
                  <TableCell>1.5%</TableCell>
                  <TableCell className="font-bold text-primary">~3.0%</TableCell>
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
            Foreman is the only option where your payment fees include full job management, invoicing, and AI — no separate software subscription needed to break even.
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
            Join trade professionals who run their entire business from Foreman.
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
            <img src={foremanLogo} alt="Foreman" className="h-6 w-6 rounded" />
            <span>© {new Date().getFullYear()} Foreman Ltd</span>
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
