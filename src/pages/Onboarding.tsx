import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
} from "lucide-react";
import quotrLogo from "@/assets/quotr-logo.png";
import { COUNTRIES } from "@/constants/countries";
import { track } from "@/utils/analytics";
import { FirstQuoteWizard } from "@/components/onboarding/FirstQuoteWizard";

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
  "Other"
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
}

export default function Onboarding() {
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
  });
  const { user } = useAuth();
  const navigate = useNavigate();

  const totalSteps = 4;

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
      // Update profile with onboarding data
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
          onboarding_completed: true,
        })
        .eq("id", user.id);

      if (profileError) throw profileError;

      // Update team name if we have access
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
      }

      track("onboarding_completed", { trade: data.tradeType, size: data.businessSize });
      toast.success("Welcome to Quotr! Let's create your first quote.");
      setStep(4); // Move to first-quote wizard
    } catch (error: any) {
      console.error("Onboarding error:", error);
      toast.error("Failed to save your preferences. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const stepLabels = ["Profile", "Trade", "Preferences", "First Quote"];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img src={quotrLogo} alt="Quotr" className="h-14 w-14 rounded-xl" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {step === 1 && "Welcome to Quotr!"}
            {step === 2 && "Tell us about your trade"}
            {step === 3 && "Almost there!"}
            {step === 4 && "Create your first quote"}
          </h1>
          <p className="text-muted-foreground">
            {step === 1 && "Let's get your account set up in under 2 minutes"}
            {step === 2 && "We'll tailor your experience to your business"}
            {step === 3 && "Just a couple more preferences, then you're ready"}
            {step === 4 && "See how easy quoting is — we've pre-filled it for you"}
          </p>
        </div>

        {/* Labelled progress indicator */}
        <div className="flex items-center justify-between gap-1 mb-8 px-2">
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

        {/* Step 1: Personal & Company Info */}
        {step === 1 && (
          <Card className="animate-fade-up">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>About You & Your Business</CardTitle>
              <CardDescription>
                Tell us a bit about yourself and your company
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Your Name *</Label>
                <Input
                  id="fullName"
                  placeholder="John Smith"
                  value={data.fullName}
                  onChange={(e) => updateData("fullName", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name *</Label>
                <Input
                  id="companyName"
                  placeholder="Smith Electrical Services"
                  value={data.companyName}
                  onChange={(e) => updateData("companyName", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number (Optional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+44 7700 900000"
                  value={data.phone}
                  onChange={(e) => updateData("phone", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Trade & Team Size */}
        {step === 2 && (
          <Card className="animate-fade-up">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <Wrench className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Your Trade & Team</CardTitle>
              <CardDescription>
                Help us tailor Quotr to your business
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-4">
              <div className="space-y-2">
                <Label>What's your trade? *</Label>
                <Select value={data.tradeType} onValueChange={(v) => updateData("tradeType", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your trade" />
                  </SelectTrigger>
                  <SelectContent>
                    {tradeTypes.map((trade) => (
                      <SelectItem key={trade} value={trade}>
                        {trade}
                      </SelectItem>
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
                      <size.icon className={`h-5 w-5 mb-2 ${
                        data.businessSize === size.value ? "text-primary" : "text-muted-foreground"
                      }`} />
                      <p className="font-medium text-sm text-foreground">{size.label}</p>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Preferences & Finish */}
        {step === 3 && (
          <Card className="animate-fade-up">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto h-12 w-12 rounded-full bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(160,100%,45%)] flex items-center justify-center mb-2">
                <Sparkles className="h-6 w-6 text-primary-foreground" />
              </div>
              <CardTitle>You're All Set!</CardTitle>
              <CardDescription>
                Just a couple more preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-4">
              <div className="space-y-2">
                <Label>Country</Label>
                <Select value={data.country} onValueChange={(v) => updateData("country", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your country" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((country) => (
                      <SelectItem key={country.code} value={country.code}>
                        {country.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Preferred Currency</Label>
                <Select value={data.currency} onValueChange={(v) => updateData("currency", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EUR">€ Euro (EUR)</SelectItem>
                    <SelectItem value="GBP">£ British Pound (GBP)</SelectItem>
                    <SelectItem value="USD">$ US Dollar (USD)</SelectItem>
                    <SelectItem value="AUD">$ Australian Dollar (AUD)</SelectItem>
                    <SelectItem value="CAD">$ Canadian Dollar (CAD)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span>You can update these settings anytime</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: First Quote Wizard */}
        {step === 4 && (
          <FirstQuoteWizard
            tradeType={data.tradeType}
            onBack={() => setStep(3)}
          />
        )}

        {/* Navigation buttons (steps 1-3 only, step 4 has its own) */}
        {step <= 3 && (
        <div className="flex items-center justify-between mt-6">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={step === 1}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          
          {step < 3 ? (
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              className="gap-2"
            >
              Continue
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleComplete}
              disabled={submitting}
              className="gap-2"
            >
              {submitting ? "Setting up..." : "Continue"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
        )}
      </div>
    </div>
  );
}
