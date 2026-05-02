import { useSubscription } from "./useSubscription";

export type ReadOnlyReason =
  | "trial_expired"
  | "past_due_grace"
  | "unpaid"
  | "canceled"
  | null;

export interface ReadOnlyState {
  /** True when writes should be blocked. */
  isReadOnly: boolean;
  /** Why the account is in its current billing state (null = healthy). */
  reason: ReadOnlyReason;
  /** When the past-due grace window ends. Null if not in grace. */
  graceEndsAt: Date | null;
  /** Still loading subscription data — UI should not lock yet. */
  isLoading: boolean;
}

const GRACE_DAYS = 3;

/**
 * Rich billing-state hook. Read-only triggers:
 * - trial_expired: trialing + trial_ends_at in the past
 * - past_due_grace: status=past_due and grace window still open → NOT read-only, but banner warns
 * - unpaid: Stripe dunning exhausted, or past_due grace exhausted → read-only
 * - canceled: subscription ended after period end → read-only
 */
export function useReadOnlyState(): ReadOnlyState {
  const { data: sub, isLoading } = useSubscription();

  if (isLoading) {
    return { isReadOnly: false, reason: null, graceEndsAt: null, isLoading: true };
  }
  if (!sub) {
    return { isReadOnly: false, reason: null, graceEndsAt: null, isLoading: false };
  }

  const now = new Date();
  const periodEnd = sub.current_period_end ? new Date(sub.current_period_end) : null;
  const trialEnd = sub.trial_ends_at ? new Date(sub.trial_ends_at) : null;

  // Active or healthy trialing → no lock
  if (sub.status === "active") {
    return { isReadOnly: false, reason: null, graceEndsAt: null, isLoading: false };
  }

  if (sub.status === "trialing") {
    if (trialEnd && trialEnd > now) {
      return { isReadOnly: false, reason: null, graceEndsAt: null, isLoading: false };
    }
    return { isReadOnly: true, reason: "trial_expired", graceEndsAt: null, isLoading: false };
  }

  if (sub.status === "past_due") {
    const graceEnd = periodEnd
      ? new Date(periodEnd.getTime() + GRACE_DAYS * 24 * 60 * 60 * 1000)
      : null;
    if (graceEnd && graceEnd > now) {
      return {
        isReadOnly: false, // grace window — warn but allow
        reason: "past_due_grace",
        graceEndsAt: graceEnd,
        isLoading: false,
      };
    }
    return { isReadOnly: true, reason: "unpaid", graceEndsAt: null, isLoading: false };
  }

  if (sub.status === "unpaid" || sub.status === "incomplete_expired") {
    return { isReadOnly: true, reason: "unpaid", graceEndsAt: null, isLoading: false };
  }

  if (sub.status === "canceled") {
    return { isReadOnly: true, reason: "canceled", graceEndsAt: null, isLoading: false };
  }

  // incomplete, paused, or unknown → don't lock yet, no banner
  return { isReadOnly: false, reason: null, graceEndsAt: null, isLoading: false };
}

/**
 * Backwards-compatible boolean wrapper. Existing call sites keep working.
 */
export function useReadOnly(): boolean {
  return useReadOnlyState().isReadOnly;
}
