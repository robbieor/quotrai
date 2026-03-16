

# Stripe Billing Audit: Issues Found & Fix Plan

## Issues Discovered

### 1. CRITICAL: Webhook updates v1 tables, app reads v2
The `stripe-webhook` function writes to the legacy `subscriptions` table (v1), but the entire app reads from `subscriptions_v2`. When a checkout completes or subscription updates, the v2 record **never gets updated** — it stays in `"pending"` status forever. This is why seat changes appear "stuck."

### 2. Annual pricing display mismatch (minor but real)
The UI calculates annual prices using `Math.round()`:
- Connect annual: displays **€296** but Stripe charges **€295.80** (`29580` cents)
- Grow annual: displays **€500** but Stripe charges **€499.80** (`49980` cents)
- Lite annual: displays **€153** and Stripe charges **€153.00** — correct

The displayed "save" amounts are therefore slightly wrong.

### 3. Stripe API version inconsistency
- `create-checkout-session` and `sync-seat-to-stripe` use `apiVersion: "2023-10-16"` with `stripe@14.21.0`
- `stripe-webhook` uses `apiVersion: "2025-08-27.basil"` with `stripe@18.5.0`

This can cause type mismatches and unexpected behavior between functions.

## Fix Plan

### A. Rewrite `stripe-webhook/index.ts` to update v2 tables
- On `checkout.session.completed` (subscription mode): read `org_id` from `subscription_data.metadata`, upsert `subscriptions_v2` with `status: "active"`, period dates, and Stripe IDs
- On `customer.subscription.updated`: find by `stripe_subscription_id` in `subscriptions_v2` and update status/period
- On `customer.subscription.deleted`: update `subscriptions_v2` to `"canceled"`
- Keep the existing invoice payment handling for `checkout.session.completed` with `type: "invoice_payment"` metadata

### B. Fix annual pricing constants in `useSubscriptionTier.ts`
Change from `Math.round()` to exact values matching Stripe:
```
ANNUAL_CONNECT_SEAT: 295.80  (not 296)
ANNUAL_GROW_SEAT: 499.80     (not 500)
```
This ensures the UI matches exactly what Stripe charges.

### C. Standardize Stripe SDK versions
Update `create-checkout-session` and `sync-seat-to-stripe` to use the same Stripe SDK version (`stripe@18.5.0`) and API version as the webhook for consistency.

## Files Changed

| File | Action |
|------|--------|
| `supabase/functions/stripe-webhook/index.ts` | Rewrite to update `subscriptions_v2` |
| `src/hooks/useSubscriptionTier.ts` | Fix annual price constants |
| `supabase/functions/create-checkout-session/index.ts` | Update Stripe SDK version |
| `supabase/functions/sync-seat-to-stripe/index.ts` | Update Stripe SDK version |

