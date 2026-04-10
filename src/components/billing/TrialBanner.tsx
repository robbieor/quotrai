import { useState } from "react";
import { AlertTriangle, Clock, Lock, ExternalLink, X } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import { useSubscription } from "@/hooks/useSubscription";
import { useIsNative, openExternalUrl } from "@/hooks/useIsNative";

const WEB_BILLING_URL = "https://foreman.ie/settings?tab=team-billing";

export function TrialBanner() {
  const navigate = useNavigate();
  const { teamSubscription, trialDaysRemaining, isTrialExpired } = useSubscriptionTier();
  const { data: subscriptionV2 } = useSubscription();
  const isNative = useIsNative();
  const [dismissed, setDismissed] = useState(() => {
    const key = `trial_banner_dismissed_${new Date().toISOString().slice(0, 10)}`;
    return !!localStorage.getItem(key);
  });

  // If user has an active subscription in v2, never show trial banner
  const hasActiveSub = subscriptionV2?.status === "active";
  if (hasActiveSub) return null;

  // If team is not on trial, don't show
  if (!teamSubscription?.is_trial) return null;

  // Check v2 subscription too — if it's also expired, show read-only banner
  const v2Expired = subscriptionV2?.status === "expired";
  const isExpired = isTrialExpired || v2Expired;

  const handleCta = () => {
    if (isNative) {
      openExternalUrl(WEB_BILLING_URL);
    } else {
      navigate("/settings?tab=team-billing");
    }
  };

  const handleDismiss = () => {
    const key = `trial_banner_dismissed_${new Date().toISOString().slice(0, 10)}`;
    localStorage.setItem(key, "1");
    setDismissed(true);
  };

  // Never allow dismissing the expired banner
  if (isExpired) {
    return (
      <Alert variant="destructive" className="rounded-none border-x-0 border-t-0">
        <Lock className="h-4 w-4" />
        <AlertTitle>Trial ended — account is read-only</AlertTitle>
        <AlertDescription className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <span>
            {isNative
              ? "Subscribe at foreman.ie to unlock full access."
              : "Subscribe to unlock full access to your data and features."}
          </span>
          <Button size="sm" onClick={handleCta} className="gap-1.5">
            {isNative && <ExternalLink className="h-3.5 w-3.5" />}
            {isNative ? "Open foreman.ie" : "Subscribe Now"}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (dismissed) return null;

  const isUrgent = trialDaysRemaining <= 3;

  return (
    <Alert className={`rounded-none border-x-0 border-t-0 relative ${
      isUrgent
        ? "border-amber-500/50 bg-amber-500/10"
        : "border-border bg-muted/30"
    }`}>
      <Clock className={`h-4 w-4 ${isUrgent ? "text-amber-600" : "text-muted-foreground"}`} />
      <AlertTitle className={isUrgent ? "text-amber-700 dark:text-amber-400" : ""}>
        {isUrgent ? "Trial ending soon" : "Free trial active"}
      </AlertTitle>
      <AlertDescription className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <span>
          {trialDaysRemaining} day{trialDaysRemaining !== 1 ? "s" : ""} remaining on your trial.{" "}
          {isNative ? "Visit foreman.ie to subscribe." : "Subscribe to keep full access."}
        </span>
        <div className="flex items-center gap-2">
          <Button size="sm" variant={isUrgent ? "default" : "outline"} onClick={handleCta} className="gap-1.5">
            {isNative && <ExternalLink className="h-3.5 w-3.5" />}
            {isNative ? "Open foreman.ie" : "Subscribe Now"}
          </Button>
        </div>
      </AlertDescription>
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </Alert>
  );
}
