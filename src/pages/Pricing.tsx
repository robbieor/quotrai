import { useState } from "react";
import { SEOHead } from "@/components/shared/SEOHead";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Check,
  ArrowRight,
  Users,
  Mic,
  Building2,
  Zap,
  ExternalLink,
} from "lucide-react";
import foremanLogo from "@/assets/foreman-logo.png";
import { cn } from "@/lib/utils";
import { useIsNative, openExternalUrl } from "@/hooks/useIsNative";

const faqs = [
  {
    q: "What's included in the 30-day free trial?",
    a: "Full access to every feature — quotes, invoicing, AI, GPS time tracking — no credit card required. You only pay if you decide to continue after 30 days.",
  },
  {
    q: "What's the difference between seat types?",
    a: "Lite seats are for field crew who need job access, time tracking, and basic quoting. Connect seats add Foreman AI with 60 voice minutes/month. Grow seats include 200 minutes, advanced reporting, and accounting sync.",
  },
  {
    q: "Can I mix seat types on one team?",
    a: "Absolutely. Give your office manager a Voice Seat and your apprentices Team Seats — you only pay for what each person needs.",
  },
  {
    q: "How does annual billing work?",
    a: "Pay upfront for 12 months and save 15%. You can switch between monthly and annual at any time from your billing settings.",
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
  const [interval, setInterval] = useState<"monthly" | "annual">("monthly");

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

  const price = (monthly: number, annual: number) =>
    interval === "monthly" ? monthly : Math.round(annual / 12);

  const plans = [
    {
      name: "Lite",
      tagline: "Run your business",
      icon: Users,
      description: "Everything you need to quote, schedule, and invoice — without the clutter.",
      features: [
        "Create and send quotes in seconds",
        "Schedule jobs with drag-and-drop",
        "Invoice customers and track payments",
        "GPS-verified time tracking",
        "Full customer management",
      ],
      monthlyPrice: 19,
      annualPrice: Math.round(19 * 12 * 0.85),
      cta: "Start Free Trial",
      popular: false,
    },
    {
      name: "Connect",
      tagline: "Automate your business",
      icon: Mic,
      description: "Let Foreman AI handle the admin — so you stay on the tools, not the laptop.",
      features: [
        "Everything in Lite",
        "Foreman AI — create quotes and invoices by voice or text",
        "60 voice minutes/month",
        "Automated payment reminders",
        "Snap receipts and track expenses",
        "Send branded PDFs instantly",
      ],
      monthlyPrice: 39,
      annualPrice: Math.round(39 * 12 * 0.85),
      cta: "Start Free Trial",
      popular: true,
    },
    {
      name: "Grow",
      tagline: "Scale your business",
      icon: Building2,
      description: "Full visibility, accounting sync, and the data you need to grow profitably.",
      features: [
        "Everything in Connect",
        "200 voice minutes/month",
        "Revenue, P&L, and job profitability reports",
        "Xero & QuickBooks auto-sync",
        "Lead pipeline to close more work",
        "Priority support & onboarding",
        "API access & webhooks",
      ],
      monthlyPrice: 69,
      annualPrice: Math.round(69 * 12 * 0.85),
      cta: "Start Free Trial",
      popular: false,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Pricing — Simple Per-Seat Plans"
        description="Transparent pricing for field service businesses. Lite, Connect, and Grow seats from €19/mo. 30-day free trial, no credit card required."
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
            <span className="text-sm font-semibold text-foreground">Simple, transparent pricing</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-4">
            One platform, one price per seat.
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            30-day free trial on every plan. No credit card required. Cancel anytime.
          </p>

          {/* Billing toggle */}
          <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-muted border border-border">
            <button
              onClick={() => setInterval("monthly")}
              className={cn(
                "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                interval === "monthly"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Monthly
            </button>
            <button
              onClick={() => setInterval("annual")}
              className={cn(
                "px-4 py-2 rounded-md text-sm font-medium transition-colors relative",
                interval === "annual"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Annual
              <Badge className="absolute -top-2.5 -right-5 bg-green-600 text-[10px] px-1.5 py-0">
                -15%
              </Badge>
            </button>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-16 sm:pb-24 px-4 sm:px-6">
        <div className="container mx-auto max-w-5xl">
          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const displayPrice = price(plan.monthlyPrice, plan.annualPrice);
              return (
                <div
                  key={plan.name}
                  className={cn(
                    "relative rounded-2xl border p-6 sm:p-8 flex flex-col",
                    plan.popular
                      ? "border-primary bg-gradient-to-b from-primary/5 to-transparent shadow-lg scale-[1.02]"
                      : "border-border bg-card"
                  )}
                >
                  {plan.popular && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3">
                      Most Popular
                    </Badge>
                  )}

                  <div className="flex items-center gap-3 mb-2">
                    <div className={cn(
                      "p-2.5 rounded-xl",
                      plan.popular ? "bg-primary/10" : "bg-muted"
                    )}>
                      <plan.icon className={cn("h-5 w-5", plan.popular ? "text-primary" : "text-muted-foreground")} />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{plan.name}</h3>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-primary mb-4">{plan.tagline}</p>

                  <div className="mb-6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold">€{displayPrice}</span>
                      <span className="text-muted-foreground">/seat/mo</span>
                    </div>
                    {interval === "annual" && (
                      <p className="text-xs text-muted-foreground mt-1">
                        €{plan.annualPrice}/seat billed annually
                      </p>
                    )}
                  </div>

                  <p className="text-sm text-muted-foreground mb-6 leading-relaxed">{plan.description}</p>

                  <ul className="space-y-3 mb-8 flex-1">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm">
                        <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Link to="/signup">
                    <Button
                      className="w-full"
                      variant={plan.popular ? "default" : "outline"}
                      size="lg"
                    >
                      {plan.cta}
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 bg-muted/30 border-t border-border">
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
      <section className="py-16 sm:py-20 px-4 sm:px-6 text-center">
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
            30 days free • No credit card • Cancel anytime
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
