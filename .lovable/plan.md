

## Fix: Remove Stuck Trial Banner + Fix Manage Billing Spinner

### Issue 1: Trial Banner stuck at top, redundant
The `TrialBanner` in `DashboardLayout` duplicates the trial countdown already shown in `SubscriptionOverview` on the Settings page. It cannot be dismissed and takes up permanent screen space. The `TrialCountdownPopup` (dismissible dialog) already handles trial reminders.

**Fix:** Remove `<TrialBanner />` from `DashboardLayout.tsx` entirely. The dismissible `TrialCountdownPopup` and the `SubscriptionOverview` card handle trial messaging.

### Issue 2: "Manage Billing" button spins forever
For trial users, there is no `stripe_customer_id` in `subscriptions_v2` yet (they haven't completed Stripe Checkout). The `create-customer-portal-session` edge function throws `"No Stripe customer found"` which returns a 400. However the button stays in a loading state because `supabase.functions.invoke` may not throw on non-2xx responses — it returns `{ data: { error: "..." }, error: null }`, so the catch block never fires and `data?.url` is undefined, meaning `window.location.href` is never set and the `finally` block may not behave as expected.

**Fix:** In `SubscriptionOverview.tsx`:
- Check `data?.error` explicitly after invoke and throw
- For trial users without `stripe_customer_id`, change the button to "Choose a Plan" linking to `/select-plan` instead of trying to open a nonexistent Stripe portal

### Files changed

| File | Change |
|------|--------|
| `src/components/layout/DashboardLayout.tsx` | Remove `TrialBanner` import and usage |
| `src/components/billing/SubscriptionOverview.tsx` | Fix `handleManageBilling` to handle `data.error` response; show "Choose Plan" button for trial users without Stripe customer |

