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
// New single-plan model
export const STRIPE_PRICE_BASE_PLAN = 'price_1TIJDeDQETj2awNEWxP4bB43'; // €39/mo
export const STRIPE_PRICE_EXTRA_SEAT = 'price_1TIJDzDQETj2awNEtiMhRUPR'; // €19/mo
export const STRIPE_PRICE_BASE_PLAN_ANNUAL = 'price_1TIQvfDQETj2awNEx7bAyHjy'; // €397.80/yr
export const STRIPE_PRICE_EXTRA_SEAT_ANNUAL = 'price_1TIQw1DQETj2awNEth2a6E8y'; // €193.80/yr

// Legacy tier prices (kept for backward compat with existing subscribers)
export const STRIPE_PRICES = {
  lite: {
    monthly: 'price_1TEa4dDQETj2awNErpoa1vHM',
    annual: 'price_1TEa57DQETj2awNEESev15XR',
  },
  connect: {
    monthly: 'price_1TEa5SDQETj2awNE4qhL4fa7',
    annual: 'price_1TEa5tDQETj2awNE2zfrsMkY',
  },
  grow: {
    monthly: 'price_1TEa6HDQETj2awNEycXwPCfc',
    annual: 'price_1TEa6oDQETj2awNEHSl42OYl',
  },
} as const;

// Pricing constants - single source of truth
export const PRICING = {
  BASE_PLAN: 39,
  EXTRA_SEAT: 19,
  BASE_USERS: 3,
  ANNUAL_BASE_PLAN: 397.80,
  ANNUAL_EXTRA_SEAT: 193.80,
  LITE_SEAT: 19,
  CONNECT_SEAT: 39,
  GROW_SEAT: 69,
  ANNUAL_DISCOUNT: 0.15,
  ANNUAL_LITE_SEAT: 193.80,
  ANNUAL_CONNECT_SEAT: 397.80,
  ANNUAL_GROW_SEAT: 703.80,
  VOICE_MINUTES_PER_SEAT: 60,
  GROW_VOICE_MINUTES: -1,
  PLATFORM_FEE: 1.5,
  GROW_PLATFORM_FEE: 1.5,
  BULK_DISCOUNT_THRESHOLD: 5,
  BULK_DISCOUNT: 0.10,
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
    currentPlan: (() => {
      // Derive from subscriptions_v2 plan_id or fall back to seat type lookup
      const planId = teamSubscription?.subscription_tier;
      if (planId === 'lite') return LITE_SEAT_DETAILS;
      if (planId === 'grow') return GROW_SEAT_DETAILS;
      return CONNECT_SEAT_DETAILS; // default
    })(),
  };
}
