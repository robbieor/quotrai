import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calculator, TrendingUp, Clock, Users, Sparkles, Mail, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PRICING } from "@/hooks/useSubscriptionTier";

// Conservative defaults validated against industry benchmarks (Jobber, Tradify)
// Hours saved are interpreted as PER PERSON per week — total team savings scale with team size.
const DEFAULT_HOURS_SAVED_PER_PERSON_PER_WEEK = 2; // ~2 hrs/person/week of admin
const AVERAGE_HOURLY_RATE = 25; // €25/hour — conservative admin cost
const WEEKS_PER_MONTH = 4.33;
const MAX_HOURS_SAVED_PER_PERSON_PER_WEEK = 5; // realistic upper bound per person

// Tier pricing — sourced from the single source of truth (useSubscriptionTier.PRICING)
// so this component never drifts from billing.
const TIER_PRICING = {
  SOLO: PRICING.SOLO,
  CREW: PRICING.CREW,
  BUSINESS: PRICING.BUSINESS,
  EXTRA_SEAT: PRICING.EXTRA_SEAT,
  CREW_INCLUDED_SEATS: PRICING.CREW_INCLUDED_SEATS,
  BUSINESS_INCLUDED_SEATS: PRICING.BUSINESS_INCLUDED_SEATS,
};

type TierKey = "auto" | "solo" | "crew" | "business";

// Each tier multiplies baseline admin savings by a feature-impact factor.
// Solo = manual admin replacement only (1.0x)
// Crew = + AI quoting, receipt scanning, voice 60min/seat (1.5x)
// Business = + unlimited voice, advanced reporting, priority lane (1.8x)
const TIER_FEATURE_MULTIPLIER: Record<Exclude<TierKey, "auto">, number> = {
  solo: 1.0,
  crew: 1.5,
  business: 1.8,
};

const TIER_FEATURE_HIGHLIGHTS: Record<Exclude<TierKey, "auto">, string> = {
  solo: "Replaces manual admin: quotes, invoices, scheduling, GPS time tracking.",
  crew: "Adds Foreman AI for quoting, receipt scanning, voice (60min/seat) — saves more per person.",
  business: "Adds unlimited Foreman AI voice, advanced reports & faster AI lane — biggest per-person uplift.",
};

interface ROICalculatorProps {
  variant?: "full" | "compact";
  /** @deprecated Voice is bundled into Crew/Business — prop kept for backward compat */
  showVoice?: boolean;
}

/** Cost for a SPECIFIC tier given team size. */
function costForTier(tier: Exclude<TierKey, "auto">, teamSize: number): { cost: number; breakdown: string } {
  if (tier === "solo") {
    // Solo is single-user only — show base price even if team > 1, with a note.
    return {
      cost: TIER_PRICING.SOLO,
      breakdown: teamSize > 1
        ? `Solo €${TIER_PRICING.SOLO} · single-user plan (team needs Crew or Business)`
        : `Solo €${TIER_PRICING.SOLO} · 1 user`,
    };
  }
  if (tier === "crew") {
    const extra = Math.max(0, teamSize - TIER_PRICING.CREW_INCLUDED_SEATS);
    const cost = TIER_PRICING.CREW + extra * TIER_PRICING.EXTRA_SEAT;
    return {
      cost,
      breakdown: extra > 0
        ? `Crew €${TIER_PRICING.CREW} + ${extra} extra × €${TIER_PRICING.EXTRA_SEAT}`
        : `Crew €${TIER_PRICING.CREW} · 1 user`,
    };
  }
  // business
  const extra = Math.max(0, teamSize - TIER_PRICING.BUSINESS_INCLUDED_SEATS);
  const cost = TIER_PRICING.BUSINESS + extra * TIER_PRICING.EXTRA_SEAT;
  return {
    cost,
    breakdown: extra > 0
      ? `Business €${TIER_PRICING.BUSINESS} + ${extra} extra × €${TIER_PRICING.EXTRA_SEAT}`
      : `Business €${TIER_PRICING.BUSINESS} · 3 seats included`,
  };
}

/** Auto-pick the cheapest tier that fits the team size. */
function autoPickTier(teamSize: number): { tier: Exclude<TierKey, "auto">; cost: number; breakdown: string } {
  if (teamSize <= 1) {
    const { cost, breakdown } = costForTier("solo", 1);
    return { tier: "solo", cost, breakdown };
  }
  const crew = costForTier("crew", teamSize);
  const business = costForTier("business", teamSize);
  return business.cost <= crew.cost
    ? { tier: "business", ...business }
    : { tier: "crew", ...crew };
}

export function ROICalculator({ variant = "full" }: ROICalculatorProps) {
  const [teamSize, setTeamSize] = useState(5);
  const [adminHoursPerPersonPerWeek, setAdminHoursPerPersonPerWeek] = useState(DEFAULT_HOURS_SAVED_PER_PERSON_PER_WEEK);
  const [selectedTier, setSelectedTier] = useState<TierKey>("auto");

  // Email capture state
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // Resolve tier — either user-selected or auto-recommended (cheapest fit).
  const auto = autoPickTier(teamSize);
  const activeTier: Exclude<TierKey, "auto"> = selectedTier === "auto" ? auto.tier : selectedTier;
  const { cost: foremanMonthlyCost, breakdown: costBreakdown } =
    selectedTier === "auto"
      ? { cost: auto.cost, breakdown: auto.breakdown }
      : costForTier(activeTier, teamSize);

  // Calculate savings — per-person hours × team size × tier-feature multiplier.
  const cappedHoursPerPerson = Math.min(adminHoursPerPersonPerWeek, MAX_HOURS_SAVED_PER_PERSON_PER_WEEK);
  const tierMultiplier = TIER_FEATURE_MULTIPLIER[activeTier];
  const potentialHoursSavedPerWeek = cappedHoursPerPerson * teamSize * tierMultiplier;
  const potentialHoursSavedPerMonth = potentialHoursSavedPerWeek * WEEKS_PER_MONTH;
  const potentialMoneySavedPerMonth = potentialHoursSavedPerMonth * AVERAGE_HOURLY_RATE;

  const recommendedTier = activeTier.charAt(0).toUpperCase() + activeTier.slice(1);

  // Net savings
  const netMonthlySavings = potentialMoneySavedPerMonth - foremanMonthlyCost;
  const annualSavings = netMonthlySavings * 12;
  const roiMultiple = foremanMonthlyCost > 0 ? potentialMoneySavedPerMonth / foremanMonthlyCost : 0;

  // Admin headcount equivalent
  const fullTimeAdminHoursPerMonth = 160;
  const adminHeadcountEquivalent = potentialHoursSavedPerMonth / fullTimeAdminHoursPerMonth;

  const handleSendSummary = async () => {
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-roi-summary", {
        body: {
          email,
          name: name || "there",
          teamSize,
          adminHoursPerPersonPerWeek,
          recommendedTier,
          monthlyNetSavings: netMonthlySavings,
          annualSavings,
          roiMultiple,
          hoursSavedPerMonth: potentialHoursSavedPerMonth,
          adminHeadcountEquivalent,
          foremanMonthlyCost,
        },
      });

      if (error) throw error;

      setEmailSent(true);
      toast.success("ROI summary sent to your inbox!");
    } catch (error) {
      console.error("Error sending ROI summary:", error);
      toast.error("Failed to send email. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  if (variant === "compact") {
    return (
      <Card className="border-primary/30">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calculator className="h-5 w-5 text-primary" />
            ROI Calculator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Team size</span>
                <span className="font-semibold">{teamSize} people</span>
              </div>
              <Slider
                value={[teamSize]}
                onValueChange={(v) => setTeamSize(v[0])}
                min={1}
                max={50}
                step={1}
                className="w-full"
              />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Admin hours saved/person/week</span>
                <span className="font-semibold">{adminHoursPerPersonPerWeek} hrs</span>
              </div>
              <Slider
                value={[adminHoursPerPersonPerWeek]}
                onValueChange={(v) => setAdminHoursPerPersonPerWeek(v[0])}
                min={1}
                max={MAX_HOURS_SAVED_PER_PERSON_PER_WEEK}
                step={1}
                className="w-full"
              />
            </div>
          </div>
          
          <div className="p-4 rounded-lg bg-primary/10 text-center">
            <p className="text-sm text-muted-foreground">Monthly savings</p>
            <p className="text-3xl font-bold text-primary">
              €{Math.round(netMonthlySavings).toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {roiMultiple.toFixed(1)}x return on investment
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10">
            <Calculator className="h-6 w-6 text-primary" />
          </div>
          <div>
            <CardTitle className="text-xl">ROI Calculator</CardTitle>
            <CardDescription>
              See how much admin time you could save
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Inputs */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <label className="text-sm font-medium">Team Size</label>
                </div>
                <Badge variant="secondary" className="text-sm font-semibold">
                  {teamSize} {teamSize === 1 ? "person" : "people"}
                </Badge>
              </div>
              <Slider
                value={[teamSize]}
                onValueChange={(v) => setTeamSize(v[0])}
                min={1}
                max={50}
                step={1}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Number of team members using Foreman
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <label className="text-sm font-medium">Admin Hours Saved per Person / Week</label>
                </div>
                <Badge variant="secondary" className="text-sm font-semibold">
                  {adminHoursPerPersonPerWeek} hrs / person
                </Badge>
              </div>
              <Slider
                value={[adminHoursPerPersonPerWeek]}
                onValueChange={(v) => setAdminHoursPerPersonPerWeek(v[0])}
                min={1}
                max={MAX_HOURS_SAVED_PER_PERSON_PER_WEEK}
                step={1}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Hours each person saves on quotes, invoices, scheduling — total scales with team size ({Math.round(potentialHoursSavedPerWeek)} hrs/week across {teamSize} {teamSize === 1 ? "person" : "people"}).
              </p>
            </div>

            {/* Tier picker — explore savings by plan */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-muted-foreground" />
                <label className="text-sm font-medium">Plan to evaluate</label>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {([
                  { key: "auto", label: "Auto" },
                  { key: "solo", label: "Solo" },
                  { key: "crew", label: "Crew" },
                  { key: "business", label: "Business" },
                ] as { key: TierKey; label: string }[]).map(({ key, label }) => {
                  const isActive = selectedTier === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedTier(key)}
                      className={`px-2 py-2 rounded-md text-xs font-medium border transition-colors ${
                        isActive
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background hover:bg-muted border-border text-foreground"
                      }`}
                    >
                      {label}
                      {key === "auto" && selectedTier === "auto" && (
                        <span className="block text-[10px] opacity-80 mt-0.5">{recommendedTier}</span>
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                {selectedTier === "auto"
                  ? `Auto-picks the cheapest fit (currently ${recommendedTier}). `
                  : ""}
                {TIER_FEATURE_HIGHLIGHTS[activeTier]}
              </p>
            </div>
          </div>

          {/* Results */}
          <div className="space-y-4">
            <div className="p-5 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-5 w-5 text-primary" />
                <span className="font-semibold">Your Estimated Savings</span>
              </div>
              
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Monthly Net Savings</p>
                  <p className="text-4xl font-bold text-primary">
                    €{Math.round(netMonthlySavings).toLocaleString()}
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-background/80">
                    <p className="text-xs text-muted-foreground">Annual Savings</p>
                    <p className="text-lg font-bold text-foreground">
                      €{Math.round(annualSavings).toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-background/80">
                    <p className="text-xs text-muted-foreground">ROI Multiple</p>
                    <p className="text-lg font-bold text-foreground">
                      {roiMultiple.toFixed(1)}x
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Hours Saved</p>
                </div>
                <p className="text-xl font-bold">
                  {Math.round(potentialHoursSavedPerMonth)} hrs/mo
                </p>
              </div>
              <div className="p-4 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Admin Headcount</p>
                </div>
                <p className="text-xl font-bold">
                  -{adminHeadcountEquivalent.toFixed(1)} FTE
                </p>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Cost Breakdown */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Cost Breakdown</h4>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-muted-foreground">Foreman Subscription</p>
              <p className="font-semibold">
                €{foremanMonthlyCost}/month
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {costBreakdown}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-muted-foreground">Admin Time Saved</p>
              <p className="font-semibold text-primary">
                €{Math.round(potentialMoneySavedPerMonth).toLocaleString()}/month
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {Math.round(potentialHoursSavedPerMonth)} hrs × €{AVERAGE_HOURLY_RATE}/hr
              </p>
            </div>
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
              <p className="text-muted-foreground">Net Benefit</p>
              <p className="font-bold text-primary">
                €{Math.round(netMonthlySavings).toLocaleString()}/month
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Savings minus subscription
              </p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Email Capture */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" />
            <h4 className="font-medium text-sm">Get your personalised ROI summary</h4>
          </div>
          
          {emailSent ? (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/10 border border-primary/20">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium text-foreground">Summary sent!</p>
                <p className="text-sm text-muted-foreground">
                  Check your inbox for your personalised ROI breakdown
                </p>
              </div>
            </div>
          ) : (
            <div className="grid sm:grid-cols-[1fr,1fr,auto] gap-3">
              <Input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-background"
              />
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-background"
              />
              <Button 
                onClick={handleSendSummary} 
                disabled={isSending || !email}
                className="gap-2"
              >
                {isSending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4" />
                    Send Summary
                  </>
                )}
              </Button>
            </div>
          )}
          
          <p className="text-xs text-muted-foreground">
            We'll email your calculated savings. No spam, just your ROI numbers.
          </p>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          * Based on average admin time costs of €{AVERAGE_HOURLY_RATE}/hour. Savings estimates are conservative and based on industry benchmarks.
        </p>
      </CardContent>
    </Card>
  );
}
