import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle2, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

const ACTIVE_STATUSES = new Set(["active", "trialing", "past_due"]);

export default function SubscriptionConfirmed() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const seats = params.get("seats") || "1";
  const interval = params.get("interval") || "month";
  const sessionId = params.get("session_id");

  const [status, setStatus] = useState<"syncing" | "active" | "pending">("syncing");

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 6; // ~12s of polling as a final safety net
    const pollMs = 2000;
    let reconcileTried = false;

    const checkSub = async () => {
      const { data: orgId } = await supabase.rpc("get_user_org_id_v2");
      if (!orgId) return null;
      const { data: sub } = await supabase
        .from("subscriptions_v2")
        .select("status, stripe_subscription_id")
        .eq("org_id", orgId)
        .maybeSingle();
      return sub;
    };

    const tryReconcile = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("reconcile-subscription", {
          body: { sessionId },
        });
        if (error) throw error;
        console.log("[SubscriptionConfirmed] reconcile result", data);
        return !!data?.reconciled;
      } catch (e) {
        console.error("[SubscriptionConfirmed] reconcile failed", e);
        return false;
      }
    };

    const markActive = () => {
      setStatus("active");
      queryClient.invalidateQueries({ queryKey: ["subscription-v2"] });
      queryClient.invalidateQueries({ queryKey: ["teamSubscription"] });
      queryClient.invalidateQueries({ queryKey: ["seat-usage"] });
    };

    const run = async () => {
      // 1. Quick first check — webhook may have already fired before page loaded
      try {
        const sub = await checkSub();
        if (!cancelled && sub?.stripe_subscription_id && ACTIVE_STATUSES.has(sub.status)) {
          markActive();
          return;
        }
      } catch (e) {
        console.error("[SubscriptionConfirmed] initial check error", e);
      }

      // 2. If we have a session_id, trigger reconcile IMMEDIATELY rather than waiting
      //    for the webhook poll to time out. This is the fast path.
      if (sessionId && !cancelled) {
        reconcileTried = true;
        const ok = await tryReconcile();
        if (ok && !cancelled) {
          const sub = await checkSub();
          if (sub?.stripe_subscription_id && ACTIVE_STATUSES.has(sub.status)) {
            markActive();
            return;
          }
        }
      }

      // 3. Fall back to polling for the webhook
      while (!cancelled && attempts < maxAttempts) {
        attempts++;
        try {
          const sub = await checkSub();
          if (sub?.stripe_subscription_id && ACTIVE_STATUSES.has(sub.status)) {
            if (!cancelled) markActive();
            return;
          }
        } catch (e) {
          console.error("[SubscriptionConfirmed] poll error", e);
        }
        await new Promise((r) => setTimeout(r, pollMs));
      }

      // 4. Last-ditch reconcile if we hadn't tried yet (no session_id case)
      if (!cancelled && !reconcileTried) {
        const ok = await tryReconcile();
        if (ok && !cancelled) {
          const sub = await checkSub();
          if (sub?.stripe_subscription_id && ACTIVE_STATUSES.has(sub.status)) {
            markActive();
            return;
          }
        }
      }

      if (!cancelled) setStatus("pending");
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [queryClient, sessionId]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-8 text-center space-y-6">
          {status === "syncing" && (
            <>
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-foreground">Confirming your subscription…</h1>
                <p className="text-muted-foreground">
                  Payment received. We're activating your account — this usually takes a few seconds.
                </p>
              </div>
            </>
          )}

          {status === "active" && (
            <>
              <div className="mx-auto w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-foreground">You're all set!</h1>
                <p className="text-muted-foreground">
                  Your Foreman plan is now active{interval === "year" ? " (billed annually)" : ""}.
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50 text-sm text-muted-foreground space-y-1">
                <p>✓ Full access to every Foreman feature</p>
                <p>✓ {seats} {Number(seats) === 1 ? "seat" : "seats"} ready for your team</p>
                <p>✓ Manage billing anytime in Settings</p>
              </div>
              <Button size="lg" className="w-full gap-2" onClick={() => navigate("/dashboard")}>
                Go to Dashboard <ArrowRight className="h-4 w-4" />
              </Button>
            </>
          )}

          {status === "pending" && (
            <>
              <div className="mx-auto w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-amber-600" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-foreground">Almost there</h1>
                <p className="text-muted-foreground">
                  Your payment went through, but we're still finalising your subscription. This can take a minute. You'll receive a confirmation email shortly.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Button size="lg" className="w-full gap-2" onClick={() => navigate("/dashboard")}>
                  Continue to Dashboard <ArrowRight className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => window.location.reload()}>
                  Check again
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                If your subscription doesn't activate within a few minutes, contact support@foreman.ie.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
