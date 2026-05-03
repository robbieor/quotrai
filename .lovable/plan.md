## Goal

Completely remove the "Subscription Covered" concept. The premise (platform fees on payments offsetting subscription) is misleading — jobs get paid regardless of whether payment runs through the app. Strip it from the dashboard, the analytics edge function, the type system, the landing page earn-back calculator, and memory.

## Changes

### 1. Dashboard (remove the card)
**`src/pages/Dashboard.tsx`**
- Remove the `SubscriptionCoveredCard` import.
- Change the 3-column grid (`Revenue by Job Type + Money Out + Subscription Covered`) to a 2-column grid containing only `RevenueByJobTypeChart` and `ExpenseBreakdownCard`.
- Update the section comment.

**Delete file:** `src/components/dashboard/SubscriptionCoveredCard.tsx`

### 2. Analytics hook (remove type + field)
**`src/hooks/useDashboardAnalytics.ts`**
- Delete the `SubscriptionCoveredData` interface.
- Remove `subscriptionCovered: SubscriptionCoveredData;` from the query return type.
- Simplify the realtime invalidation effect: previously it watched `teams` UPDATE and `profiles` changes specifically to refresh the Subscription Covered card. With the card gone, drop the `teams` subscription entirely. The `profiles` listener is no longer needed for this metric — remove the whole effect (no other consumer depends on it).

### 3. Edge function (stop computing it)
**`supabase/functions/dashboard-analytics/index.ts`**
- Delete the entire "Subscription Covered metric" block (lines ~505–541): the caller-profile lookup, member count query, tier price table, fee/percent computation, and the `subscriptionCovered` object.
- Remove `subscriptionCovered` from the returned `result` object.

### 4. Landing page (remove earn-back narrative)
**`src/components/landing/PricingPreviewSection.tsx`**
- Remove the entire "Earn-back mini card" block (the calculator with the invoice-volume slider, progress bar, "Subscription covered…" / "Invoice X to fully cover it" copy, and the `Calculator` icon usage).
- Remove the now-unused state (`monthlyInvoice`), derived values (`platformEarnings`, `coveragePercent`, `isFullyCovered`, `surplus`, `breakeven`, `crew`, `crewMonthlyEquiv`, `PLATFORM_FEE`), the `Slider` and `Progress` imports, the `Calculator` icon import, and the `PRICING`/`ALL_TIERS` import for the calculator (keep `ALL_TIERS` since the tier cards still use it).
- Update the section subhead — replace "Software that pays for itself" badge and the "The 2.9% platform fee on integrated payments earns most teams their subscription back inside a month." sentence with neutral copy that describes the plans without implying self-funding (e.g. badge: "Simple pricing" / subhead: "Three plans. No seat caps. Pick the level of automation you want.").

### 5. Memory cleanup
- Delete `mem://features/subscription-covered-metric` (rule no longer applies).
- Update `mem://index.md` to remove that line from the Memories list.

## Out of scope

- No database migrations needed (metric was computed on the fly; nothing stored).
- Pricing tiers, Stripe Connect 2.9% fee logic, and `useSubscriptionTier` remain untouched — only the *narrative* that the fee covers the subscription is removed.
