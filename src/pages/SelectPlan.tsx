import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ArrowRight, MessageSquare, ExternalLink, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSubscriptionTier, PRICING, LITE_SEAT_DETAILS, CONNECT_SEAT_DETAILS, GROW_SEAT_DETAILS } from "@/hooks/useSubscriptionTier";
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

  const proSavings = PRICING.CONNECT_SEAT * 12 - PRICING.ANNUAL_CONNECT_SEAT;

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
            Start at {formatCurrency(PRICING.LITE_SEAT)}/seat. Add AI when you're ready. We earn {PRICING.PLATFORM_FEE}% only when you get paid.
          </p>
        </div>

        {/* Billing Toggle */}
        <BillingToggle interval={billingInterval} onChange={setBillingInterval} />

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <PlanCard
            details={LITE_SEAT_DETAILS}
            monthlyPrice={PRICING.LITE_SEAT}
            annualPrice={PRICING.ANNUAL_LITE_SEAT}
            billingInterval={billingInterval}
            formatCurrency={formatCurrency}
            subtitle="For solo operators"
            seatCode="lite"
            onChoose={handleChoosePlan}
            isLoading={isCheckingOut}
          />

          <PlanCard
            details={CONNECT_SEAT_DETAILS}
            monthlyPrice={PRICING.CONNECT_SEAT}
            annualPrice={PRICING.ANNUAL_CONNECT_SEAT}
            billingInterval={billingInterval}
            formatCurrency={formatCurrency}
            subtitle="Most popular"
            highlighted
            savings={billingInterval === "annual" ? (PRICING.CONNECT_SEAT * 12 - PRICING.ANNUAL_CONNECT_SEAT) : undefined}
            seatCode="connect"
            onChoose={handleChoosePlan}
            isLoading={isCheckingOut}
          />

          <PlanCard
            details={GROW_SEAT_DETAILS}
            monthlyPrice={PRICING.GROW_SEAT}
            annualPrice={PRICING.ANNUAL_GROW_SEAT}
            billingInterval={billingInterval}
            formatCurrency={formatCurrency}
            subtitle="For growing teams"
            savings={billingInterval === "annual" ? (PRICING.GROW_SEAT * 12 - PRICING.ANNUAL_GROW_SEAT) : undefined}
            seatCode="grow"
            onChoose={handleChoosePlan}
            isLoading={isCheckingOut}
          />
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

        {/* Role × Seat Explainer */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle className="text-lg">How Roles & Seats Work Together</CardTitle>
            <CardDescription>
              Each team member has a <strong>role</strong> (what data they can see) and a <strong>seat type</strong> (which features they can use). Access is the intersection of both.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Desktop: table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Role</th>
                    <th className="text-left py-2 px-4 font-medium text-muted-foreground">Lite Seat</th>
                    <th className="text-left py-2 px-4 font-medium text-muted-foreground">Connect Seat</th>
                    <th className="text-left py-2 px-4 font-medium text-muted-foreground">Grow Seat</th>
                  </tr>
                </thead>
                <tbody className="text-xs">
                  <tr className="border-b">
                    <td className="py-3 pr-4 font-medium">Owner / Manager</td>
                    <td className="py-3 px-4">Jobs, Quotes, Invoices, Scheduling</td>
                    <td className="py-3 px-4">+ AI, Expenses, Reports, Documents</td>
                    <td className="py-3 px-4">+ Leads, Integrations, Advanced Reports</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-4 font-medium">Team Member</td>
                    <td className="py-3 px-4 text-muted-foreground">Jobs, Calendar, Time Tracking</td>
                    <td className="py-3 px-4 text-muted-foreground">Jobs, Calendar, Time Tracking</td>
                    <td className="py-3 px-4 text-muted-foreground">Jobs, Calendar, Time Tracking</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Mobile: stacked cards per role */}
            <div className="md:hidden space-y-3">
              <div className="rounded-lg border border-border p-3 space-y-2">
                <p className="text-sm font-semibold">Owner / Manager</p>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Lite</span>
                    <span>Jobs, Quotes, Invoices, Scheduling</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Connect</span>
                    <span>+ AI, Expenses, Reports</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Grow</span>
                    <span>+ Leads, Integrations</span>
                  </div>
                </div>
              </div>
              <div className="rounded-lg border border-border p-3 space-y-2">
                <p className="text-sm font-semibold">Team Member</p>
                <p className="text-xs text-muted-foreground">
                  Jobs, Calendar & Time Tracking only — same access on all seat types.
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground mt-3">
              💡 Team Members have the same access regardless of seat type — assign Lite seats to save costs.
            </p>
          </CardContent>
        </Card>

        {/* FAQ Section */}
        <div className="space-y-6">
          <h3 className="text-xl font-semibold text-center">Frequently Asked Questions</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <FaqCard
              q="What's the platform fee?"
              a={`Foreman charges ${PRICING.PLATFORM_FEE}% on payments collected through Stripe Connect. No payment, no fee — we only earn when you earn. Grow customers get a reduced ${PRICING.GROW_PLATFORM_FEE}% rate.`}
            />
            <FaqCard
              q="Can I upgrade from Lite to Connect?"
              a="Yes! Upgrade anytime and your team instantly gets Foreman AI voice, GPS time-tracking, and advanced reports. You'll be charged pro-rata for the remainder of your billing period."
            />
            <FaqCard
              q="What's included in the free trial?"
              a={`Full Connect access for 7 days — including ${PRICING.VOICE_MINUTES_PER_SEAT} minutes of Foreman AI voice per seat, GPS tracking, and reports. Card is collected to ensure seamless transition after your 7-day trial. Cancel anytime — you won't be charged until the trial ends.`}
            />
            <FaqCard
              q="Do you offer bulk discounts?"
              a={`Yes — ${PRICING.BULK_DISCOUNT * 100}% off automatically applied for ${PRICING.BULK_DISCOUNT_THRESHOLD}+ seats on any plan.`}
            />
            <FaqCard
              q="What's the difference between roles and seats?"
              a="Roles control data visibility (Owner sees everything, Team Members see jobs/calendar only). Seat types control features (Lite = core tools, Connect = + AI & reports, Grow = + integrations & leads). Team Members only access Jobs, Calendar & Time Tracking regardless of seat — use Lite seats for them."
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
          <span className="bg-green-600 text-white text-[12px] font-bold px-2 py-0.5 rounded-full">-15%</span>
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
  const hasBulkDiscount = quantity >= PRICING.BULK_DISCOUNT_THRESHOLD;
  const discountedUnitPrice = hasBulkDiscount ? Math.round(unitPrice * (1 - PRICING.BULK_DISCOUNT)) : unitPrice;
  const totalMonthly = discountedUnitPrice * quantity;

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
              {hasBulkDiscount && (
                <span className="text-lg text-muted-foreground line-through mr-2">{formatCurrency(monthlyPrice)}</span>
              )}
              <span className="text-4xl font-bold">{formatCurrency(hasBulkDiscount ? discountedUnitPrice : monthlyPrice)}</span>
              <span className="text-muted-foreground">/seat/mo</span>
            </>
          ) : (
            <>
              {hasBulkDiscount && (
                <span className="text-lg text-muted-foreground line-through mr-2">{formatCurrency(annualMonthly)}</span>
              )}
              <span className="text-4xl font-bold">{formatCurrency(hasBulkDiscount ? discountedUnitPrice : annualMonthly)}</span>
              <span className="text-muted-foreground">/seat/mo</span>
              <p className="text-xs text-muted-foreground mt-1">{formatCurrency(annualPrice)}/yr billed annually</p>
              {savings && <p className="text-xs font-medium text-green-600">Save {formatCurrency(savings)}/seat/yr</p>}
            </>
          )}
          {hasBulkDiscount && (
            <Badge className="mt-2 bg-green-600 text-white text-[10px]">
              10% bulk discount applied
            </Badge>
          )}
        </div>

        {/* Seat quantity stepper */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            className="h-10 w-10 sm:h-8 sm:w-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-30"
            disabled={quantity <= 1}
          >
            <Minus className="h-3 w-3" />
          </button>
          <span className="text-lg font-semibold w-8 text-center">{quantity}</span>
          <button
            onClick={() => setQuantity(Math.min(50, quantity + 1))}
            className="h-10 w-10 sm:h-8 sm:w-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-30"
            disabled={quantity >= 50}
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
        <p className="text-xs text-center text-muted-foreground">
          {quantity} {quantity === 1 ? "seat" : "seats"} × {formatCurrency(discountedUnitPrice)}/mo = <span className="font-semibold text-foreground">{formatCurrency(totalMonthly)}/mo</span>
          {hasBulkDiscount && <span className="text-green-600 ml-1">(10% off)</span>}
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
