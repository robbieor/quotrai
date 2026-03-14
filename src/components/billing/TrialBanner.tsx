import { AlertTriangle, Clock } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";

export function TrialBanner() {
  const navigate = useNavigate();
  const { teamSubscription, trialDaysRemaining, isTrialExpired } = useSubscriptionTier();

  if (!teamSubscription?.is_trial) return null;

  if (isTrialExpired) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Your trial has ended</AlertTitle>
        <AlertDescription className="flex items-center justify-between">
          <span>Add a payment method to continue using Quotr.</span>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => navigate("/settings?tab=billing")}
          >
            Add Payment Method
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (trialDaysRemaining <= 3) {
    return (
      <Alert className="border-amber-500/50 bg-amber-500/10">
        <Clock className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-700 dark:text-amber-400">Trial ending soon</AlertTitle>
        <AlertDescription className="flex items-center justify-between">
          <span>Your trial ends in {trialDaysRemaining} day{trialDaysRemaining !== 1 ? 's' : ''}. Add a payment method to continue.</span>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => navigate("/settings?tab=billing")}
          >
            Add Payment Method
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
