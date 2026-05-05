import { useMemo } from "react";
import { useSubscriptionTier } from "./useSubscriptionTier";
import { useDashboardMetrics } from "./useDashboardData";
import { useIsNative } from "./useIsNative";

export type UpgradePromptType = 
  | "trial_expiring"
  | "trial_expired"
  | "invoice_milestone"
  | "voice_limit"
  | "growth_nudge"
  | "quote_milestone"
  | "first_payment"
  | "team_growth"
  | "accounting_connected";

export interface UpgradePrompt {
  type: UpgradePromptType;
  title: string;
  message: string;
  cta: string;
  urgency: "low" | "medium" | "high";
  route: string;
}

const WEB_BILLING_URL = "https://revamo.ai/settings?tab=team-billing";

export function useUpgradePrompts(): { prompts: UpgradePrompt[]; topPrompt: UpgradePrompt | null } {
  const { teamSubscription, trialDaysRemaining, isTrialExpired, remainingVoiceMinutes } = useSubscriptionTier();
  const { data: metrics } = useDashboardMetrics();
  const isNative = useIsNative();

  const prompts = useMemo(() => {
    const result: UpgradePrompt[] = [];
    if (!teamSubscription) return result;

    const isTrial = teamSubscription.is_trial;
    const hasPaid = teamSubscription.subscription_tier === "paid";

    // On native, rewrite route & CTA to point to external web
    const route = isNative ? WEB_BILLING_URL : "/select-plan";
    const nativeCta = "Manage on revamo.ai";

    // Trial expired — highest urgency
    if (isTrialExpired) {
      result.push({
        type: "trial_expired",
        title: "Your trial has ended",
        message: isNative
          ? "Visit revamo.ai to upgrade and keep managing jobs, invoices, and customers."
          : "Upgrade now to keep managing jobs, invoices, and customers without interruption.",
        cta: isNative ? nativeCta : "Choose a Plan",
        urgency: "high",
        route,
      });
    }

    // Trial expiring soon
    if (isTrial && !isTrialExpired && trialDaysRemaining <= 5) {
      result.push({
        type: "trial_expiring",
        title: `${trialDaysRemaining} day${trialDaysRemaining !== 1 ? "s" : ""} left on your trial`,
        message: isNative
          ? "Visit revamo.ai to lock in your price before it ends."
          : "Lock in your price and keep all your data — upgrade before it ends.",
        cta: isNative ? nativeCta : "Upgrade Now",
        urgency: trialDaysRemaining <= 2 ? "high" : "medium",
        route,
      });
    }

    // Voice minutes running low
    if (remainingVoiceMinutes > 0 && remainingVoiceMinutes <= 10 && !hasPaid) {
      result.push({
        type: "voice_limit",
        title: `Only ${remainingVoiceMinutes} AI voice minutes left`,
        message: isNative
          ? "Visit revamo.ai to upgrade to Connect for more minutes."
          : "Upgrade to Connect to keep using revamo AI, or upgrade to Grow for unlimited minutes.",
        cta: isNative ? nativeCta : "Get More Minutes",
        urgency: "medium",
        route,
      });
    }

    // Invoice milestone nudge (sent 5+ invoices on trial)
    const invoiceCount = metrics?.outstandingCount ?? 0;
    if (isTrial && invoiceCount >= 5) {
      result.push({
        type: "invoice_milestone",
        title: `You've created ${invoiceCount} invoices!`,
        message: isNative
          ? "Visit revamo.ai to upgrade and keep sending invoices."
          : "You're clearly getting value from revamo. Upgrade to keep sending invoices and collecting payments.",
        cta: isNative ? nativeCta : "Unlock Payments",
        urgency: "low",
        route,
      });
    }

    // General growth nudge for active trialists
    const jobCount = metrics?.activeJobs ?? 0;
    if (isTrial && !isTrialExpired && jobCount >= 3 && invoiceCount < 5) {
      result.push({
        type: "growth_nudge",
        title: "You're building momentum!",
        message: isNative
          ? `${jobCount} jobs tracked. Visit revamo.ai to upgrade.`
          : `${jobCount} jobs tracked. Upgrade to send invoices with one-click online payments.`,
        cta: isNative ? nativeCta : "See Plans",
        urgency: "low",
        route,
      });
    }

    // Quote milestone — sent 5+ quotes on trial
    const quoteCount = metrics?.pendingQuotesCount ?? 0;
    if (isTrial && quoteCount >= 5) {
      result.push({
        type: "quote_milestone",
        title: "You're quoting like a pro!",
        message: isNative
          ? `${quoteCount} quotes created. Visit revamo.ai to lock in your account.`
          : `${quoteCount} quotes created. Lock in your account to keep the momentum going.`,
        cta: isNative ? nativeCta : "Lock In Your Plan",
        urgency: "low",
        route,
      });
    }

    return result;
  }, [teamSubscription, trialDaysRemaining, isTrialExpired, remainingVoiceMinutes, metrics, isNative]);

  return { prompts, topPrompt: prompts[0] ?? null };
}
