

# Add "Subscription Covered" Metric to Dashboard

## What it does
A new card on the dashboard showing how much of the user's Foreman subscription (€39 base + €15 per extra seat) has been offset by the 2.9% platform fee earned on payment processing. Displays a percentage and euro amount with a progress-style indicator.

## Implementation

### 1. Edge Function — compute platform fee earned
In `supabase/functions/dashboard-analytics/index.ts`:
- Calculate `platformFeeEarned = cashCollected * 0.029` (the 2.9% platform fee on all payments processed)
- Fetch the team's current subscription cost: query the `teams` table for member count, then compute `subscriptionCost = 39 + max(0, memberCount - 1) * 15`
- Add a new `subscriptionCovered` object to the response: `{ feeEarned, subscriptionCost, percentCovered }`

### 2. Types — update analytics hook
In `src/hooks/useDashboardAnalytics.ts`:
- Add `SubscriptionCoveredData` interface with `feeEarned`, `subscriptionCost`, `percentCovered`
- Add `subscriptionCovered` to the return type

### 3. New component — SubscriptionCoveredCard
Create `src/components/dashboard/SubscriptionCoveredCard.tsx`:
- Displays "Subscription Covered" with a circular or bar progress indicator
- Shows percentage covered (e.g. "72% covered") as the headline
- Sub-metric: "€X.XX earned of €Y.YY" 
- Context line: positive if ≥100% ("Subscription paid for itself!"), warning if <50%, neutral otherwise
- Uses the existing KPICard-like styling to match the dashboard

### 4. Dashboard layout — add the card
In `src/pages/Dashboard.tsx`:
- Place the `SubscriptionCoveredCard` in the empty placeholder slot next to `RevenueByJobTypeChart` (line 246), replacing the `<div />` placeholder

