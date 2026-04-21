import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, ArrowRight, ExternalLink, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrency } from "@/hooks/useCurrency";
import { toast } from "sonner";
import foremanLogo from "@/assets/foreman-logo.png";
import { track } from "@/utils/analytics";
import { useIsNative, openExternalUrl } from "@/hooks/useIsNative";
import { supabase } from "@/integrations/supabase/client";
import { ALL_TIERS, computeTierTotal, type TierId, type TierDetails } from "@/hooks/useSubscriptionTier";

export default function SelectPlan() {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrency();
  const [selectedTier, setSelectedTier] = useState<TierId>("crew");
  const [teamSize, setTeamSize] = useState(1);
  const [interval, setInterval] = useState<"month" | "year">("year"); // annual default
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

  const isAnnual = interval === "year";
  const tier = ALL_TIERS.find((t) => t.id === selectedTier)!;
  const effectiveTeamSize = Math.max(teamSize, tier.includedSeats);
  const total = computeTierTotal(tier, effectiveTeamSize, isAnnual);
  const monthlySavings = isAnnual
    ? computeTierTotal(tier, effectiveTeamSize, false) * 12 - total
    : 0;
  const supportsExtraSeats = tier.extraSeatMonthly !== undefined;

  const handleCheckout = async () => {
    try {
      setIsCheckingOut(true);
      track("checkout_started", { plan: selectedTier, interval, quantity: effectiveTeamSize });

      const searchParams = new URLSearchParams(window.location.search);
      const skipTrial = searchParams.get("skipTrial") === "true";

      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: { tier: selectedTier, teamSize: effectiveTeamSize, interval, skipTrial },
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
      <div className="container max-w-5xl py-10 px-4">
        <Button
          variant="ghost"
          size="sm"
          className="mb-6 gap-1 text-muted-foreground"
          onClick={() => navigate("/settings?tab=team-billing")}
        >
          ← Back to Settings
        </Button>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-6">
            <img src={foremanLogo} alt="Foreman" className="h-10 w-10 rounded-lg" />
            <span className="text-2xl font-bold">Foreman</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-3">
            Pick the plan that runs your business.
          </h1>
          <p className="text-muted-foreground">
            Three plans. No seat caps. Cancel anytime.
          </p>
        </div>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <button
            onClick={() => setInterval("month")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              !isAnnual
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setInterval("year")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${
              isAnnual
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            Annual
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-green-500/15 text-green-600 dark:text-green-400">
              Save 15%
            </span>
          </button>
        </div>

        {/* 3 Tier Cards */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          {ALL_TIERS.map((t) => (
            <SelectableTierCard
              key={t.id}
              tier={t}
              isAnnual={isAnnual}
              selected={selectedTier === t.id}
              onSelect={() => {
                setSelectedTier(t.id);
                setTeamSize(t.includedSeats);
              }}
            />
          ))}
        </div>

        {/* Selected plan summary */}
        <Card className="border-primary/50 max-w-lg mx-auto">
          <CardContent className="p-6 space-y-5">
            <div className="text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                Selected plan
              </p>
              <p className="text-lg font-bold">{tier.name}</p>
              <div className="flex items-baseline justify-center gap-1 mt-2">
                <span className="text-4xl font-bold">{formatCurrency(total)}</span>
                <span className="text-muted-foreground">/{isAnnual ? "year" : "month"}</span>
              </div>
              {isAnnual && monthlySavings > 0 && (
                <p className="text-sm text-green-600 dark:text-green-400 font-medium mt-1">
                  You save {formatCurrency(monthlySavings)} per year
                </p>
              )}
            </div>

            {/* Team size stepper — only for tiers with extra seats */}
            {supportsExtraSeats && (
              <div>
                <p className="text-sm font-medium text-center mb-3">Team size</p>
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={() => setTeamSize(Math.max(tier.includedSeats, effectiveTeamSize - 1))}
                    className="h-10 w-10 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-30"
                    disabled={effectiveTeamSize <= tier.includedSeats}
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="text-2xl font-bold w-12 text-center">{effectiveTeamSize}</span>
                  <button
                    onClick={() => setTeamSize(Math.min(50, effectiveTeamSize + 1))}
                    className="h-10 w-10 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-30"
                    disabled={effectiveTeamSize >= 50}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  {tier.includedSeats} included · extra seats {formatCurrency(isAnnual ? tier.extraSeatAnnual ?? 0 : tier.extraSeatMonthly ?? 0)}/{isAnnual ? "yr" : "mo"} each
                </p>
              </div>
            )}

            <Button
              className="w-full gap-2"
              size="lg"
              onClick={handleCheckout}
              disabled={isCheckingOut}
            >
              {isCheckingOut ? "Processing..." : `Start ${tier.name} Free Trial`}
              {!isCheckingOut && <ArrowRight className="h-4 w-4" />}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              14-day free trial · Cancel anytime · VAT may apply
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SelectableTierCard({
  tier,
  isAnnual,
  selected,
  onSelect,
}: {
  tier: TierDetails;
  isAnnual: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  const displayPrice = isAnnual ? tier.annual / 12 : tier.monthly;

  return (
    <button
      onClick={onSelect}
      className={`relative text-left p-5 rounded-2xl bg-card transition-all ${
        selected
          ? "border-2 border-primary shadow-[0_0_30px_-8px_hsl(159,100%,45%,0.3)]"
          : tier.highlighted
          ? "border-2 border-primary/40 hover:border-primary"
          : tier.id === 'business'
          ? "border-2 border-amber-500/40 hover:border-amber-500"
          : "border border-border hover:border-primary/40"
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

      <div className="mb-3 pt-1">
        <h3 className="text-lg font-bold text-foreground">{tier.name}</h3>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{tier.tagline}</p>
      </div>

      <div className="mb-4">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-extrabold text-foreground">€{Math.round(displayPrice)}</span>
          <span className="text-xs text-muted-foreground">/mo</span>
        </div>
      </div>

      <ul className="space-y-1.5">
        {(tier.id === 'business' ? tier.features : tier.features.slice(0, 4)).map((f) => (
          <li key={f} className="flex items-start gap-2 text-xs">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
            <span className="text-foreground">{f}</span>
          </li>
        ))}
      </ul>
    </button>
  );
}
