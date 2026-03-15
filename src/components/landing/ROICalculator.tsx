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
// Assumptions for ROI calculation
const HOURS_SAVED_PER_PERSON_PER_WEEK = 10; // Average hours saved on admin
const AVERAGE_HOURLY_RATE = 30; // €30/hour average cost for admin time
const QUOTR_SEAT_PRICE = 29; // €29/month per seat
const QUOTR_VOICE_PRICE = 20; // €20/month per voice seat
const WEEKS_PER_MONTH = 4.33;

interface ROICalculatorProps {
  variant?: "full" | "compact";
  showVoice?: boolean;
}

export function ROICalculator({ variant = "full", showVoice = true }: ROICalculatorProps) {
  const [teamSize, setTeamSize] = useState(5);
  const [adminHoursPerWeek, setAdminHoursPerWeek] = useState(15);
  const [voiceUsers, setVoiceUsers] = useState(2);
  
  // Email capture state
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  // Calculate savings
  const potentialHoursSavedPerWeek = Math.min(adminHoursPerWeek, HOURS_SAVED_PER_PERSON_PER_WEEK) * teamSize;
  const potentialHoursSavedPerMonth = potentialHoursSavedPerWeek * WEEKS_PER_MONTH;
  const potentialMoneySavedPerMonth = potentialHoursSavedPerMonth * AVERAGE_HOURLY_RATE;
  
  // Quotr cost
  const quotrMonthlyCost = (teamSize * QUOTR_SEAT_PRICE) + (showVoice ? voiceUsers * QUOTR_VOICE_PRICE : 0);
  
  // Net savings
  const netMonthlySavings = potentialMoneySavedPerMonth - quotrMonthlyCost;
  const annualSavings = netMonthlySavings * 12;
  const roiMultiple = quotrMonthlyCost > 0 ? potentialMoneySavedPerMonth / quotrMonthlyCost : 0;

  // Admin headcount equivalent
  const fullTimeAdminHoursPerMonth = 160; // 40hrs/week * 4 weeks
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
          adminHoursPerWeek,
          voiceUsers,
          monthlyNetSavings: netMonthlySavings,
          annualSavings,
          roiMultiple,
          hoursSavedPerMonth: potentialHoursSavedPerMonth,
          adminHeadcountEquivalent,
          quotrMonthlyCost,
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
                <span>Admin hours/week per person</span>
                <span className="font-semibold">{adminHoursPerWeek} hrs</span>
              </div>
              <Slider
                value={[adminHoursPerWeek]}
                onValueChange={(v) => setAdminHoursPerWeek(v[0])}
                min={5}
                max={30}
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
              See how much you could save on admin costs
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
                onValueChange={(v) => {
                  setTeamSize(v[0]);
                  if (voiceUsers > v[0]) setVoiceUsers(v[0]);
                }}
                min={1}
                max={50}
                step={1}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Number of team members using Quotr
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <label className="text-sm font-medium">Admin Hours/Week</label>
                </div>
                <Badge variant="secondary" className="text-sm font-semibold">
                  {adminHoursPerWeek} hrs/person
                </Badge>
              </div>
              <Slider
                value={[adminHoursPerWeek]}
                onValueChange={(v) => setAdminHoursPerWeek(v[0])}
                min={5}
                max={30}
                step={1}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Hours spent on quotes, invoices, scheduling, etc.
              </p>
            </div>

            {showVoice && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-muted-foreground" />
                    <label className="text-sm font-medium">Foreman AI Voice Users</label>
                  </div>
                  <Badge variant="secondary" className="text-sm font-semibold">
                    {voiceUsers} {voiceUsers === 1 ? "user" : "users"}
                  </Badge>
                </div>
                <Slider
                  value={[voiceUsers]}
                  onValueChange={(v) => setVoiceUsers(v[0])}
                  min={0}
                  max={teamSize}
                  step={1}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Team members with hands-free voice access
                </p>
              </div>
            )}
          </div>

          {/* Results */}
          <div className="space-y-4">
            <div className="p-5 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-5 w-5 text-primary" />
                <span className="font-semibold">Your Potential Savings</span>
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
              <p className="text-muted-foreground">Quotr Subscription</p>
              <p className="font-semibold">
                €{quotrMonthlyCost}/month
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {teamSize} seats × €{QUOTR_SEAT_PRICE}
                {showVoice && voiceUsers > 0 && ` + ${voiceUsers} voice × €${QUOTR_VOICE_PRICE}`}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-muted-foreground">Admin Time Saved</p>
              <p className="font-semibold text-primary">
                £{Math.round(potentialMoneySavedPerMonth).toLocaleString()}/month
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {Math.round(potentialHoursSavedPerMonth)} hrs × £{AVERAGE_HOURLY_RATE}/hr
              </p>
            </div>
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
              <p className="text-muted-foreground">Net Benefit</p>
              <p className="font-bold text-primary">
                £{Math.round(netMonthlySavings).toLocaleString()}/month
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
            <h4 className="font-medium text-sm">Get your personalized ROI summary</h4>
          </div>
          
          {emailSent ? (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/10 border border-primary/20">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium text-foreground">Summary sent!</p>
                <p className="text-sm text-muted-foreground">
                  Check your inbox for your personalized ROI breakdown
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
          * Based on average admin time costs of £{AVERAGE_HOURLY_RATE}/hour and up to {HOURS_SAVED_PER_PERSON_PER_WEEK} hours saved per person per week
        </p>
      </CardContent>
    </Card>
  );
}
