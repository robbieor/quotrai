import { useSubscription } from "./useSubscription";

/**
 * Returns true if the account is in read-only mode (trial expired, no active subscription).
 * Primary source of truth: subscriptions_v2.
 */
export function useReadOnly(): boolean {
  const { data: subscriptionV2, isLoading } = useSubscription();

  // Still loading — don't lock the user out
  if (isLoading) return false;

  // No subscription record at all — don't lock (new user, data loading)
  if (!subscriptionV2) return false;

  // Active subscription = not read-only
  if (subscriptionV2.status === "active") return false;

  // Trialing and not expired = not read-only
  if (subscriptionV2.status === "trialing" && subscriptionV2.trial_ends_at) {
    const trialEnd = new Date(subscriptionV2.trial_ends_at);
    if (trialEnd > new Date()) return false;
  }

  // Past due — allow a 3-day grace period for Stripe retries
  if (subscriptionV2.status === "past_due" && subscriptionV2.current_period_end) {
    const periodEnd = new Date(subscriptionV2.current_period_end);
    const graceEnd = new Date(periodEnd.getTime() + 3 * 24 * 60 * 60 * 1000);
    if (graceEnd > new Date()) return false;
  }

  // Everything else (expired, canceled, grace exhausted, trial expired) = read-only
  return true;
}
