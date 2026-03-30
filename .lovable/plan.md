

## Fix Stripe Billing Flow — Cancel Button, Confirmation Email, Subscription UX

### Problems Identified

1. **No cancel button in Settings** — The only way to cancel is via Stripe's external billing portal ("Manage Billing" button). There's no direct "Cancel Subscription" action in the app itself.
2. **Welcome email is generic** — The webhook sends "Your subscription is now active" with just a € amount, but doesn't say which plan (Starter/Pro/Grow) or how many seats.
3. **Subscription page feels disconnected** — SelectPlan is a standalone page with no back navigation, and the billing tab in Settings is a long scroll of 7 cards with no clear hierarchy.

---

### Fix 1: Add Cancel Subscription Button to SubscriptionOverview

**Edit** `src/components/billing/SubscriptionOverview.tsx`:
- Add a "Cancel Subscription" button (destructive variant) next to "Manage Billing" when subscription is `active` or `trialing` and NOT already `cancel_at_period_end`
- On click, show a confirmation dialog (AlertDialog) explaining they'll keep access until the period end
- On confirm, invoke a new edge function `cancel-subscription` that calls `stripe.subscriptions.update(subId, { cancel_at_period_end: true })`
- After success, invalidate subscription queries and show toast
- When `cancel_at_period_end` is true, show "Resume Subscription" button instead (calls the same function with `cancel_at_period_end: false`)

**Create** `supabase/functions/cancel-subscription/index.ts`:
- Authenticate user → get org → get `stripe_subscription_id` from `subscriptions_v2`
- Accept `{ cancel: boolean }` body (true = cancel, false = resume)
- Call `stripe.subscriptions.update(subId, { cancel_at_period_end: cancel })`
- Update `subscriptions_v2.cancel_at_period_end` accordingly
- Return success

---

### Fix 2: Improve Subscription Confirmation Email

**Edit** `supabase/functions/stripe-webhook/index.ts`:
- In `checkout.session.completed`, after retrieving the subscription, map each line item's `price.id` back to a plan name (Starter/Pro/Grow) using the STRIPE_PRICES map
- Include plan name(s), seat count, billing interval (monthly/annual), and next billing date in the welcome email
- Example: "Plan: Pro (Connect) × 2 seats — €78/month. Next billing: July 30, 2026."

---

### Fix 3: Clean Up Billing Tab UX in Settings

**Edit** `src/pages/Settings.tsx` (billing tab):
- Reorder: `SubscriptionOverview` → `SeatManagementTable` → `StripeConnectSetup` (payments). Remove `SubscriptionPricing` from the billing tab (it duplicates SelectPlan). Remove `GeorgeBillingReports` (noise).
- Keep `TeamManagement` and `GeorgeVoiceOverview` as they serve distinct purposes.

**Edit** `src/components/billing/SubscriptionOverview.tsx`:
- Add a header link "View Plans" that navigates to `/select-plan` for comparison
- Show the actual plan name(s) per seat type instead of just "Lite/Connect/Grow Seats" — use the display names from `STARTER_SEAT_DETAILS`, `PRO_SEAT_DETAILS`

**Edit** `src/pages/SelectPlan.tsx`:
- Add a back button/link at the top: "← Back to Settings"

---

### File Summary

| Action | File |
|--------|------|
| Create | `supabase/functions/cancel-subscription/index.ts` |
| Edit | `src/components/billing/SubscriptionOverview.tsx` |
| Edit | `supabase/functions/stripe-webhook/index.ts` |
| Edit | `src/pages/Settings.tsx` |
| Edit | `src/pages/SelectPlan.tsx` |

One new edge function. No database migrations needed. The `cancel_at_period_end` field already exists on `subscriptions_v2`.

