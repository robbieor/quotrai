import { useNavigate } from "react-router-dom";
import { ShieldAlert, AlertTriangle, ArrowRight, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useReadOnlyState } from "@/hooks/useReadOnly";
import { useIsNative, openExternalUrl } from "@/hooks/useIsNative";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
import { format } from "date-fns";

const WEB_BILLING_URL = "https://foreman.ie/select-plan";

async function openCustomerPortal(): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke(
      "create-customer-portal-session",
      {},
    );
    if (error) throw error;
    if (data?.url) {
      window.location.href = data.url;
      return true;
    }
    throw new Error("No portal URL returned");
  } catch (e) {
    toast.error("Could not open billing portal. Please try again.");
    return false;
  }
}

export function ReadOnlyBanner() {
  const navigate = useNavigate();
  const { reason, graceEndsAt, isReadOnly } = useReadOnlyState();
  const isNative = useIsNative();
  const [busy, setBusy] = useState(false);

  // Show banner during grace period too, even though not yet read-only.
  if (!reason) return null;

  const handleChoosePlan = () => {
    if (isNative) openExternalUrl(WEB_BILLING_URL);
    else navigate("/select-plan");
  };

  const handleUpdatePayment = async () => {
    setBusy(true);
    const ok = await openCustomerPortal();
    if (!ok) setBusy(false);
  };

  // Variant: amber warning during grace
  if (reason === "past_due_grace") {
    const deadline = graceEndsAt ? format(graceEndsAt, "MMM d, h:mm a") : "soon";
    return (
      <div className="w-full bg-amber-500 text-amber-950 px-4 py-3 flex flex-col sm:flex-row items-center justify-center gap-2 text-sm font-medium z-30">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            Payment failed. Update your card before <strong>{deadline}</strong> to avoid losing access.
          </span>
        </div>
        <Button
          size="sm"
          variant="secondary"
          className="gap-1 shrink-0"
          onClick={handleUpdatePayment}
          disabled={busy}
        >
          <CreditCard className="h-3 w-3" /> Update Payment
        </Button>
      </div>
    );
  }

  // From here on, the user is read-only. Pick copy + CTA per reason.
  let message: string;
  let ctaLabel: string;
  let ctaIcon = <ArrowRight className="h-3 w-3" />;
  let onCta: () => void = handleChoosePlan;

  if (reason === "unpaid") {
    message = "Your subscription is unpaid. Update your card to restore access.";
    ctaLabel = "Update Payment";
    ctaIcon = <CreditCard className="h-3 w-3" />;
    onCta = handleUpdatePayment;
  } else if (reason === "canceled") {
    message = "Your subscription has ended. Resubscribe to regain full access.";
    ctaLabel = "Choose Plan";
  } else {
    // trial_expired
    message = "Your trial has ended. Your data is safe — subscribe to regain full access.";
    ctaLabel = "Choose Plan";
  }

  if (!isReadOnly) return null;

  return (
    <div className="w-full bg-destructive text-destructive-foreground px-4 py-3 flex flex-col sm:flex-row items-center justify-center gap-2 text-sm font-medium z-30">
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-4 w-4 shrink-0" />
        <span>{message}</span>
      </div>
      <Button
        size="sm"
        variant="secondary"
        className="gap-1 shrink-0"
        onClick={onCta}
        disabled={busy}
      >
        {ctaLabel} {ctaIcon}
      </Button>
    </div>
  );
}
