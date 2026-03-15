import { useSubscriptionTier } from "./useSubscriptionTier";
import { useSubscription } from "./useSubscription";

/**
 * Returns true if the account is in read-only mode (trial expired, no active subscription).
 * Use this to disable create/update/delete actions across the app.
 */
export function useReadOnly(): boolean {
  const { teamSubscription, isTrialExpired } = useSubscriptionTier();
  const { data: subscriptionV2 } = useSubscription();

  // Active subscription = not read-only
  if (subscriptionV2?.status === "active") return false;
  
  // Trialing in v2 and not expired = not read-only
  if (subscriptionV2?.status === "trialing" && subscriptionV2.trial_ends_at) {
    const trialEnd = new Date(subscriptionV2.trial_ends_at);
    if (trialEnd > new Date()) return false;
  }

  // Legacy check: team is on trial and not expired
  if (teamSubscription?.is_trial && !isTrialExpired) return false;

  // If we have no subscription data at all, don't lock (loading state)
  if (!teamSubscription && !subscriptionV2) return false;

  // Trial expired or subscription expired/cancelled = read-only
  const v2Expired = subscriptionV2?.status === "expired";
  if (isTrialExpired || v2Expired) return true;

  // Has some subscription but not active/trialing = read-only
  if (subscriptionV2 && !["active", "trialing"].includes(subscriptionV2.status)) return true;

  return false;
}
