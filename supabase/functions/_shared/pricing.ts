// =============================================================================
// FOREMAN — SINGLE SOURCE OF TRUTH FOR STRIPE PRICE IDs
// =============================================================================
// Imported by every edge function that touches subscriptions:
//   - create-checkout-session
//   - sync-seat-to-stripe
//   - add-subscription-seat
//   - stripe-webhook (for the price → plan name map)
//
// Mirror of src/hooks/useSubscriptionTier.ts → TIER_STRIPE_PRICES.
// When updating, update BOTH places.
// =============================================================================

export type TierId = "solo" | "crew" | "business";
export type Interval = "month" | "year";

export const TIER_LABELS: Record<TierId, string> = {
  solo: "Solo",
  crew: "Crew",
  business: "Business",
};

export interface TierPriceSet {
  base: string;
  seat?: string;
}

export interface TierConfig {
  month: TierPriceSet;
  year: TierPriceSet;
  includedSeats: number;
}

export const TIER_PRICES: Record<TierId, TierConfig> = {
  solo: {
    month: { base: "price_1T7afYDQETj2awNEcXocEe7h" }, // €29/mo
    year: { base: "price_1T7apqDQETj2awNEXdefYkfs" },  // €295.80/yr
    includedSeats: 1,
  },
  crew: {
    month: {
      base: "price_1T7agsDQETj2awNEeLQafzg5", // €49/mo
      seat: "price_1TIJDzDQETj2awNEtiMhRUPR", // €19/mo
    },
    year: {
      base: "price_1T7ahZDQETj2awNE5gr1v6DI", // €499.80/yr
      seat: "price_1TIQw1DQETj2awNEth2a6E8y", // €193.80/yr
    },
    includedSeats: 1,
  },
  business: {
    month: {
      base: "price_1TOmfHDQETj2awNEmqLaXq87", // €89/mo
      seat: "price_1TIJDzDQETj2awNEtiMhRUPR", // €19/mo (shared seat SKU)
    },
    year: {
      base: "price_1TOmfTDQETj2awNEXqEyiiVk", // €907.80/yr
      seat: "price_1TIQw1DQETj2awNEth2a6E8y", // €193.80/yr
    },
    includedSeats: 3,
  },
};

// ---- Legacy price IDs we still recognise on existing customer subscriptions ----
// (Used by sync-seat-to-stripe to AVOID deleting them and by webhook to label them.)
export const LEGACY_BASE_PRICES = new Set<string>([
  "price_1TIJDeDQETj2awNEWxP4bB43", // legacy €39/mo Crew base
  "price_1TIQvfDQETj2awNEx7bAyHjy", // legacy €397.80/yr Crew base
]);

export const LEGACY_SEAT_PRICES = new Set<string>([
  "price_1TKjaNDQETj2awNEXHD4jFRq", // legacy €15/mo seat
]);

// ---- Reverse lookup: given a price id, what tier/interval/role is it? ----
type PriceMeta = {
  tier: TierId | "legacy_crew";
  interval: Interval;
  role: "base" | "seat";
};

const PRICE_META: Record<string, PriceMeta> = (() => {
  const map: Record<string, PriceMeta> = {};
  for (const tier of ["solo", "crew", "business"] as TierId[]) {
    const cfg = TIER_PRICES[tier];
    map[cfg.month.base] = { tier, interval: "month", role: "base" };
    map[cfg.year.base] = { tier, interval: "year", role: "base" };
    if (cfg.month.seat) map[cfg.month.seat] = { tier, interval: "month", role: "seat" };
    if (cfg.year.seat) map[cfg.year.seat] = { tier, interval: "year", role: "seat" };
  }
  // Legacy IDs map to "legacy_crew" so callers can recognise them
  map["price_1TIJDeDQETj2awNEWxP4bB43"] = { tier: "legacy_crew", interval: "month", role: "base" };
  map["price_1TIQvfDQETj2awNEx7bAyHjy"] = { tier: "legacy_crew", interval: "year", role: "base" };
  map["price_1TKjaNDQETj2awNEXHD4jFRq"] = { tier: "legacy_crew", interval: "month", role: "seat" };
  return map;
})();

export function lookupPrice(priceId: string): PriceMeta | null {
  return PRICE_META[priceId] || null;
}

/**
 * Given a list of Stripe subscription line items, infer the active tier + interval
 * by finding the BASE line item (not the seat).
 * Returns null if no recognised base line item is found.
 */
export function detectTierFromItems(
  items: Array<{ price: { id: string } }>
): { tier: TierId; interval: Interval } | null {
  // Prefer current tier prices over legacy
  for (const item of items) {
    const meta = PRICE_META[item.price.id];
    if (meta && meta.role === "base" && meta.tier !== "legacy_crew") {
      return { tier: meta.tier as TierId, interval: meta.interval };
    }
  }
  // Fall back to legacy
  for (const item of items) {
    const meta = PRICE_META[item.price.id];
    if (meta && meta.role === "base" && meta.tier === "legacy_crew") {
      return { tier: "crew", interval: meta.interval };
    }
  }
  return null;
}

/** Plan-name map used by the webhook for subscription-confirmation emails. */
export const PRICE_TO_PLAN_LABEL: Record<string, string> = (() => {
  const m: Record<string, string> = {};
  for (const tier of ["solo", "crew", "business"] as TierId[]) {
    const label = TIER_LABELS[tier];
    const cfg = TIER_PRICES[tier];
    m[cfg.month.base] = `Foreman — ${label}`;
    m[cfg.year.base] = `Foreman — ${label} (Annual)`;
    if (cfg.month.seat) m[cfg.month.seat] = "Extra Seat";
    if (cfg.year.seat) m[cfg.year.seat] = "Extra Seat (Annual)";
  }
  // Legacy
  m["price_1TIJDeDQETj2awNEWxP4bB43"] = "Foreman — Crew (legacy)";
  m["price_1TIQvfDQETj2awNEx7bAyHjy"] = "Foreman — Crew (legacy, Annual)";
  m["price_1TKjaNDQETj2awNEXHD4jFRq"] = "Extra Seat (legacy)";
  m["price_1TIQw1DQETj2awNEth2a6E8y"] = "Extra Seat (Annual)";
  return m;
})();
