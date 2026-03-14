import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAcceptInvitation } from "@/hooks/useTeam";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle, Users } from "lucide-react";

export default function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  const { user, loading: authLoading } = useAuth();
  const acceptInvitation = useAcceptInvitation();
  const [status, setStatus] = useState<"loading" | "success" | "error" | "auth-required">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (authLoading) return;

    if (!token) {
      setStatus("error");
      setMessage("Invalid invitation link");
      return;
    }

    if (!user) {
      setStatus("auth-required");
      return;
    }

    // Accept the invitation
    acceptInvitation.mutate(token, {
      onSuccess: (data) => {
        setStatus("success");
        setMessage(data.message || "Successfully joined the team!");
      },
      onError: (error) => {
        setStatus("error");
        setMessage(error.message);
      },
    });
  }, [token, user, authLoading]);

  const handleLogin = () => {
    // Store the token in sessionStorage to use after login
    if (token) {
      sessionStorage.setItem("pending_invite_token", token);
    }
    navigate("/login");
  };

  const handleSignup = () => {
    if (token) {
      sessionStorage.setItem("pending_invite_token", token);
    }
    navigate("/signup");
  };

  const handleGoToDashboard = () => {
    navigate("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Users className="h-8 w-8 text-primary" />
          </div>
          <CardTitle>Team Invitation</CardTitle>
          <CardDescription>
            {status === "loading" && "Processing your invitation..."}
            {status === "auth-required" && "Sign in to accept this invitation"}
            {status === "success" && "Welcome to the team!"}
            {status === "error" && "Unable to process invitation"}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {status === "loading" && (
            <div className="flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {status === "auth-required" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Please sign in or create an account to accept this team invitation.
              </p>
              <div className="flex flex-col gap-2">
                <Button onClick={handleLogin} className="w-full">
                  Sign In
                </Button>
                <Button onClick={handleSignup} variant="outline" className="w-full">
                  Create Account
                </Button>
              </div>
            </div>
          )}

          {status === "success" && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <CheckCircle className="h-12 w-12 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">{message}</p>
              <Button onClick={handleGoToDashboard} className="w-full">
                Go to Dashboard
              </Button>
            </div>
          )}

          {status === "error" && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <XCircle className="h-12 w-12 text-destructive" />
              </div>
              <p className="text-sm text-muted-foreground">{message}</p>
              <Button onClick={handleGoToDashboard} variant="outline" className="w-full">
                Go to Dashboard
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
