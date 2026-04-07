import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Lock, CheckCircle2, Loader2 } from "lucide-react";
import foremanLogo from "@/assets/foreman-logo.png";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [ready, setReady] = useState(false);
  const readyRef = useRef(false);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        readyRef.current = true;
        setReady(true);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        readyRef.current = true;
        setReady(true);
      }
    });

    const timeout = setTimeout(() => {
      if (!readyRef.current) {
        toast.error("Invalid or expired reset link. Please request a new one.");
        navigate("/forgot-password");
      }
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setSubmitting(true);

    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      toast.error(error.message);
      setSubmitting(false);
    } else {
      setSuccess(true);
      toast.success("Password updated successfully!");
      setTimeout(() => {
        navigate("/dashboard");
      }, 2000);
    }
  };

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a] px-4">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-[#00E6A0]" />
          <p className="text-white/60 text-sm">Verifying reset link...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a] px-4">
        <Card className="w-full max-w-md text-center border-white/10 bg-white/5 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-[#00E6A0] to-[#00b37d] flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-[#0f172a]" />
              </div>
            </div>
            <CardTitle className="text-2xl text-white">Password Updated!</CardTitle>
            <CardDescription className="text-base mt-2 text-white/60">
              Your password has been successfully reset
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-white/40">
              Redirecting you to the dashboard...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f172a] px-4">
      <Card className="w-full max-w-md border-white/10 bg-white/5 backdrop-blur-sm">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img src={foremanLogo} alt="Foreman" className="h-14 w-14 rounded-xl" />
          </div>
          <CardTitle className="text-2xl text-white">Set new password</CardTitle>
          <CardDescription className="text-white/60">
            Enter your new password below
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-white/80">New Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-[#00E6A0]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-white/80">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-[#00E6A0]"
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              className="w-full gap-2 bg-[#00E6A0] text-[#0f172a] hover:bg-[#00cc8e] font-semibold"
              disabled={submitting}
            >
              <Lock className="h-4 w-4" />
              {submitting ? "Updating..." : "Update Password"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
