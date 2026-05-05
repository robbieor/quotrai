import { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import foremanLogo from "@/assets/foreman-logo.png";
import { Mail, CheckCircle2 } from "lucide-react";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email") || "";
  const [resending, setResending] = useState(false);

  const handleResend = async () => {
    if (!email) {
      toast.error("No email address found. Please sign up again.");
      return;
    }
    setResending(true);
    const { error } = await supabase.auth.resend({ type: "signup", email });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Verification email resent — check your inbox.");
    }
    setResending(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="space-y-4">
          <div className="flex justify-center">
            <img src={foremanLogo} alt="revamo" className="h-14 w-14 rounded-xl" />
          </div>
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Mail className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Check your inbox</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">
            We've sent a verification email to{" "}
            {email ? <strong className="text-foreground">{email}</strong> : "your email address"}.
            Click the link in the email to verify your account and get started.
          </p>

          <div className="flex items-start gap-2 text-left bg-muted/50 rounded-lg p-3">
            <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              Can't find it? It usually arrives within a minute — also check your spam or junk folder.
            </p>
          </div>

          <div className="flex items-start gap-2 text-left bg-muted/50 rounded-lg p-3">
            <Mail className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              Already have a revamo account with this email? <Link to="/login" className="text-primary hover:underline">Sign in</Link> instead — no new verification email is sent for existing accounts.
            </p>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={handleResend}
            disabled={resending}
          >
            {resending ? "Resending…" : "Resend verification email"}
          </Button>

          <p className="text-sm text-muted-foreground">
            Already verified?{" "}
            <Link to="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
