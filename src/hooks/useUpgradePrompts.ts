import { useMemo } from "react";
import { useSubscriptionTier } from "./useSubscriptionTier";
import { useDashboardMetrics } from "./useDashboardData";

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

export function useUpgradePrompts(): { prompts: UpgradePrompt[]; topPrompt: UpgradePrompt | null } {
  const { teamSubscription, trialDaysRemaining, isTrialExpired, remainingVoiceMinutes } = useSubscriptionTier();
  const { data: metrics } = useDashboardMetrics();

  const prompts = useMemo(() => {
    const result: UpgradePrompt[] = [];
    if (!teamSubscription) return result;

    const isTrial = teamSubscription.is_trial;
    const hasPaid = teamSubscription.subscription_tier === "paid";

    // Trial expired — highest urgency
    if (isTrialExpired) {
      result.push({
        type: "trial_expired",
        title: "Your trial has ended",
        message: "Upgrade now to keep managing jobs, invoices, and customers without interruption.",
        cta: "Choose a Plan",
        urgency: "high",
        route: "/onboarding/select-plan",
      });
    }

    // Trial expiring soon
    if (isTrial && !isTrialExpired && trialDaysRemaining <= 5) {
      result.push({
        type: "trial_expiring",
        title: `${trialDaysRemaining} day${trialDaysRemaining !== 1 ? "s" : ""} left on your trial`,
        message: "Lock in your price and keep all your data — upgrade before it ends.",
        cta: "Upgrade Now",
        urgency: trialDaysRemaining <= 2 ? "high" : "medium",
        route: "/onboarding/select-plan",
      });
    }

    // Voice minutes running low
    if (remainingVoiceMinutes > 0 && remainingVoiceMinutes <= 10 && !hasPaid) {
      result.push({
        type: "voice_limit",
        title: `Only ${remainingVoiceMinutes} AI voice minutes left`,
        message: "Upgrade to Pro to keep using Foreman AI, or contact us about Enterprise for unlimited minutes.",
        cta: "Get More Minutes",
        urgency: "medium",
        route: "/onboarding/select-plan",
      });
    }

    // Invoice milestone nudge (sent 5+ invoices on trial)
    const invoiceCount = metrics?.outstandingCount ?? 0;
    if (isTrial && invoiceCount >= 5) {
      result.push({
        type: "invoice_milestone",
        title: `You've created ${invoiceCount} invoices!`,
        message: "You're clearly getting value from Quotr. Upgrade to keep sending invoices and collecting payments.",
        cta: "Unlock Payments",
        urgency: "low",
        route: "/onboarding/select-plan",
      });
    }

    // General growth nudge for active trialists
    const jobCount = metrics?.activeJobs ?? 0;
    if (isTrial && !isTrialExpired && jobCount >= 3 && invoiceCount < 5) {
      result.push({
        type: "growth_nudge",
        title: "You're building momentum!",
        message: `${jobCount} jobs tracked. Upgrade to send invoices with one-click online payments.`,
        cta: "See Plans",
        urgency: "low",
        route: "/onboarding/select-plan",
      });
    }

    // Quote milestone — sent 5+ quotes on trial (using pendingQuotesCount as proxy)
    const quoteCount = metrics?.pendingQuotesCount ?? 0;
    if (isTrial && quoteCount >= 5) {
      result.push({
        type: "quote_milestone",
        title: "You're quoting like a pro!",
        message: `${quoteCount} quotes created. Lock in your account to keep the momentum going.`,
        cta: "Lock In Your Plan",
        urgency: "low",
        route: "/onboarding/select-plan",
      });
    }

    return result;
  }, [teamSubscription, trialDaysRemaining, isTrialExpired, remainingVoiceMinutes, metrics]);

  return { prompts, topPrompt: prompts[0] ?? null };
}
