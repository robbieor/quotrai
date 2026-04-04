

# Align Stripe Checkout and Billing to New Single-Plan Pricing

## Problem
The entire Stripe billing backend still operates on the old 3-tier model (Lite €19, Connect €39, Grow €69 per seat). The new pricing is **€39/mo base** (includes 3 users) + **€19/mo per extra seat**. This means:

- `create-checkout-session` builds line items from old tier price IDs
- `sync-seat-to-stripe` syncs per-tier seat counts using old prices
- `add-subscription-seat` increments quantity on whatever the first line item is (wrong model)
- `SelectPlan.tsx` sends `{ connect: teamSize }` which charges €39 × teamSize (wrong — should be €39 + extras × €19)
- `SubscriptionPricing.tsx` still references the 3-tier feature matrix
- `useSubscriptionTier.ts` still exports 3 plan detail objects

## Solution

### Step 1 — Create Two New Stripe Products and Prices
Using the Stripe tool:
- **Foreman Base Plan**: €39/mo recurring (covers up to 3 users)
- **Foreman Extra Seat**: €19/mo recurring (each additional user beyond 3)

### Step 2 — Rewrite `create-checkout-session` Edge Function
Replace the 3-tier price map with the two new price IDs. Accept `{ teamSize: number, interval: "month" | "year" }` from the frontend. Build line items:
- 1× Base Plan
- `max(0, teamSize - 3)` × Extra Seat

Keep existing logic for: customer lookup/creation, trial preservation, burned account check, bulk discount.

### Step 3 — Rewrite `sync-seat-to-stripe` Edge Function
Instead of mapping seat types to tier prices, count total active members, then ensure the Stripe subscription has:
- 1× Base Plan price
- `max(0, members - 3)` × Extra Seat price

### Step 4 — Rewrite `add-subscription-seat` Edge Function
Find the Extra Seat line item on the subscription and increment its quantity by 1. If no Extra Seat item exists yet (team was ≤3), add one with quantity 1.

### Step 5 — Update `SelectPlan.tsx` Frontend
Change the checkout body from `{ seatCounts: { connect: teamSize } }` to `{ teamSize, interval: "month" }`.

### Step 6 — Update `useSubscriptionTier.ts` Constants
Add the new Stripe Price IDs for Base Plan and Extra Seat. The old tier constants can remain for backward compatibility with existing subscribers but add the new canonical IDs.

### Step 7 — Update `SubscriptionPricing.tsx`
Replace the 3-tier card grid with the single-plan card matching the landing page and pricing page design. This component is used in the settings/billing area.

### Step 8 — Update `useSubscription.ts` Frontend Hook
The `useUpdateSeatType` mutation still references the old seat-type model. Simplify it since there's now only one seat type.

## Files Changed

| Action | File |
|--------|------|
| Create (Stripe) | "Foreman Base Plan" product + €39/mo price |
| Create (Stripe) | "Foreman Extra Seat" product + €19/mo price |
| Rewrite | `supabase/functions/create-checkout-session/index.ts` |
| Rewrite | `supabase/functions/sync-seat-to-stripe/index.ts` |
| Rewrite | `supabase/functions/add-subscription-seat/index.ts` |
| Edit | `src/pages/SelectPlan.tsx` — change checkout body format |
| Edit | `src/hooks/useSubscriptionTier.ts` — add new price IDs |
| Edit | `src/components/billing/SubscriptionPricing.tsx` — single plan card |
| Edit | `src/hooks/useSubscription.ts` — simplify seat type mutation |

## Backward Compatibility
The `create-customer-portal-session`, `cancel-subscription`, `end-trial-early`, and `stripe-webhook` functions work at the subscription level (not price level) so they need no changes. Existing subscribers with old tier prices will continue to work via the Stripe portal until they naturally migrate.

