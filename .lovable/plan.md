

# Fix Pricing Inconsistencies Across All Pages

## Problem
The landing page `PricingPreviewSection` component was updated to the single-plan model (€39/mo, 3 users included, +€19/seat), but three other pages still show the old 3-tier (Lite/Connect/Grow) structure:

1. **`/pricing` page** — still shows Lite €19, Connect €39, Grow €69 as separate tiers with billing toggle
2. **`/select-plan` page** — still shows the old tier selection (visible from Settings → "View Plans")
3. **`/pricing` line 318** — still says "7 days free" instead of "14 days"

The Settings subscription section shows "Grow Seats: 1 × €69/mo" because the user's existing subscription is on the old tier — that's data-driven and correct for their current plan. The error in the second screenshot needs investigation (likely the same `list-invoices` org issue from earlier).

## Changes

### 1. `/pricing` page — Rewrite to single plan (`src/pages/Pricing.tsx`)
- Remove the 3-tier `plans` array and billing toggle
- Replace with single plan card matching landing page style: €39/mo, all features, earn-back calculator
- Update FAQs to remove tier-comparison questions
- Fix "7 days free" → "14-day free trial" on line 318
- Update SEO meta title/description

### 2. `/select-plan` page — Simplify (`src/pages/SelectPlan.tsx`)
- Remove tier selection (Lite/Connect/Grow cards)
- Show single plan: €39/mo for 3 users, +€19/extra seat
- Keep seat quantity selector for teams needing more than 3
- Keep the Stripe checkout flow but only for the single plan

### 3. Fix remaining "7 days" reference
- `src/pages/Pricing.tsx` line 318: "7 days free" → "14-day free trial"

## Files

| Action | File |
|--------|------|
| Rewrite | `src/pages/Pricing.tsx` — single plan + earn-back calculator + updated FAQs |
| Rewrite | `src/pages/SelectPlan.tsx` — single plan with seat quantity selector |

## Notes
- The Settings page showing "Grow Seats: 1" is correct — it reflects the user's actual subscription data. Existing subscribers keep their plan; this change only affects new signups and the public pricing pages.
- The error dialog in the Settings screenshot appears to be the `list-invoices` edge function issue that was already fixed earlier. If it persists, it's a separate bug.

