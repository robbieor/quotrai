import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type SubscriptionTier = 'active' | 'trialing' | 'expired';

export interface TeamSubscription {
  id: string;
  name: string;
  subscription_tier: string;
  george_voice_minutes_limit: number;
  george_voice_minutes_used: number;
  george_usage_reset_date: string;
  trial_ends_at: string | null;
  is_trial: boolean;
  george_voice_seats: number;
}

// Pricing constants - single source of truth
export const PRICING = {
  BASE_SEAT: 29,        // Pro seat (full access + Foreman AI voice)
  STARTER_SEAT: 12,     // Starter seat (core features, no AI)
  ENTERPRISE_SEAT: 49,  // Enterprise seat (priority support, custom onboarding)
  ANNUAL_DISCOUNT: 0.15,
  ANNUAL_SEAT: Math.round(29 * 12 * (1 - 0.15)),            // €296/year pro
  ANNUAL_STARTER_SEAT: Math.round(12 * 12 * (1 - 0.15)),    // €122/year starter
  ANNUAL_ENTERPRISE_SEAT: Math.round(49 * 12 * (1 - 0.15)), // €499/year enterprise
  VOICE_MINUTES_PER_SEAT: 60,
  ENTERPRISE_VOICE_MINUTES: -1, // unlimited
  PLATFORM_FEE: 2.5,
  ENTERPRISE_PLATFORM_FEE: 2.0,
  BULK_DISCOUNT_THRESHOLD: 5,
  BULK_DISCOUNT: 0.10,
  // Legacy aliases
  TEAM_SEAT: 12,
  ANNUAL_TEAM_SEAT: Math.round(12 * 12 * (1 - 0.15)),
} as const;

export interface PlanDetails {
  name: string;
  price: number;
  features: string[];
  highlighted?: boolean;
}

// Starter Seat — core features, no AI
export const STARTER_SEAT_DETAILS: PlanDetails = {
  name: 'Starter',
  price: PRICING.STARTER_SEAT,
  features: [
    'Unlimited quotes & invoices',
    'Job scheduling & calendar',
    'Customer management',
    'Expense tracking',
    'PDF generation & email',
    'Team collaboration',
  ],
};

// Pro Seat — full access with Foreman AI
export const PRO_SEAT_DETAILS: PlanDetails = {
  name: 'Pro',
  price: PRICING.BASE_SEAT,
  features: [
    'Everything in Starter',
    'Foreman AI text & voice assistant',
    `${PRICING.VOICE_MINUTES_PER_SEAT} voice minutes/month`,
    'GPS time tracking & geofencing',
    'Business reports & dashboards',
    'Xero / QuickBooks sync',
    'Recurring invoices',
  ],
  highlighted: true,
};

// Enterprise Seat — everything + priority support
export const ENTERPRISE_SEAT_DETAILS: PlanDetails = {
  name: 'Enterprise',
  price: PRICING.ENTERPRISE_SEAT,
  features: [
    'Everything in Pro',
    'Unlimited voice minutes',
    `Reduced ${PRICING.ENTERPRISE_PLATFORM_FEE}% platform fee`,
    'Priority support & SLA',
    'Dedicated account manager',
    'Custom onboarding',
    'API access & webhooks',
    'White-label PDF branding',
  ],
};

// Legacy aliases for backward compatibility
export const TEAM_SEAT_DETAILS = STARTER_SEAT_DETAILS;
export const VOICE_SEAT_DETAILS = PRO_SEAT_DETAILS;

// Keep legacy export for compatibility
export const PLAN_DETAILS = PRO_SEAT_DETAILS;

export function useSubscriptionTier() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: teamSubscription, isLoading, error } = useQuery({
    queryKey: ['teamSubscription', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('team_id')
        .eq('id', user.id)
        .single();

      if (!profile?.team_id) return null;

      const { data: team, error } = await supabase
        .from('teams')
        .select('id, name, subscription_tier, george_voice_minutes_limit, george_voice_minutes_used, george_usage_reset_date, trial_ends_at, is_trial, george_voice_seats')
        .eq('id', profile.team_id)
        .single();

      if (error) throw error;
      return team as TeamSubscription;
    },
    enabled: !!user,
  });

  const startTrialMutation = useMutation({
    mutationFn: async () => {
      if (!user || !teamSubscription) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('teams')
        .update({
          is_trial: true,
          trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq('id', teamSubscription.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamSubscription'] });
    },
  });

  const canUseVoice = teamSubscription
    ? teamSubscription.george_voice_minutes_used < teamSubscription.george_voice_minutes_limit
    : false;

  const remainingVoiceMinutes = teamSubscription
    ? Math.max(0, teamSubscription.george_voice_minutes_limit - teamSubscription.george_voice_minutes_used)
    : 0;

  const isTrialExpired = teamSubscription?.is_trial && 
    teamSubscription?.trial_ends_at && 
    new Date(teamSubscription.trial_ends_at) < new Date();

  const trialDaysRemaining = teamSubscription?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(teamSubscription.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  return {
    teamSubscription,
    isLoading,
    error,
    canUseVoice,
    remainingVoiceMinutes,
    isTrialExpired,
    trialDaysRemaining,
    startTrial: startTrialMutation.mutateAsync,
    isStartingTrial: startTrialMutation.isPending,
    currentPlan: PLAN_DETAILS,
  };
}
