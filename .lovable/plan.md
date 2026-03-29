

## Fix: Monthly/Annual Toggle Missing on Mobile + Wiring Verification

### Problem
The `SubscriptionPricing` component in Settings has a monthly/annual toggle, but on mobile:
1. The 3-column grid (`md:grid-cols-3`) stacks to single column — the toggle is there but the cards are very long, pushing the toggle out of view
2. The toggle buttons lack proper mobile touch targets (small `px-4 py-2`)
3. The `handleSubscribe` function correctly passes the billing interval to `create-checkout-session`, which maps it to the right Stripe price ID — this wiring is correct
4. The `SelectPlan` page has a `BillingToggle` component but its cards don't have subscribe buttons — only the bottom "Start Free Trial" CTA works, and it hardcodes `connect: 1`

### Changes

| File | Change |
|------|--------|
| `src/components/billing/SubscriptionPricing.tsx` | Make toggle a proper pill-style toggle with larger touch targets (min 44px height). Change grid to `grid-cols-1 md:grid-cols-3`. Add sticky positioning for toggle on mobile so it stays visible while scrolling plans. |
| `src/pages/SelectPlan.tsx` | Add "Choose Plan" buttons to each `PlanCard` that invoke `create-checkout-session` with the correct `seatCounts` and `interval`. Wire billing interval from `BillingToggle` through to checkout. Currently the only CTA is "Start Free Trial" which always sends `connect: 1` — each card needs its own checkout button. |

### Toggle design (both locations)
- Pill-style container with `bg-muted rounded-full p-1` wrapper
- Two segments inside, active one gets `bg-primary text-primary-foreground rounded-full`
- Min height 44px for mobile touch compliance
- Annual badge ("Save 15%") positioned inline, not absolute (avoids clipping on mobile)

### Wiring verification
- `SubscriptionPricing.handleSubscribe` → passes `seatCounts: { [plan.code]: 1 }` + `interval` → `create-checkout-session` edge function → looks up `STRIPE_PRICES[seatType][billingInterval]` → creates Stripe Checkout with correct price ID ✅
- `SelectPlan.handleStartTrial` → currently hardcodes `connect: 1` — will be updated so each plan card sends its own seat type
- Both pages will pass `"month"` or `"year"` to match the edge function's expected values

### Files changed: 2

