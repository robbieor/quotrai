import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type SubscriptionTier = 'active' | 'trialing' | 'expired';
export type SeatType = 'lite' | 'connect' | 'grow';

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

// Stripe Price ID Map — single source of truth
export const STRIPE_PRICES = {
  lite: {
    monthly: 'price_1T7b44DQETj2awNEVZC5FQn2',
    annual: 'price_1T7b4eDQETj2awNEhlMGRoGE',
  },
  connect: {
    monthly: 'price_1T7afYDQETj2awNEcXocEe7h',
    annual: 'price_1T7apqDQETj2awNEXdefYkfs',
  },
  grow: {
    monthly: 'price_1T7agsDQETj2awNEeLQafzg5',
    annual: 'price_1T7ahZDQETj2awNE5gr1v6DI',
  },
} as const;

// Pricing constants - single source of truth
export const PRICING = {
  LITE_SEAT: 15,
  CONNECT_SEAT: 29,
  GROW_SEAT: 49,
  ANNUAL_DISCOUNT: 0.15,
  ANNUAL_LITE_SEAT: 153,        // €153.00/year (matches Stripe)
  ANNUAL_CONNECT_SEAT: 295.80,  // €295.80/year (matches Stripe)
  ANNUAL_GROW_SEAT: 499.80,     // €499.80/year (matches Stripe)
  VOICE_MINUTES_PER_SEAT: 60,
  GROW_VOICE_MINUTES: -1, // unlimited
  PLATFORM_FEE: 2.5,
  GROW_PLATFORM_FEE: 1.5,
  BULK_DISCOUNT_THRESHOLD: 5,
  BULK_DISCOUNT: 0.10,
  // Legacy aliases
  BASE_SEAT: 29,
  STARTER_SEAT: 15,
  ENTERPRISE_SEAT: 49,
  ANNUAL_SEAT: Math.round(29 * 12 * (1 - 0.15)),
  ANNUAL_STARTER_SEAT: Math.round(15 * 12 * (1 - 0.15)),
  ANNUAL_ENTERPRISE_SEAT: Math.round(49 * 12 * (1 - 0.15)),
  ENTERPRISE_PLATFORM_FEE: 1.5,
  TEAM_SEAT: 15,
  ANNUAL_TEAM_SEAT: Math.round(15 * 12 * (1 - 0.15)),
} as const;

export interface PlanDetails {
  name: string;
  code: SeatType;
  price: number;
  annualPrice: number;
  features: string[];
  highlighted?: boolean;
}

// Lite Seat — core features, no AI
export const LITE_SEAT_DETAILS: PlanDetails = {
  name: 'Lite',
  code: 'lite',
  price: PRICING.LITE_SEAT,
  annualPrice: PRICING.ANNUAL_LITE_SEAT,
  features: [
    'Unlimited quotes & invoices',
    'Job scheduling & calendar',
    'Customer management',
    'GPS time tracking',
    'PDF generation & email',
    'Team collaboration',
  ],
};

// Connect Seat — full access with Foreman AI
export const CONNECT_SEAT_DETAILS: PlanDetails = {
  name: 'Connect',
  code: 'connect',
  price: PRICING.CONNECT_SEAT,
  annualPrice: PRICING.ANNUAL_CONNECT_SEAT,
  features: [
    'Everything in Lite',
    'Foreman AI text & voice assistant',
    `${PRICING.VOICE_MINUTES_PER_SEAT} voice minutes/month`,
    'Expense tracking & documents',
    'Business reports & dashboards',
    'Recurring invoices',
  ],
  highlighted: true,
};

// Grow Seat — everything + priority support
export const GROW_SEAT_DETAILS: PlanDetails = {
  name: 'Grow',
  code: 'grow',
  price: PRICING.GROW_SEAT,
  annualPrice: PRICING.ANNUAL_GROW_SEAT,
  features: [
    'Everything in Connect',
    'Unlimited voice minutes',
    `Reduced ${PRICING.GROW_PLATFORM_FEE}% platform fee`,
    'Xero / QuickBooks sync',
    'Advanced reporting',
    'Lead management pipeline',
    'Priority support & SLA',
    'API access & webhooks',
  ],
};

export const ALL_PLANS: PlanDetails[] = [LITE_SEAT_DETAILS, CONNECT_SEAT_DETAILS, GROW_SEAT_DETAILS];

// Legacy aliases for backward compatibility
export const STARTER_SEAT_DETAILS = { ...LITE_SEAT_DETAILS, name: 'Starter' };
export const PRO_SEAT_DETAILS = CONNECT_SEAT_DETAILS;
export const ENTERPRISE_SEAT_DETAILS = GROW_SEAT_DETAILS;
export const TEAM_SEAT_DETAILS = LITE_SEAT_DETAILS;
export const VOICE_SEAT_DETAILS = CONNECT_SEAT_DETAILS;
export const PLAN_DETAILS = CONNECT_SEAT_DETAILS;

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
          trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
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
