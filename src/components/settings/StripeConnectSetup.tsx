import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Building2, ExternalLink, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useIsNative } from "@/hooks/useIsNative";

interface ConnectStatus {
  connected: boolean;
  onboarding_complete: boolean;
  charges_enabled?: boolean;
  payouts_enabled?: boolean;
  details_submitted?: boolean;
}

export function StripeConnectSetup() {
  const [status, setStatus] = useState<ConnectStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const isNative = useIsNative();

  // Hide payment setup entirely on native (Apple policy)
  if (isNative) return null;

  const fetchStatus = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("stripe-connect", {
        body: { action: "status" },
      });
      if (error) throw error;
      setStatus(data);
    } catch (err) {
      console.error("Failed to fetch Connect status:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleOnboard = async () => {
    setActionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-connect", {
        body: { action: "onboard" },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to start onboarding");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDashboard = async () => {
    setActionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-connect", {
        body: { action: "dashboard" },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to open dashboard");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Online Payments</CardTitle>
              <CardDescription>
                Accept card, Apple Pay & Google Pay from your customers
              </CardDescription>
            </div>
          </div>
          {status?.onboarding_complete && (
            <Badge variant="outline" className="gap-1 text-primary border-primary/30">
              <CheckCircle2 className="h-3 w-3" />
              Active
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!status?.connected && (
          <>
            <p className="text-sm text-muted-foreground">
              Connect your bank account to receive payments directly when customers pay invoices online.
              Foreman charges a small 2.9% platform fee per transaction.
            </p>
            <Button onClick={handleOnboard} disabled={actionLoading} className="gap-2">
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Building2 className="h-4 w-4" />}
              Connect Bank Account
            </Button>
          </>
        )}

        {status?.connected && !status?.onboarding_complete && (
          <>
            <div className="rounded-lg border border-border bg-muted/50 p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-foreground text-sm">Setup incomplete</p>
                <p className="text-sm text-muted-foreground">
                  You still need to finish verifying your account to receive payments.
                </p>
              </div>
            </div>
            <Button onClick={handleOnboard} disabled={actionLoading} className="gap-2">
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Continue Setup
            </Button>
          </>
        )}

        {status?.connected && status?.onboarding_complete && (
          <>
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <p className="font-medium text-foreground text-sm">Payments active</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Your customers can now pay invoices online. Funds are deposited directly to your bank account after a 2.9% platform fee.
              </p>
            </div>
            <Button variant="outline" onClick={handleDashboard} disabled={actionLoading} className="gap-2">
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
              View Payouts Dashboard
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
