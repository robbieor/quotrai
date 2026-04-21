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

// Conservative defaults validated against industry benchmarks (Jobber, Tradify)
// Hours saved are interpreted as PER PERSON per week — total team savings scale with team size.
const DEFAULT_HOURS_SAVED_PER_PERSON_PER_WEEK = 2; // ~2 hrs/person/week of admin
const AVERAGE_HOURLY_RATE = 25; // €25/hour — conservative admin cost
const WEEKS_PER_MONTH = 4.33;
const MAX_HOURS_SAVED_PER_PERSON_PER_WEEK = 5; // realistic upper bound per person

// Tiered pricing (Apr 2026): Solo €29 · Crew €49 · Business €89
// Extra seat €19/mo on Crew & Business. Voice is bundled in Crew (60min/seat) and Business (unlimited).
const TIER_PRICING = {
  SOLO: 29,
  CREW: 49,
  BUSINESS: 89,
  EXTRA_SEAT: 19,
  CREW_INCLUDED_SEATS: 1,
  BUSINESS_INCLUDED_SEATS: 3,
};

interface ROICalculatorProps {
  variant?: "full" | "compact";
  /** @deprecated Voice is bundled into Crew/Business — prop kept for backward compat */
  showVoice?: boolean;
}

/** Pick the cheapest tier that fits the team size, then add extra seats. */
function calculateForemanCost(teamSize: number): { cost: number; tier: string; breakdown: string } {
  if (teamSize <= 1) {
    return { cost: TIER_PRICING.SOLO, tier: "Solo", breakdown: "1 user · Solo plan" };
  }
  // Crew: €49 base + €19 per extra seat beyond 1
  const crewCost = TIER_PRICING.CREW + (teamSize - TIER_PRICING.CREW_INCLUDED_SEATS) * TIER_PRICING.EXTRA_SEAT;
  // Business: €89 base (3 seats incl.) + €19 per extra seat beyond 3
  const extraOverBusiness = Math.max(0, teamSize - TIER_PRICING.BUSINESS_INCLUDED_SEATS);
  const businessCost = TIER_PRICING.BUSINESS + extraOverBusiness * TIER_PRICING.EXTRA_SEAT;

  if (businessCost <= crewCost) {
    return {
      cost: businessCost,
      tier: "Business",
      breakdown:
        extraOverBusiness > 0
          ? `Business €${TIER_PRICING.BUSINESS} + ${extraOverBusiness} extra × €${TIER_PRICING.EXTRA_SEAT}`
          : `Business €${TIER_PRICING.BUSINESS} · 3 seats included`,
    };
  }
  return {
    cost: crewCost,
    tier: "Crew",
    breakdown: `Crew €${TIER_PRICING.CREW} + ${teamSize - 1} extra × €${TIER_PRICING.EXTRA_SEAT}`,
  };
}

export function ROICalculator({ variant = "full" }: ROICalculatorProps) {
  const [teamSize, setTeamSize] = useState(5);
  const [adminHoursPerPersonPerWeek, setAdminHoursPerPersonPerWeek] = useState(DEFAULT_HOURS_SAVED_PER_PERSON_PER_WEEK);

  // Email capture state
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // Calculate savings — per-person hours × team size, gives true linear scaling.
  const cappedHoursPerPerson = Math.min(adminHoursPerPersonPerWeek, MAX_HOURS_SAVED_PER_PERSON_PER_WEEK);
  const potentialHoursSavedPerWeek = cappedHoursPerPerson * teamSize;
  const potentialHoursSavedPerMonth = potentialHoursSavedPerWeek * WEEKS_PER_MONTH;
  const potentialMoneySavedPerMonth = potentialHoursSavedPerMonth * AVERAGE_HOURLY_RATE;

  // Foreman cost — cheapest tier that fits the team
  const { cost: foremanMonthlyCost, tier: recommendedTier, breakdown: costBreakdown } = calculateForemanCost(teamSize);

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

            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-4 w-4 text-primary" />
                <p className="text-xs font-medium text-foreground">
                  Recommended plan: <span className="font-semibold">{recommendedTier}</span>
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Foreman AI voice is included — no separate seats to buy.
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
