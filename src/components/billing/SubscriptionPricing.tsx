import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, ArrowRight, Minus, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCurrency } from "@/hooks/useCurrency";
import { useIsNative } from "@/hooks/useIsNative";
import { ALL_TIERS, computeTierTotal, type TierId, type TierDetails } from "@/hooks/useSubscriptionTier";

export function SubscriptionPricing() {
  const { formatCurrency } = useCurrency();
  const isNative = useIsNative();
  const [selectedTier, setSelectedTier] = useState<TierId>("crew");
  const [teamSize, setTeamSize] = useState(1);
  const [interval, setInterval] = useState<"month" | "year">("year");
  const [isLoading, setIsLoading] = useState(false);

  if (isNative) return null;

  const isAnnual = interval === "year";
  const tier = ALL_TIERS.find((t) => t.id === selectedTier)!;
  const effectiveTeamSize = Math.max(teamSize, tier.includedSeats);
  const total = computeTierTotal(tier, effectiveTeamSize, isAnnual);
  const supportsExtraSeats = tier.extraSeatMonthly !== undefined;

  const handleSubscribe = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: { tier: selectedTier, teamSize: effectiveTeamSize, interval },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.url) window.location.href = data.url;
    } catch {
      toast.error("Failed to start checkout");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-2">
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
      <div className="grid md:grid-cols-3 gap-3">
        {ALL_TIERS.map((t) => (
          <CompactTierCard
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

      <Card className="border-primary/50">
        <CardContent className="p-6 space-y-5">
          <div className="text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{tier.name} plan</p>
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-4xl font-bold">{formatCurrency(total)}</span>
              <span className="text-muted-foreground">/{isAnnual ? "year" : "month"}</span>
            </div>
          </div>

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
            </div>
          )}

          <Button className="w-full gap-2" size="lg" onClick={handleSubscribe} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Subscribe to {tier.name}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            14-day free trial · 2.9% platform fee on payments · Cancel anytime
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function CompactTierCard({
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
      className={`relative text-left p-4 rounded-xl bg-card transition-all ${
        selected
          ? "border-2 border-primary"
          : "border border-border hover:border-primary/40"
      }`}
    >
      {tier.badge && (
        <span className="absolute -top-2 left-3 px-2 py-0.5 text-[10px] font-bold bg-primary text-primary-foreground rounded-full">
          {tier.badge}
        </span>
      )}
      <h3 className="text-base font-bold text-foreground mb-1">{tier.name}</h3>
      <div className="flex items-baseline gap-1 mb-2">
        <span className="text-2xl font-extrabold text-foreground">€{Math.round(displayPrice)}</span>
        <span className="text-xs text-muted-foreground">/mo</span>
      </div>
      <ul className="space-y-1">
        {tier.features.slice(0, 3).map((f) => (
          <li key={f} className="flex items-start gap-1.5 text-xs">
            <CheckCircle2 className="h-3 w-3 text-primary shrink-0 mt-0.5" />
            <span className="text-foreground line-clamp-1">{f}</span>
          </li>
        ))}
      </ul>
    </button>
  );
}
