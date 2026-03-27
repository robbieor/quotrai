import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Building2,
  User,
  Wrench,
  Users,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  FileText,
  Receipt,
  Briefcase,
  Clock,
  Target,
  Zap,
  X,
} from "lucide-react";
import foremanLogo from "@/assets/foreman-logo.png";
import { COUNTRIES } from "@/constants/countries";
import { track } from "@/utils/analytics";
import { OnboardingCommsStep } from "@/components/onboarding/OnboardingCommsStep";
import { OnboardingTemplatesStep } from "@/components/onboarding/OnboardingTemplatesStep";
import { computeWorkflowMode } from "@/hooks/useWorkflowMode";
import { Skeleton } from "@/components/ui/skeleton";

const tradeTypes = [
  "Electrician",
  "Plumber",
  "HVAC Technician",
  "Carpenter",
  "Painter & Decorator",
  "Roofer",
  "Builder / General Contractor",
  "Landscaper",
  "Locksmith",
  "Handyman",
  "Cleaning Services",
  "Pest Control",
  "Pool & Spa",
  "Pressure Washing",
  "Fencing",
  "Appliance Repair",
  "Auto Detailing",
  "Garage Door Services",
  "Tree Services",
  "Restoration",
  "Solar",
  "Flooring",
  "Tiler",
  "Property Maintenance",
  "Concrete & Masonry",
  "Window & Door Installation",
  "Other",
];

const businessSizes = [
  { value: "solo", label: "Just me", icon: User },
  { value: "small", label: "2-5 people", icon: Users },
  { value: "medium", label: "6-15 people", icon: Users },
  { value: "large", label: "15+ people", icon: Building2 },
];

interface OnboardingData {
  fullName: string;
  companyName: string;
  phone: string;
  tradeType: string;
  businessSize: string;
  currency: string;
  country: string;
  sendsQuotes: boolean | null;
  tracksJobs: boolean | null;
  priority: string;
}

interface CommsPrefs {
  visit_reminder_enabled: boolean;
  quote_followup_enabled: boolean;
  job_complete_enabled: boolean;
  on_my_way_enabled: boolean;
  enquiry_ack_enabled: boolean;
  review_request_enabled: boolean;
  invoice_reminder_enabled: boolean;
  payment_receipt_enabled: boolean;
}

const DEFAULT_COMMS: CommsPrefs = {
  visit_reminder_enabled: false,
  quote_followup_enabled: false,
  job_complete_enabled: false,
  on_my_way_enabled: false,
  enquiry_ack_enabled: false,
  review_request_enabled: false,
  invoice_reminder_enabled: false,
  payment_receipt_enabled: false,
};

interface OnboardingModalProps {
  open: boolean;
  onComplete: () => void;
  initialStep?: number;
}

export function OnboardingModal({ open, onComplete, initialStep = 1 }: OnboardingModalProps) {
  const [step, setStep] = useState(initialStep);
  const [submitting, setSubmitting] = useState(false);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [teamLoading, setTeamLoading] = useState(true);
  const [data, setData] = useState<OnboardingData>({
    fullName: "",
    companyName: "",
    phone: "",
    tradeType: "",
    businessSize: "",
    currency: "EUR",
    country: "IE",
    sendsQuotes: null,
    tracksJobs: null,
    priority: "",
  });
  const [commsPrefs, setCommsPrefs] = useState<CommsPrefs>(DEFAULT_COMMS);
  const { user } = useAuth();

  const totalSteps = 6;

  // Load teamId and existing profile data on mount
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("team_id, full_name, company_name, phone, trade_type, business_size, currency, country, workflow_mode")
          .eq("id", user.id)
          .single();

        if (profile?.team_id) setTeamId(profile.team_id);

        // Pre-fill form with existing data if resuming
        if (profile) {
          setData(prev => ({
            ...prev,
            fullName: profile.full_name || prev.fullName,
            companyName: profile.company_name || prev.companyName,
            phone: profile.phone || prev.phone,
            tradeType: profile.trade_type || prev.tradeType,
            businessSize: profile.business_size || prev.businessSize,
            currency: profile.currency || prev.currency,
            country: profile.country || prev.country,
          }));
        }
      } catch (err) {
        console.error("Failed to load profile for onboarding:", err);
      } finally {
        setTeamLoading(false);
      }
    })();
  }, [user?.id]);

  const updateData = (field: keyof OnboardingData, value: string) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return data.fullName.trim() !== "" && data.companyName.trim() !== "";
      case 2:
        return data.tradeType !== "" && data.businessSize !== "";
      case 3:
        return data.sendsQuotes !== null && data.tracksJobs !== null && data.priority !== "";
      case 4:
      case 5:
      case 6:
        return true;
      default:
        return false;
    }
  };

  // Save current profile data (called on every Continue and Finish Later)
  const saveProgress = async (markStep?: number) => {
    if (!user?.id) return;

    const workflowMode = computeWorkflowMode({
      sendsQuotes: data.sendsQuotes ?? false,
      tracksJobs: data.tracksJobs ?? false,
      teamSize: data.businessSize,
      priority: data.priority,
    });

    const updates: Record<string, any> = {
      full_name: data.fullName || null,
      company_name: data.companyName || null,
      phone: data.phone || null,
      trade_type: data.tradeType || null,
      business_size: data.businessSize || null,
      currency: data.currency,
      country: data.country,
      workflow_mode: workflowMode,
    };

    if (markStep !== undefined) {
      updates.onboarding_step = markStep;
    }

    await supabase.from("profiles").update(updates).eq("id", user.id);

    // Ensure teamId is set and team name is updated
    if (!teamId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("team_id")
        .eq("id", user.id)
        .single();
      if (profile?.team_id) {
        setTeamId(profile.team_id);
        if (data.companyName) {
          await supabase.from("teams").update({ name: data.companyName }).eq("id", profile.team_id);
        }
      }
    } else if (data.companyName) {
      await supabase.from("teams").update({ name: data.companyName }).eq("id", teamId);
    }
  };

  const handleNext = async () => {
    if (step < totalSteps) {
      try {
        await saveProgress(step + 1);
      } catch (err) {
        console.error("Save error on step transition:", err);
        toast.error("Failed to save. Please try again.");
        return;
      }
      track("onboarding_step", { step: step + 1 });
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleFinishLater = async () => {
    try {
      await saveProgress(step);
      toast("Progress saved — you can finish setup anytime.", { icon: "✓" });
      onComplete();
    } catch (err) {
      console.error("Finish later save error:", err);
      onComplete();
    }
  };

  const handleComplete = async () => {
    if (!user) return;

    setSubmitting(true);
    try {
      await saveProgress(totalSteps);

      // Mark onboarding complete
      await supabase
        .from("profiles")
        .update({ onboarding_completed: true })
        .eq("id", user.id);

      const resolvedTeamId = teamId || (await (async () => {
        const { data: p } = await supabase.from("profiles").select("team_id").eq("id", user.id).single();
        return p?.team_id;
      })());

      if (resolvedTeamId) {
        // Save comms preferences
        const { data: existing } = await supabase
          .from("comms_settings")
          .select("id")
          .eq("team_id", resolvedTeamId)
          .maybeSingle();

        if (existing) {
          await supabase
            .from("comms_settings")
            .update({ ...commsPrefs, updated_at: new Date().toISOString() })
            .eq("team_id", resolvedTeamId);
        } else {
          await supabase
            .from("comms_settings")
            .insert({ team_id: resolvedTeamId, ...commsPrefs });
        }

        // Seed sample data
        try {
          const { data: sampleCustomer } = await supabase
            .from("customers")
            .insert({
              name: "Sample Customer",
              email: "sample@example.com",
              phone: "+44 7700 900000",
              team_id: resolvedTeamId,
              notes: "This is a sample customer — feel free to edit or delete.",
            })
            .select("id")
            .single();

          if (sampleCustomer) {
            const { data: sampleQuote } = await supabase
              .from("quotes")
              .insert({
                customer_id: sampleCustomer.id,
                team_id: resolvedTeamId,
                display_number: "Q-SAMPLE-001",
                status: "draft" as const,
                subtotal: 450,
                total: 450,
                notes: "Sample quote — edit this to see how quoting works.",
              })
              .select("id")
              .single();

            await supabase
              .from("jobs")
              .insert({
                title: "Sample Job — Kitchen Repair",
                customer_id: sampleCustomer.id,
                team_id: resolvedTeamId,
                status: "pending",
                description: "This is a sample job to show you around. Edit or delete it anytime.",
                ...(sampleQuote ? { quote_id: sampleQuote.id } : {}),
              });
          }
        } catch (seedErr) {
          console.warn("Sample data seeding failed:", seedErr);
        }
      }

      track("onboarding_completed", { trade: data.tradeType, size: data.businessSize });
      toast.success("Welcome to Foreman! You're all set.");
      onComplete();
    } catch (error: any) {
      console.error("Onboarding error:", error);
      toast.error("Failed to save your preferences. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const stepLabels = ["Profile", "Trade", "Workflow", "Preferences", "Prices", "Comms"];

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-2xl p-0 gap-0 overflow-y-auto max-h-[90vh] [&>button]:hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="p-4 sm:p-6">
          {/* Header with Finish Later */}
          <div className="flex items-start justify-between mb-4 sm:mb-6">
            <div className="flex-1 text-center">
              <div className="flex justify-center mb-3">
                <img src={foremanLogo} alt="Foreman" className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-foreground mb-1">
                {step === 1 && "Welcome to Foreman!"}
                {step === 2 && "Tell us about your trade"}
                {step === 3 && "How do you work?"}
                {step === 4 && "Almost there!"}
                {step === 5 && "Set your prices"}
                {step === 6 && "Communication preferences"}
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {step === 1 && "Let's get your account set up in under 2 minutes"}
                {step === 2 && "We'll tailor your experience to your business"}
                {step === 3 && "We'll set up Foreman to match your workflow"}
                {step === 4 && "Just a couple more preferences, then you're ready"}
                {step === 5 && "Review your templates and labour rates — Foreman uses these to quote instantly"}
                {step === 6 && "Choose which emails you'd like to send to clients"}
              </p>
            </div>
            <button
              onClick={handleFinishLater}
              className="text-muted-foreground hover:text-foreground transition-colors p-1 -mr-1 -mt-1 shrink-0"
              aria-label="Finish later"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Progress — dots on mobile, labels on sm+ */}
          <div className="flex items-center justify-between gap-1 mb-4 sm:mb-6 px-0 sm:px-2">
            {stepLabels.map((label, i) => {
              const s = i + 1;
              const isActive = s === step;
              const isComplete = s < step;
              return (
                <div key={label} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className={`h-1.5 sm:h-2 w-full rounded-full transition-all duration-300 ${
                      isActive
                        ? "bg-primary"
                        : isComplete
                          ? "bg-primary/50"
                          : "bg-muted"
                    }`}
                  />
                  <span className={`hidden sm:block text-xs font-medium transition-colors ${
                    isActive ? "text-primary" : isComplete ? "text-muted-foreground" : "text-muted-foreground/50"
                  }`}>
                    {label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Step indicator on mobile */}
          <p className="text-xs text-muted-foreground text-center mb-3 sm:hidden">
            Step {step} of {totalSteps}
          </p>

          {/* Step 1 — Profile */}
          {step === 1 && (
            <div className="animate-fade-up space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Your Name *</Label>
                <Input id="fullName" placeholder="John Smith" value={data.fullName} onChange={(e) => updateData("fullName", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name *</Label>
                <Input id="companyName" placeholder="Smith Electrical Services" value={data.companyName} onChange={(e) => updateData("companyName", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number (Optional)</Label>
                <Input id="phone" type="tel" placeholder="+44 7700 900000" value={data.phone} onChange={(e) => updateData("phone", e.target.value)} />
              </div>
            </div>
          )}

          {/* Step 2 — Trade */}
          {step === 2 && (
            <div className="animate-fade-up space-y-4 sm:space-y-6">
              <div className="space-y-2">
                <Label>What's your trade? *</Label>
                <Select value={data.tradeType} onValueChange={(v) => updateData("tradeType", v)}>
                  <SelectTrigger><SelectValue placeholder="Select your trade" /></SelectTrigger>
                  <SelectContent>
                    {tradeTypes.map((trade) => (
                      <SelectItem key={trade} value={trade}>{trade}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3">
                <Label>Team size *</Label>
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  {businessSizes.map((size) => (
                    <button
                      key={size.value}
                      type="button"
                      onClick={() => updateData("businessSize", size.value)}
                      className={`p-3 sm:p-4 rounded-lg border-2 text-left transition-all ${
                        data.businessSize === size.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <size.icon className={`h-5 w-5 mb-1.5 ${data.businessSize === size.value ? "text-primary" : "text-muted-foreground"}`} />
                      <p className="font-medium text-sm text-foreground">{size.label}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3 — Workflow */}
          {step === 3 && (
            <div className="animate-fade-up space-y-4 sm:space-y-6">
              <div className="space-y-3">
                <Label>Do you send quotes to customers?</Label>
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  {[
                    { value: true, label: "Yes, regularly", icon: FileText },
                    { value: false, label: "No, I just invoice", icon: Receipt },
                  ].map((opt) => (
                    <button
                      key={String(opt.value)}
                      type="button"
                      onClick={() => setData(prev => ({ ...prev, sendsQuotes: opt.value }))}
                      className={`p-3 sm:p-4 rounded-lg border-2 text-left transition-all ${
                        data.sendsQuotes === opt.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <opt.icon className={`h-5 w-5 mb-1.5 ${data.sendsQuotes === opt.value ? "text-primary" : "text-muted-foreground"}`} />
                      <p className="font-medium text-sm text-foreground">{opt.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label>Do you track individual jobs or projects?</Label>
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  {[
                    { value: true, label: "Yes, I schedule work", icon: Briefcase },
                    { value: false, label: "No, I just do the work", icon: Wrench },
                  ].map((opt) => (
                    <button
                      key={String(opt.value)}
                      type="button"
                      onClick={() => setData(prev => ({ ...prev, tracksJobs: opt.value }))}
                      className={`p-3 sm:p-4 rounded-lg border-2 text-left transition-all ${
                        data.tracksJobs === opt.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <opt.icon className={`h-5 w-5 mb-1.5 ${data.tracksJobs === opt.value ? "text-primary" : "text-muted-foreground"}`} />
                      <p className="font-medium text-sm text-foreground">{opt.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label>What do you need most right now?</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                  {[
                    { value: "get_paid_faster", label: "Get paid faster", icon: Zap },
                    { value: "stay_organised", label: "Stay organised", icon: Briefcase },
                    { value: "reduce_admin", label: "Reduce admin", icon: Clock },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => updateData("priority", opt.value)}
                      className={`p-3 sm:p-4 rounded-lg border-2 text-center transition-all ${
                        data.priority === opt.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <opt.icon className={`h-5 w-5 mx-auto mb-1.5 ${data.priority === opt.value ? "text-primary" : "text-muted-foreground"}`} />
                      <p className="font-medium text-sm text-foreground">{opt.label}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 4 — Preferences */}
          {step === 4 && (
            <div className="animate-fade-up space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Select value={data.country} onValueChange={(v) => updateData("country", v)}>
                    <SelectTrigger><SelectValue placeholder="Select your country" /></SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((country) => (
                        <SelectItem key={country.code} value={country.code}>{country.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Preferred Currency</Label>
                  <Select value={data.currency} onValueChange={(v) => updateData("currency", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EUR">€ Euro (EUR)</SelectItem>
                      <SelectItem value="GBP">£ British Pound (GBP)</SelectItem>
                      <SelectItem value="USD">$ US Dollar (USD)</SelectItem>
                      <SelectItem value="AUD">$ Australian Dollar (AUD)</SelectItem>
                      <SelectItem value="CAD">$ Canadian Dollar (CAD)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span>You can update these settings anytime</span>
              </div>
            </div>
          )}

          {/* Step 5 — Prices */}
          {step === 5 && (
            teamLoading ? (
              <div className="space-y-4 py-8">
                <Skeleton className="h-8 w-48 mx-auto" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : teamId ? (
              <OnboardingTemplatesStep teamId={teamId} />
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <p>Unable to load templates. Please go back and try again.</p>
              </div>
            )
          )}

          {/* Step 6 — Comms */}
          {step === 6 && (
            <OnboardingCommsStep prefs={commsPrefs} onChange={setCommsPrefs} />
          )}

          {/* Navigation */}
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-0 mt-4 sm:mt-6">
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={handleBack} disabled={step === 1} className="gap-2 flex-1 sm:flex-initial">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <Button
                variant="ghost"
                onClick={handleFinishLater}
                className="text-muted-foreground text-xs sm:text-sm flex-1 sm:flex-initial"
              >
                Finish later
              </Button>
            </div>
            {step < totalSteps ? (
              <Button onClick={handleNext} disabled={!canProceed()} className="gap-2 w-full sm:w-auto">
                Continue
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleComplete} disabled={submitting} className="gap-2 w-full sm:w-auto">
                {submitting ? "Setting up..." : "Get Started"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
