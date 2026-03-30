import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import { useSubscription } from "@/hooks/useSubscription";
import { useIsNative, openExternalUrl } from "@/hooks/useIsNative";

const WEB_BILLING_URL = "https://foreman.ie/settings?tab=team-billing";

export function TrialCountdownPopup() {
  const navigate = useNavigate();
  const { teamSubscription, trialDaysRemaining, isTrialExpired } = useSubscriptionTier();
  const { data: subscriptionV2 } = useSubscription();
  const isNative = useIsNative();
  const [open, setOpen] = useState(false);

  const hasActiveSub = subscriptionV2?.status === "active";
  const isOnTrial = teamSubscription?.is_trial && !isTrialExpired && !hasActiveSub;
  const shouldShow = isOnTrial && trialDaysRemaining <= 5;

  useEffect(() => {
    if (!shouldShow) return;
    const key = `trial_popup_dismissed_${new Date().toISOString().slice(0, 10)}`;
    if (!localStorage.getItem(key)) {
      setOpen(true);
    }
  }, [shouldShow]);

  const handleDismiss = () => {
    const key = `trial_popup_dismissed_${new Date().toISOString().slice(0, 10)}`;
    localStorage.setItem(key, "1");
    setOpen(false);
  };

  const handleSubscribe = () => {
    handleDismiss();
    if (isNative) {
      openExternalUrl(WEB_BILLING_URL);
    } else {
      navigate("/select-plan");
    }
  };

  const handleManage = () => {
    handleDismiss();
    if (isNative) {
      openExternalUrl(WEB_BILLING_URL);
    } else {
      navigate("/settings?tab=billing");
    }
  };

  if (!shouldShow) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleDismiss()}>
      <DialogContent className="max-w-sm">
        <DialogHeader className="text-center items-center">
          <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10 border-2 border-amber-500/30">
            <span className="text-2xl font-bold text-amber-600">{trialDaysRemaining}</span>
          </div>
          <DialogTitle className="text-xl">
            {trialDaysRemaining === 1 ? "1 day" : `${trialDaysRemaining} days`} left on your trial
          </DialogTitle>
          <DialogDescription>
            Subscribe now to keep full access to Foreman. Cancel anytime — you won't be charged until your trial ends.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 mt-2">
          <Button onClick={handleSubscribe} className="w-full gap-2">
            <Clock className="h-4 w-4" />
            Subscribe Now
          </Button>
          <Button variant="ghost" size="sm" onClick={handleManage} className="text-muted-foreground">
            Manage Subscription
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
