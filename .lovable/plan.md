

## Market-Ready Trial & Subscription Flow

### Problems identified

1. **Trial banner only shows at 3 days remaining** — users have no countdown during the first 27 days of their 30-day trial
2. **No dismissible countdown popup** — competitors show a persistent-but-closable trial counter
3. **Trial in `create-checkout-session` is hardcoded to 14 days** instead of 30 days (contradicts marketing and the `handle_new_user` trigger which sets 30 days)
4. **No branded confirmation/welcome emails on subscription** — when someone subscribes via Stripe, no Foreman-branded email is sent to the customer or to support@foreman.ie
5. **No repeat-trial prevention at checkout level** — the `burned_accounts` table exists but `create-checkout-session` doesn't check it before granting a trial
6. **FAQ says "No credit card needed"** — contradicts the trial-with-card strategy

### Plan (6 changes)

#### 1. Dismissible trial countdown popup (shows at 10 days remaining)
**File:** New `src/components/billing/TrialCountdownPopup.tsx`

- A dialog/modal that shows when `trialDaysRemaining <= 10` and trial is active
- Dismissible via X button — stores `trial_popup_dismissed_{date}` in localStorage so it only shows once per day
- Shows countdown ring/number, plan name, "Subscribe Now" CTA button
- Branded with Foreman colors (navy header, primary CTA)
- Rendered in `DashboardLayout.tsx` alongside `TrialBanner`

#### 2. Update TrialBanner to always show during trial
**File:** `src/components/billing/TrialBanner.tsx`

- Remove the `trialDaysRemaining <= 3` gate — show a subtle info banner for the entire trial period with days remaining
- Keep the destructive banner for expired trials unchanged
- Show amber warning style when <= 3 days, neutral info style otherwise

#### 3. Fix trial_period_days to 30 in checkout
**File:** `supabase/functions/create-checkout-session/index.ts`

- Change `trial_period_days: isUpgrade ? 0 : 14` → `trial_period_days: isUpgrade ? 0 : 30`
- Add check against `burned_accounts` table: before creating a trial checkout, query `burned_accounts` for a SHA-256 hash of the user's email. If found, set `trial_period_days: 0` (no trial, immediate charge)

#### 4. Send branded emails on subscription events
**File:** `supabase/functions/stripe-webhook/index.ts`

- On `checkout.session.completed` with `mode === "subscription"`:
  - Send a branded welcome/subscription confirmation email to the customer via the `enqueue_email` RPC (transactional queue)
  - Send an admin notification to support@foreman.ie with subscription details (plan, amount, customer email) using the same branded HTML template pattern as the signup admin notification
- On `customer.subscription.deleted`:
  - Send a branded cancellation confirmation to the customer

#### 5. Fix FAQ copy to match trial-with-card strategy
**File:** `src/pages/SelectPlan.tsx`

- Change FAQ "No credit card needed" → "Card is collected to ensure seamless transition after your 30-day trial. Cancel anytime — you won't be charged until the trial ends."

#### 6. Cancel-before-trial-ends flow
Already supported by Stripe's billing portal (`create-customer-portal-session`). Ensure the trial banner and popup both include a "Manage Subscription" link that opens the portal, so users can cancel before the trial ends.

### Files changed

| File | Change |
|------|--------|
| `src/components/billing/TrialCountdownPopup.tsx` | New dismissible popup component |
| `src/components/billing/TrialBanner.tsx` | Show banner for entire trial, not just last 3 days |
| `src/components/layout/DashboardLayout.tsx` | Add `TrialCountdownPopup` |
| `supabase/functions/create-checkout-session/index.ts` | Fix to 30-day trial, add burned_accounts check |
| `supabase/functions/stripe-webhook/index.ts` | Add branded customer + admin emails on subscription events |
| `src/pages/SelectPlan.tsx` | Fix FAQ copy |

### Deployment
- Redeploy `create-checkout-session` and `stripe-webhook` edge functions after changes

