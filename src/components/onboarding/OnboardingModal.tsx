import { useState } from "react";
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
} from "lucide-react";
import foremanLogo from "@/assets/foreman-logo.png";
import { COUNTRIES } from "@/constants/countries";
import { track } from "@/utils/analytics";
import { OnboardingCommsStep } from "@/components/onboarding/OnboardingCommsStep";
import { computeWorkflowMode } from "@/hooks/useWorkflowMode";

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
}

export function OnboardingModal({ open, onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
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

  const totalSteps = 5;

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
        return true;
      case 5:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (step < totalSteps) {
      track("onboarding_step", { step: step + 1 });
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleComplete = async () => {
    if (!user) return;

    setSubmitting(true);
    try {
      const workflowMode = computeWorkflowMode({
        sendsQuotes: data.sendsQuotes ?? false,
        tracksJobs: data.tracksJobs ?? false,
        teamSize: data.businessSize,
        priority: data.priority,
      });

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: data.fullName,
          company_name: data.companyName,
          phone: data.phone || null,
          trade_type: data.tradeType,
          business_size: data.businessSize,
          currency: data.currency,
          country: data.country,
          workflow_mode: workflowMode,
          onboarding_completed: true,
        })
        .eq("id", user.id);

      if (profileError) throw profileError;

      const { data: profile } = await supabase
        .from("profiles")
        .select("team_id")
        .eq("id", user.id)
        .single();

      if (profile?.team_id) {
        await supabase
          .from("teams")
          .update({ name: data.companyName })
          .eq("id", profile.team_id);

        const { data: existing } = await supabase
          .from("comms_settings")
          .select("id")
          .eq("team_id", profile.team_id)
          .maybeSingle();

        if (existing) {
          await supabase
            .from("comms_settings")
            .update({ ...commsPrefs, updated_at: new Date().toISOString() })
            .eq("team_id", profile.team_id);
        } else {
          await supabase
            .from("comms_settings")
            .insert({ team_id: profile.team_id, ...commsPrefs });
        }

        // Seed sample data so user sees value immediately
        try {
          const { data: sampleCustomer } = await supabase
            .from("customers")
            .insert({
              name: "Sample Customer",
              email: "sample@example.com",
              phone: "+44 7700 900000",
              team_id: profile.team_id,
              notes: "This is a sample customer — feel free to edit or delete.",
            })
            .select("id")
            .single();

          if (sampleCustomer) {
            const { data: sampleQuote } = await supabase
              .from("quotes")
              .insert({
                customer_id: sampleCustomer.id,
                team_id: profile.team_id,
                quote_number: "Q-SAMPLE-001",
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
                team_id: profile.team_id,
                status: "pending",
                description: "This is a sample job to show you around. Edit or delete it anytime.",
                ...(sampleQuote ? { quote_id: sampleQuote.id } : {}),
              });
          }
        } catch (seedErr) {
          // Non-critical — don't block onboarding if seeding fails
          console.warn("Sample data seeding failed:", seedErr);
        }
      }

      track("onboarding_completed", { trade: data.tradeType, size: data.businessSize, workflowMode });
      toast.success("Welcome to Foreman! You're all set.");
      onComplete();
    } catch (error: any) {
      console.error("Onboarding error:", error);
      toast.error("Failed to save your preferences. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const stepLabels = ["Profile", "Trade", "Workflow", "Preferences", "Comms"];

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-2xl p-0 gap-0 overflow-y-auto max-h-[90vh] [&>button]:hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="p-6">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-3">
              <img src={foremanLogo} alt="Foreman" className="h-12 w-12 rounded-xl" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-1">
              {step === 1 && "Welcome to Foreman!"}
              {step === 2 && "Tell us about your trade"}
              {step === 3 && "How do you work?"}
              {step === 4 && "Almost there!"}
              {step === 5 && "Communication preferences"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {step === 1 && "Let's get your account set up in under 2 minutes"}
              {step === 2 && "We'll tailor your experience to your business"}
              {step === 3 && "We'll set up Foreman to match your workflow"}
              {step === 4 && "Just a couple more preferences, then you're ready"}
              {step === 5 && "Choose which emails you'd like to send to clients"}
            </p>
          </div>

          {/* Progress */}
          <div className="flex items-center justify-between gap-1 mb-6 px-2">
            {stepLabels.map((label, i) => {
              const s = i + 1;
              const isActive = s === step;
              const isComplete = s < step;
              return (
                <div key={label} className="flex-1 flex flex-col items-center gap-1.5">
                  <div
                    className={`h-2 w-full rounded-full transition-all duration-300 ${
                      isActive
                        ? "bg-primary"
                        : isComplete
                          ? "bg-primary/50"
                          : "bg-muted"
                    }`}
                  />
                  <span className={`text-[10px] sm:text-xs font-medium transition-colors ${
                    isActive ? "text-primary" : isComplete ? "text-muted-foreground" : "text-muted-foreground/50"
                  }`}>
                    {label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Step 1 */}
          {step === 1 && (
            <Card className="animate-fade-up border-0 shadow-none">
              <CardHeader className="text-center pb-2 px-0">
                <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>About You & Your Business</CardTitle>
                <CardDescription>Tell us a bit about yourself and your company</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-4 px-0">
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
              </CardContent>
            </Card>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <Card className="animate-fade-up border-0 shadow-none">
              <CardHeader className="text-center pb-2 px-0">
                <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                  <Wrench className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Your Trade & Team</CardTitle>
                <CardDescription>Help us tailor Foreman to your business</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-4 px-0">
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
                  <div className="grid grid-cols-2 gap-3">
                    {businessSizes.map((size) => (
                      <button
                        key={size.value}
                        type="button"
                        onClick={() => updateData("businessSize", size.value)}
                        className={`p-4 rounded-lg border-2 text-left transition-all ${
                          data.businessSize === size.value
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <size.icon className={`h-5 w-5 mb-2 ${data.businessSize === size.value ? "text-primary" : "text-muted-foreground"}`} />
                        <p className="font-medium text-sm text-foreground">{size.label}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3 — Workflow Questions */}
          {step === 3 && (
            <Card className="animate-fade-up border-0 shadow-none">
              <CardHeader className="text-center pb-2 px-0">
                <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                  <Target className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>How Do You Work?</CardTitle>
                <CardDescription>We'll tailor Foreman to match your day-to-day</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-4 px-0">
                {/* Q1: Send quotes? */}
                <div className="space-y-3">
                  <Label>Do you send quotes to customers?</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: true, label: "Yes, regularly", icon: FileText },
                      { value: false, label: "No, I just invoice", icon: Receipt },
                    ].map((opt) => (
                      <button
                        key={String(opt.value)}
                        type="button"
                        onClick={() => setData(prev => ({ ...prev, sendsQuotes: opt.value }))}
                        className={`p-4 rounded-lg border-2 text-left transition-all ${
                          data.sendsQuotes === opt.value
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <opt.icon className={`h-5 w-5 mb-2 ${data.sendsQuotes === opt.value ? "text-primary" : "text-muted-foreground"}`} />
                        <p className="font-medium text-sm text-foreground">{opt.label}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Q2: Track jobs? */}
                <div className="space-y-3">
                  <Label>Do you track individual jobs or projects?</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: true, label: "Yes, I schedule work", icon: Briefcase },
                      { value: false, label: "No, I just do the work", icon: Wrench },
                    ].map((opt) => (
                      <button
                        key={String(opt.value)}
                        type="button"
                        onClick={() => setData(prev => ({ ...prev, tracksJobs: opt.value }))}
                        className={`p-4 rounded-lg border-2 text-left transition-all ${
                          data.tracksJobs === opt.value
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <opt.icon className={`h-5 w-5 mb-2 ${data.tracksJobs === opt.value ? "text-primary" : "text-muted-foreground"}`} />
                        <p className="font-medium text-sm text-foreground">{opt.label}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Q3: Priority */}
                <div className="space-y-3">
                  <Label>What do you need most right now?</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { value: "get_paid_faster", label: "Get paid faster", icon: Zap },
                      { value: "stay_organised", label: "Stay organised", icon: Briefcase },
                      { value: "reduce_admin", label: "Reduce admin", icon: Clock },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => updateData("priority", opt.value)}
                        className={`p-4 rounded-lg border-2 text-center transition-all ${
                          data.priority === opt.value
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <opt.icon className={`h-5 w-5 mx-auto mb-2 ${data.priority === opt.value ? "text-primary" : "text-muted-foreground"}`} />
                        <p className="font-medium text-sm text-foreground">{opt.label}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 4 — Preferences */}
          {step === 4 && (
            <Card className="animate-fade-up border-0 shadow-none">
              <CardHeader className="text-center pb-2 px-0">
                <div className="mx-auto h-12 w-12 rounded-full bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(160,100%,45%)] flex items-center justify-center mb-2">
                  <Sparkles className="h-6 w-6 text-primary-foreground" />
                </div>
                <CardTitle>You're All Set!</CardTitle>
                <CardDescription>Just a couple more preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-4 px-0">
                <div className="grid md:grid-cols-2 gap-4">
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
              </CardContent>
            </Card>
          )}

          {/* Step 5 — Comms */}
          {step === 5 && (
            <OnboardingCommsStep prefs={commsPrefs} onChange={setCommsPrefs} />
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6">
            <Button variant="ghost" onClick={handleBack} disabled={step === 1} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            {step < totalSteps ? (
              <Button onClick={handleNext} disabled={!canProceed()} className="gap-2">
                Continue
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleComplete} disabled={submitting} className="gap-2">
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
