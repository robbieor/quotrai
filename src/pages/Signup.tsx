import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import foremanLogo from "@/assets/foreman-logo.png";
import { Gift, CheckCircle2, CreditCard, Clock, Shield } from "lucide-react";
import { track } from "@/utils/analytics";
import { useIsMobile } from "@/hooks/use-mobile";

const TRUST_POINTS = [
  { icon: CreditCard, text: "No credit card required" },
  { icon: Clock, text: "14-day full Pro trial" },
  { icon: Shield, text: "Cancel anytime, no lock-in" },
  { icon: CheckCircle2, text: "Set up in under 5 minutes" },
];

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { signUp, user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const refCode = searchParams.get("ref");

  // Redirect if already authenticated
  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard");
    }
  }, [user, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    // Store referral code in localStorage so onboarding can pick it up
    if (refCode) {
      localStorage.setItem("foreman_ref_code", refCode);
    }

    // Pre-flight: redirect existing users to login instead of pretending to send
    // a verification email. Fails open — any error continues the normal signup flow.
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: existsData } = await supabase.functions.invoke("check-email-exists", {
        body: { email },
      });
      if (existsData?.exists === true) {
        toast.info("An account with this email already exists. Sign in below.");
        setSubmitting(false);
        navigate(`/login?email=${encodeURIComponent(email)}&existing=1`);
        return;
      }
    } catch {
      // Fail open: proceed with signup if the check breaks
    }

    // Fire-and-forget abuse-pattern check (notify-only, never blocks)
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      supabase.functions.invoke("check-suspicious-signup", {
        body: { email, fullName },
      }).catch(() => {});
    } catch {}

    const { error } = await signUp(email, password, fullName);

    if (error) {
      toast.error(error.message);
      setSubmitting(false);
    } else {
      track("signup_completed", { method: "email" });

      // Fire-and-forget admin notification (signup attempt — pre-verification)
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "signup-attempt-notification",
            idempotencyKey: `signup-attempt-${email}-${Date.now()}`,
            templateData: {
              email,
              fullName,
              timestamp: new Date().toISOString(),
              metadata: {
                ref_code: refCode || null,
                user_agent: navigator.userAgent,
                referrer: document.referrer || null,
                url: window.location.href,
              },
            },
          },
        }).catch(() => {});
      } catch {
        // never block signup on notification failure
      }

      toast.success("Account created! Check your email to verify.");
      // Check for pending team invite
      const pendingToken = sessionStorage.getItem("pending_invite_token");
      if (pendingToken) {
        sessionStorage.removeItem("pending_invite_token");
        navigate(`/accept-invite?token=${pendingToken}`);
      } else {
        navigate(`/verify-email?email=${encodeURIComponent(email)}`);
      }
    }
  };

  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-4xl flex flex-col lg:flex-row gap-8 items-center lg:items-start justify-center">
        {/* Trust signals panel — hidden on mobile, shown as sidebar on desktop */}
        {!isMobile && (
          <div className="w-full max-w-xs space-y-6 pt-8">
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-1">Start your free trial</h2>
              <p className="text-sm text-muted-foreground">
                Start running your business with revamo.
              </p>
            </div>
            <ul className="space-y-3">
              {TRUST_POINTS.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-2.5 text-sm text-foreground">
                  <Icon className="h-4 w-4 text-primary shrink-0" />
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Signup card */}
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <img src={foremanLogo} alt="revamo" className="h-14 w-14 rounded-xl" />
            </div>
            <CardTitle className="text-2xl">Create an account</CardTitle>
            <CardDescription>Start managing your trade business</CardDescription>
            {refCode && (
              <Badge variant="secondary" className="mx-auto mt-2 gap-1.5">
                <Gift className="h-3.5 w-3.5" />
                Referred — you'll both get 1 month free!
              </Badge>
            )}
            {/* Mobile-only trust chips */}
            {isMobile && (
              <div className="flex flex-wrap justify-center gap-2 mt-3">
                {TRUST_POINTS.slice(0, 2).map(({ icon: Icon, text }) => (
                  <Badge key={text} variant="outline" className="gap-1 text-xs font-normal">
                    <Icon className="h-3 w-3" />
                    {text}
                  </Badge>
                ))}
              </div>
            )}
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input id="fullName" type="text" placeholder="John Smith" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
                <p className="text-xs text-muted-foreground">Minimum 6 characters</p>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" disabled={submitting || loading}>
                {submitting ? "Creating account..." : "Start Free Trial"}
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                Already have an account?{" "}
                <Link to="/login" className="text-primary hover:underline">Sign in</Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
