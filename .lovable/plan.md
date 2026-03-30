

# Bulk Discount Implementation + Landing Page Pricing Overhaul

## Problem 1: Bulk Discount is Fake

The 10% discount for 5+ seats exists **only as FAQ text** and a constant in `useSubscriptionTier.ts`. It is never applied anywhere:

- `create-checkout-session` edge function does not check seat count or apply a coupon
- No Stripe coupon or discount exists for this
- The `SelectPlan` PlanCard quantity stepper doesn't show discounted pricing when seats >= 5
- The `SeatManagementTable` info card mentions nothing about it

**Two options:** Either implement it properly in Stripe, or remove the claim. Given you want it, we implement it.

## Problem 2: Landing Page Pricing is Thin

The current `PricingPreviewSection` on the landing page shows 3 cards with 3 bullet points each and a "View full pricing" link. No annual toggle, no feature comparison, no bulk discount callout, no FAQ. Users have to click through to `/pricing` to understand what they're buying.

---

## Implementation Plan

### 1. Create Stripe Coupon for Bulk Discount

Use the Stripe MCP tool to create a 10% coupon that can be applied during checkout when total seats >= 5.

### 2. Apply Discount in `create-checkout-session`

Edit `supabase/functions/create-checkout-session/index.ts`:
- Count total seats from `seatCounts` object
- If total >= 5, attach the Stripe coupon ID to the checkout session via `discounts: [{ coupon: 'BULK_5_SEATS' }]`
- This is a one-line addition to the session config

### 3. Show Discount in SelectPlan UI

Edit `src/pages/SelectPlan.tsx`:
- In `PlanCard`, when quantity >= `PRICING.BULK_DISCOUNT_THRESHOLD`, show a crossed-out original price + discounted price
- Add a visible banner/badge near the quantity stepper: "10% off applied — 5+ seats"
- Move the bulk discount from a hidden FAQ answer to a prominent callout card above the FAQ section

### 4. Show Discount in SeatManagementTable

Edit `src/components/billing/SeatManagementTable.tsx`:
- In the explainer card, add a line: "Teams with 5+ seats get 10% off every seat, every month."

### 5. Overhaul Landing Page Pricing Section

Replace `src/components/landing/PricingPreviewSection.tsx` with a full pricing section that includes:
- Monthly/Annual billing toggle (same pill style as `/pricing` page)
- 3 plan cards with actual prices, 5-6 feature bullets each (pulled from the same data as `/pricing`)
- Annual savings badge on each card
- Bulk discount callout: "Teams of 5+? Save an extra 10%."
- "Start Free Trial" CTA on each card (links to `/signup`)
- Still keep a "Compare all features" link to `/pricing` for the full FAQ
- Mobile: cards stack vertically, toggle uses 44px touch targets (existing pattern)

### 6. Landing Page — Add Feature Comparison Table

Below the pricing cards in the landing page, add a compact feature comparison grid:
- Rows: Key features (Quotes & Invoices, AI Assistant, Voice Minutes, Expenses, Reports, Integrations, Leads, Platform Fee)
- Columns: Lite / Connect / Grow
- Check marks, "60 min" / "200 min", "2.5%" / "1.5%" etc.
- Desktop: standard table. Mobile: horizontally scrollable with sticky first column

---

### File Summary

| Action | File |
|--------|------|
| Stripe | Create `BULK_5_SEATS` coupon (10%, repeating, metadata: threshold=5) |
| Edit | `supabase/functions/create-checkout-session/index.ts` — apply coupon when seats >= 5 |
| Edit | `src/pages/SelectPlan.tsx` — show discounted price at 5+ seats, prominent callout |
| Edit | `src/components/billing/SeatManagementTable.tsx` — mention bulk discount in explainer |
| Rewrite | `src/components/landing/PricingPreviewSection.tsx` — full pricing section with toggle, comparison, bulk callout |

One Stripe coupon creation. One edge function edit. Three UI edits.

