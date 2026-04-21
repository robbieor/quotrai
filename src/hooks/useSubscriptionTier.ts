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

// ============================================================
// TIERED PRICING MODEL (Apr 2026 launch)
// Solo €29 · Crew €49 (recommended) · Business €89 (premium, 3 seats)
// Extra seat €19/mo (Crew & Business only)
// NOTE: 'scale' is kept as a deprecated alias of 'business' for one
// release so any in-flight subscriptions / metadata don't break.
// ============================================================

export type TierId = 'solo' | 'crew' | 'business';
/** @deprecated use 'business' instead — kept for one release of backward compat */
export type LegacyTierId = TierId | 'scale';

// ============================================================
// SINGLE SOURCE OF TRUTH — tier display names
// Use these everywhere a tier label is rendered (UI, emails,
// Stripe metadata, analytics) so a rename only happens here.
// ============================================================
export const TIER_LABELS: Record<TierId, string> = {
  solo: 'Solo',
  crew: 'Crew',
  business: 'Business',
};

/** Normalises a possibly-legacy tier id (e.g. 'scale') to the canonical id. */
export function normaliseTierId(input: string | null | undefined): TierId {
  const v = (input ?? '').toString().toLowerCase().trim();
  if (v === 'scale') return 'business'; // legacy alias
  if (v === 'solo' || v === 'crew' || v === 'business') return v;
  return 'crew'; // safe default
}

/** Returns the canonical display name for any tier id (handles legacy). */
export function getTierLabel(input: string | null | undefined): string {
  return TIER_LABELS[normaliseTierId(input)];
}

// Stripe Price IDs per tier — TODO: replace placeholders with real IDs
// once products are created in Stripe. Crew currently maps to the
// existing €39 base / €15 seat price IDs as a fallback to avoid breaking
// checkout. Update these as soon as the new Stripe products are live.
export const TIER_STRIPE_PRICES: Record<TierId, {
  monthly: string;
  annual: string;
  seatMonthly?: string;
  seatAnnual?: string;
}> = {
  solo: {
    monthly: 'price_TODO_SOLO_MONTHLY', // €29/mo — create in Stripe
    annual: 'price_TODO_SOLO_ANNUAL',   // €295.80/yr (15% off)
  },
  crew: {
    // Fallback to legacy base IDs until new €49 prices are created
    monthly: 'price_1TIJDeDQETj2awNEWxP4bB43',
    annual: 'price_1TIQvfDQETj2awNEx7bAyHjy',
    seatMonthly: 'price_1TKjaNDQETj2awNEXHD4jFRq', // €15 (TODO upgrade to €19)
    seatAnnual: 'price_1TIQw1DQETj2awNEth2a6E8y',  // €153 (TODO upgrade to €193.80)
  },
  business: {
    monthly: 'price_TODO_BUSINESS_MONTHLY', // €89/mo — create in Stripe
    annual: 'price_TODO_BUSINESS_ANNUAL',   // €907.80/yr (15% off)
    seatMonthly: 'price_TODO_BUSINESS_SEAT_MONTHLY', // €19/mo (4th+ user)
    seatAnnual: 'price_TODO_BUSINESS_SEAT_ANNUAL',   // €193.80/yr
  },
};

/** @deprecated alias kept for backward compat — use TIER_STRIPE_PRICES.business */
export const TIER_STRIPE_PRICES_SCALE_ALIAS = TIER_STRIPE_PRICES.business;

// Legacy single-plan exports kept for backward compatibility
export const STRIPE_PRICE_BASE_PLAN = TIER_STRIPE_PRICES.crew.monthly;
export const STRIPE_PRICE_EXTRA_SEAT = TIER_STRIPE_PRICES.crew.seatMonthly!;
export const STRIPE_PRICE_BASE_PLAN_ANNUAL = TIER_STRIPE_PRICES.crew.annual;
export const STRIPE_PRICE_EXTRA_SEAT_ANNUAL = TIER_STRIPE_PRICES.crew.seatAnnual!;

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

// Pricing constants — single source of truth for the 3-tier model
export const PRICING = {
  // Tier base prices (monthly)
  SOLO: 29,
  CREW: 49,
  BUSINESS: 89,
  /** @deprecated use BUSINESS */
  SCALE: 89,

  // Annual prices (15% off the 12× monthly)
  ANNUAL_SOLO: 295.80,    // 29 × 12 × 0.85
  ANNUAL_CREW: 499.80,    // 49 × 12 × 0.85
  ANNUAL_BUSINESS: 907.80,  // 89 × 12 × 0.85
  /** @deprecated use ANNUAL_BUSINESS */
  ANNUAL_SCALE: 907.80,

  // Seats included per tier
  SOLO_INCLUDED_SEATS: 1,
  CREW_INCLUDED_SEATS: 1,
  BUSINESS_INCLUDED_SEATS: 3,
  /** @deprecated use BUSINESS_INCLUDED_SEATS */
  SCALE_INCLUDED_SEATS: 3,

  // Extra seat pricing (Crew & Business only)
  EXTRA_SEAT: 19,
  ANNUAL_EXTRA_SEAT: 193.80,

  // Voice minutes
  VOICE_MINUTES_PER_SEAT: 60,
  BUSINESS_VOICE_MINUTES: -1, // unlimited
  /** @deprecated use BUSINESS_VOICE_MINUTES */
  SCALE_VOICE_MINUTES: -1,

  // Platform / discount
  ANNUAL_DISCOUNT: 0.15,
  PLATFORM_FEE: 2.9,
  BULK_DISCOUNT_THRESHOLD: 5,
  BULK_DISCOUNT: 0.10,

  // ---- Legacy aliases (do not remove — used by older flows) ----
  BASE_PLAN: 49,           // now Crew price
  ANNUAL_BASE_PLAN: 499.80,
  BASE_USERS: 1,
  LITE_SEAT: 19,
  CONNECT_SEAT: 39,
  GROW_SEAT: 69,
  GROW_VOICE_MINUTES: -1,
  GROW_PLATFORM_FEE: 2.9,
  ANNUAL_LITE_SEAT: 193.80,
  ANNUAL_CONNECT_SEAT: 397.80,
  ANNUAL_GROW_SEAT: 703.80,
} as const;

export interface TierDetails {
  id: TierId;
  name: string;
  tagline: string;
  monthly: number;
  annual: number;
  includedSeats: number;
  extraSeatMonthly?: number;
  extraSeatAnnual?: number;
  voiceMinutesPerSeat: number; // -1 = unlimited, 0 = none
  features: string[];
  highlighted?: boolean;
  badge?: string;
}

export const SOLO_TIER: TierDetails = {
  id: 'solo',
  name: 'Solo',
  tagline: 'For one-person operations getting organised.',
  monthly: PRICING.SOLO,
  annual: PRICING.ANNUAL_SOLO,
  includedSeats: PRICING.SOLO_INCLUDED_SEATS,
  voiceMinutesPerSeat: 0,
  features: [
    'Unlimited quotes & invoices',
    'Job scheduling & calendar',
    'Customer management',
    'GPS time tracking',
    'PDF & email delivery',
    '2.9% integrated payments',
  ],
};

export const CREW_TIER: TierDetails = {
  id: 'crew',
  name: 'Crew',
  tagline: 'The full Foreman OS, with AI built in.',
  monthly: PRICING.CREW,
  annual: PRICING.ANNUAL_CREW,
  includedSeats: PRICING.CREW_INCLUDED_SEATS,
  extraSeatMonthly: PRICING.EXTRA_SEAT,
  extraSeatAnnual: PRICING.ANNUAL_EXTRA_SEAT,
  voiceMinutesPerSeat: PRICING.VOICE_MINUTES_PER_SEAT,
  features: [
    'Everything in Solo',
    'Foreman AI text & voice assistant',
    `${PRICING.VOICE_MINUTES_PER_SEAT} voice minutes per seat / month`,
    'Expense tracking & receipt scanning',
    'Reports, dashboards & recurring invoices',
    'Xero & QuickBooks sync',
  ],
  highlighted: true,
  badge: 'Most Popular',
};

export const BUSINESS_TIER: TierDetails = {
  id: 'business',
  name: 'Business',
  tagline: 'For operators running a real business.',
  monthly: PRICING.BUSINESS,
  annual: PRICING.ANNUAL_BUSINESS,
  includedSeats: PRICING.BUSINESS_INCLUDED_SEATS,
  extraSeatMonthly: PRICING.EXTRA_SEAT,
  extraSeatAnnual: PRICING.ANNUAL_EXTRA_SEAT,
  voiceMinutesPerSeat: PRICING.BUSINESS_VOICE_MINUTES,
  features: [
    'Everything in Crew',
    '3 seats included',
    'Unlimited Foreman AI voice minutes',
    'Priority support — same-day + WhatsApp',
    'Advanced reports, exports & monthly P&L',
    'Priority AI processing (faster lane)',
  ],
  badge: 'Premium',
};

/** @deprecated use BUSINESS_TIER — alias kept for one release */
export const SCALE_TIER = BUSINESS_TIER;

export const ALL_TIERS: TierDetails[] = [SOLO_TIER, CREW_TIER, BUSINESS_TIER];

// Helper: compute total cost for a tier + team size
export function computeTierTotal(
  tier: TierDetails,
  teamSize: number,
  isAnnual: boolean,
): number {
  const base = isAnnual ? tier.annual : tier.monthly;
  const extra = Math.max(0, teamSize - tier.includedSeats);
  if (extra === 0) return base;
  const seatPrice = isAnnual ? (tier.extraSeatAnnual ?? 0) : (tier.extraSeatMonthly ?? 0);
  return base + extra * seatPrice;
}

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
