import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle, MailX } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

type Status = "loading" | "valid" | "already" | "invalid" | "success" | "error";

export default function Unsubscribe() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<Status>("loading");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      return;
    }

    (async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          { headers: { apikey: SUPABASE_ANON_KEY } }
        );
        const data = await res.json();
        if (!res.ok) {
          setStatus("invalid");
          return;
        }
        if (data.valid === false && data.reason === "already_unsubscribed") {
          setStatus("already");
          return;
        }
        if (data.valid) {
          setStatus("valid");
          return;
        }
        setStatus("invalid");
      } catch {
        setStatus("error");
      }
    })();
  }, [token]);

  const handleConfirm = async () => {
    if (!token) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", {
        body: { token },
      });
      if (error) {
        setStatus("error");
        return;
      }
      if (data?.success) {
        setStatus("success");
      } else if (data?.reason === "already_unsubscribed") {
        setStatus("already");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <MailX className="h-8 w-8 text-primary" />
          </div>
          <CardTitle>Email preferences</CardTitle>
          <CardDescription>
            {status === "loading" && "Checking your unsubscribe link..."}
            {status === "valid" && "Confirm to stop receiving these emails"}
            {status === "success" && "You're unsubscribed"}
            {status === "already" && "Already unsubscribed"}
            {status === "invalid" && "Invalid or expired link"}
            {status === "error" && "Something went wrong"}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {status === "loading" && (
            <div className="flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {status === "valid" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                You'll be removed from future emails of this type. You can still
                receive critical account messages.
              </p>
              <Button onClick={handleConfirm} disabled={submitting} className="w-full">
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Confirm unsubscribe"
                )}
              </Button>
            </div>
          )}

          {status === "success" && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <CheckCircle className="h-12 w-12 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">
                You won't receive these emails anymore. Sorry to see you go.
              </p>
            </div>
          )}

          {status === "already" && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <CheckCircle className="h-12 w-12 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">
                This email address is already unsubscribed.
              </p>
            </div>
          )}

          {(status === "invalid" || status === "error") && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <XCircle className="h-12 w-12 text-destructive" />
              </div>
              <p className="text-sm text-muted-foreground">
                {status === "invalid"
                  ? "This unsubscribe link is invalid or has expired."
                  : "We couldn't process your request. Please try again later."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
