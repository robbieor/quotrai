import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { X, CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function StripeConnectNudge() {
  const { profile } = useProfile();
  const [status, setStatus] = useState<{ connected: boolean; onboarding_complete: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const dismissKey = profile?.team_id ? `connect_nudge_dismissed_${profile.team_id}` : null;

  useEffect(() => {
    if (dismissKey && localStorage.getItem(dismissKey)) {
      setDismissed(true);
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("stripe-connect", {
          body: { action: "status" },
        });
        if (error) throw error;
        setStatus(data);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    })();
  }, [dismissKey]);

  if (loading || dismissed || !status || status.onboarding_complete) return null;

  const handleConnect = async () => {
    setActionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-connect", {
        body: { action: "onboard" },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err: any) {
      toast.error(err.message || "Failed to start setup");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    if (dismissKey) localStorage.setItem(dismissKey, "1");
  };

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 flex items-start gap-3 relative">
      <CreditCard className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground text-sm">Get paid online — accept card, Apple Pay & Google Pay</p>
        <p className="text-sm text-muted-foreground mt-0.5">
          Connect your bank account so customers can pay invoices instantly. Funds go directly to you.
        </p>
        <Button size="sm" onClick={handleConnect} disabled={actionLoading} className="mt-2 gap-1.5">
          {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CreditCard className="h-3.5 w-3.5" />}
          Connect Bank Account
        </Button>
      </div>
      <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground p-1 -mr-1 -mt-1 shrink-0">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
