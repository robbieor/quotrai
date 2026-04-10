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
  TrendingUp,
  Minus,
  Plus,
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

export function PricingPreviewSection({ formatPrice }: PricingPreviewSectionProps) {
  const [seats, setSeats] = useState(1);
  const [monthlyInvoice, setMonthlyInvoice] = useState(5000);

  const totalCost = BASE_PRICE + Math.max(0, seats - 1) * EXTRA_SEAT;
  const platformEarnings = monthlyInvoice * PLATFORM_FEE;
  const netCost = Math.max(0, totalCost - platformEarnings);
  const coveragePercent = Math.min((platformEarnings / totalCost) * 100, 100);
  const isFullyCovered = platformEarnings >= totalCost;
  const surplus = platformEarnings - totalCost;
  const breakeven = Math.ceil(totalCost / PLATFORM_FEE);

  return (
    <section id="pricing" className="py-16 sm:py-24 px-4 sm:px-6 bg-muted/30 border-y border-border">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4">
            <TrendingUp className="h-3.5 w-3.5" />
            Software that pays for itself
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-foreground mb-3">
            One plan. Every feature.{" "}
            <span className="bg-gradient-to-r from-primary to-teal-400 bg-clip-text text-transparent">
              Zero excuses.
            </span>
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto text-base">
            Process payments through Foreman and earn back your subscription through our 2.9% platform fee. Most teams cover their cost within the first month.
          </p>
        </div>

        <div className="grid md:grid-cols-5 gap-6 max-w-3xl mx-auto mb-12">
          {/* Plan Card — spans 3 cols */}
          <div className="md:col-span-3 relative p-6 sm:p-8 rounded-2xl bg-card border-2 border-primary shadow-[0_0_30px_-5px_hsl(159,100%,45%,0.15)]">
            <div className="absolute -top-3 left-6">
              <span className="px-3 py-1 text-xs font-bold bg-primary text-primary-foreground rounded-full">
                Everything included
              </span>
            </div>

            <div className="mb-6 pt-2">
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-extrabold text-foreground">{formatPrice(BASE_PRICE)}</span>
                <span className="text-sm text-muted-foreground">/month</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                1 user included · +{formatPrice(EXTRA_SEAT)}/mo per extra seat
              </p>
            </div>

            <ul className="space-y-2 mb-6">
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

          {/* Team Size Calculator — spans 2 cols */}
          <div className="md:col-span-2 flex flex-col gap-4">
            {/* Seat picker */}
            <div className="p-5 rounded-2xl bg-card border border-border flex-1">
              <div className="flex items-center gap-2 mb-4">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Team size</span>
              </div>

              <div className="flex items-center justify-center gap-4 mb-4">
                <button
                  onClick={() => setSeats(Math.max(1, seats - 1))}
                  className="h-9 w-9 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors"
                  aria-label="Remove seat"
                >
                  <Minus className="h-4 w-4 text-muted-foreground" />
                </button>
                <div className="text-center">
                  <span className="text-3xl font-bold text-foreground">{seats}</span>
                  <p className="text-xs text-muted-foreground">{seats === 1 ? "user" : "users"}</p>
                </div>
                <button
                  onClick={() => setSeats(Math.min(25, seats + 1))}
                  className="h-9 w-9 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors"
                  aria-label="Add seat"
                >
                  <Plus className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>

              <div className="text-center p-3 rounded-xl bg-muted/50 border border-border">
                <p className="text-2xl font-bold text-foreground">{formatPrice(totalCost)}</p>
                <p className="text-xs text-muted-foreground">/month total</p>
                {seats > 1 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatPrice(BASE_PRICE)} base + {seats - 1} × {formatPrice(EXTRA_SEAT)}
                  </p>
                )}
              </div>
            </div>

            {/* Earn-back mini card */}
            <div className="p-5 rounded-2xl bg-card border border-border flex-1">
              <div className="flex items-center gap-2 mb-3">
                <Calculator className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Earn it back</span>
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
                <span>Fee earned: <span className="font-semibold text-primary">{formatPrice(platformEarnings)}</span></span>
                <span>Cost: {formatPrice(totalCost)}</span>
              </div>

              {isFullyCovered ? (
                <p className="text-xs font-semibold text-green-600 dark:text-green-400">
                  ✓ Subscription covered! You earn {formatPrice(surplus)} extra/mo
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Net cost: <span className="font-semibold text-foreground">{formatPrice(netCost)}/mo</span>
                  {" · "}Invoice {formatPrice(breakeven, 0)} to fully cover it
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Quick team examples */}
        <div className="max-w-3xl mx-auto">
          <p className="text-center text-xs text-muted-foreground mb-3">Quick examples</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Solo", s: 1 },
              { label: "Small team", s: 3 },
              { label: "Growing", s: 5 },
              { label: "Established", s: 10 },
            ].map((t) => {
              const cost = BASE_PRICE + Math.max(0, t.s - 1) * EXTRA_SEAT;
              return (
                <button
                  key={t.label}
                  onClick={() => setSeats(t.s)}
                  className={`text-center p-3 rounded-xl border transition-colors cursor-pointer ${
                    seats === t.s
                      ? "bg-primary/10 border-primary/40"
                      : "bg-muted/50 border-border hover:border-primary/30"
                  }`}
                >
                  <p className="text-xs text-muted-foreground mb-0.5">{t.label} ({t.s})</p>
                  <p className="text-lg font-bold text-foreground">{formatPrice(cost)}</p>
                  <p className="text-xs text-muted-foreground">/month</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
