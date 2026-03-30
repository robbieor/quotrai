

## Fix: Pre-Card Signup Users Get Double Trial

### Problem

Your client signed up before the card-required checkout was implemented. They have a `subscriptions_v2` record with `status: "trialing"` and `trial_ends_at` set, but **no `stripe_customer_id`** (they never went through Stripe Checkout). When their trial expires and they click "Subscribe", `create-checkout-session` grants them another 30-day trial because:

1. They're not in `burned_accounts` (they're legitimate)
2. `isUpgrade` is false (no existing Stripe subscription)
3. So `trialDays = 30` — a free double-dip

Additionally, the SubscriptionOverview still shows "No credit card required" copy (line 137) which contradicts the card-required strategy.

### Fix (2 files)

#### 1. `create-checkout-session` — check if user already used their trial

After the `burned_accounts` check, add a query to `subscriptions_v2` for the user's org. If `trial_ends_at` already exists (meaning they already had a trial), set `trialDays = 0` — they go straight to paid.

```
// After burned_accounts check, before creating session:
if (trialDays > 0 && subscription?.trial_ends_at) {
  trialDays = 0;  // Already had a trial — no second one
}
```

This catches all pre-card users without flagging them as "burned".

#### 2. `SubscriptionOverview.tsx` — fix expired/no-sub copy

- Line 136: Change "Start your 30-day free trial" → "Subscribe to restore full access"
- Line 137-138: Change "No credit card required" → "Choose a plan to continue using Foreman"
- Line 139: Change button text from "Start Free Trial" → "Choose Plan" and navigate to `/select-plan` instead of calling `handleStartSubscription`

### Files changed

| File | Change |
|------|--------|
| `supabase/functions/create-checkout-session/index.ts` | Skip trial if `subscription.trial_ends_at` already set |
| `src/components/billing/SubscriptionOverview.tsx` | Fix copy and CTA for expired users |

### End-to-end result

```text
Pre-card user's trial expires
  → ReadOnlyBanner: "Subscribe to continue"
  → Settings: "Subscribe to restore full access" + "Choose Plan" button
  → /select-plan: pick plan + seats
  → Stripe Checkout: trial_period_days = 0 (no second trial)
  → Card charged immediately
  → Webhook → subscriptions_v2.status = "active"
  → Full access restored
```

