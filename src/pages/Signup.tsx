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
import { Separator } from "@/components/ui/separator";
import { Gift, CheckCircle2, CreditCard, Clock, Shield } from "lucide-react";
import { track } from "@/utils/analytics";
import { useIsMobile } from "@/hooks/use-mobile";

const TRUST_POINTS = [
  { icon: CreditCard, text: "No credit card required" },
  { icon: Clock, text: "7-day full Pro trial" },
  { icon: Shield, text: "Cancel anytime, no lock-in" },
  { icon: CheckCircle2, text: "Set up in under 5 minutes" },
];

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { signUp, signInWithGoogle, user, loading } = useAuth();
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

    const { error } = await signUp(email, password, fullName);

    if (error) {
      toast.error(error.message);
      setSubmitting(false);
    } else {
      track("signup_completed", { method: "email" });
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

  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    track("signup_started", { method: "google" });
    const { error } = await signInWithGoogle();
    if (error) {
      toast.error(error.message);
      setGoogleLoading(false);
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
                Start running your business with Foreman.
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
              <img src={foremanLogo} alt="Foreman" className="h-14 w-14 rounded-xl" />
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
          <CardContent className="space-y-4">
            <Button 
              type="button" 
              variant="outline" 
              className="w-full gap-2" 
              onClick={handleGoogleSignIn}
              disabled={loading}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continue with Google
            </Button>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>
          </CardContent>
          
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4 pt-0">
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
