import { AlertTriangle, Clock, Lock, ExternalLink } from "lucide-react";
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
      navigate("/settings?tab=billing");
    }
  };

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

  if (trialDaysRemaining <= 3) {
    return (
      <Alert className="rounded-none border-x-0 border-t-0 border-amber-500/50 bg-amber-500/10">
        <Clock className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-700 dark:text-amber-400">Trial ending soon</AlertTitle>
        <AlertDescription className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <span>
            Your trial ends in {trialDaysRemaining} day{trialDaysRemaining !== 1 ? "s" : ""}.{" "}
            {isNative ? "Visit foreman.ie to subscribe." : "Subscribe to continue."}
          </span>
          <Button size="sm" variant="outline" onClick={handleCta} className="gap-1.5">
            {isNative && <ExternalLink className="h-3.5 w-3.5" />}
            {isNative ? "Open foreman.ie" : "Subscribe Now"}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
