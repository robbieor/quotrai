import { AlertTriangle, Clock, Lock } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import { useSubscription } from "@/hooks/useSubscription";

export function TrialBanner() {
  const navigate = useNavigate();
  const { teamSubscription, trialDaysRemaining, isTrialExpired } = useSubscriptionTier();
  const { data: subscriptionV2 } = useSubscription();

  // If user has an active subscription in v2, never show trial banner
  const hasActiveSub = subscriptionV2?.status === "active";
  if (hasActiveSub) return null;

  // If team is not on trial, don't show
  if (!teamSubscription?.is_trial) return null;

  // Check v2 subscription too — if it's also expired, show read-only banner
  const v2Expired = subscriptionV2?.status === "expired";
  const isExpired = isTrialExpired || v2Expired;

  if (isExpired) {
    return (
      <Alert variant="destructive" className="rounded-none border-x-0 border-t-0">
        <Lock className="h-4 w-4" />
        <AlertTitle>Trial ended — account is read-only</AlertTitle>
        <AlertDescription className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <span>Subscribe to unlock full access to your data and features.</span>
          <Button 
            size="sm" 
            onClick={() => navigate("/settings?tab=billing")}
          >
            Subscribe Now
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
          <span>Your trial ends in {trialDaysRemaining} day{trialDaysRemaining !== 1 ? 's' : ''}. Subscribe to continue.</span>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => navigate("/settings?tab=billing")}
          >
            Subscribe Now
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
