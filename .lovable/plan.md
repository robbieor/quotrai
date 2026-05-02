# Read-Only & Grace-Period Handling for Stripe Failures

## Current state (already in place)

- `stripe-webhook` handles `invoice.payment_failed` → sets `subscriptions_v2.status = 'past_due'` and emails the customer.
- `stripe-webhook` handles `customer.subscription.deleted` → sets status to `canceled`.
- `stripe-webhook` handles `invoice.payment_succeeded` (renewals) → resets status to `active`.
- `useReadOnly()` already grants a **3-day grace** after `current_period_end` for `past_due` accounts, then locks the app.
- `ReadOnlyBanner` and `ReadOnlyGuard` already lock the UI when read-only.

## Gaps to close

1. **Banner copy is trial-only.** When Stripe reports `past_due` and grace is exhausted, users see "Your trial has ended" — confusing and wrong.
2. **No grace-period warning.** During the 3-day grace window the user has full access but sees no nudge to fix their card, so they are blindsided when the lockout hits.
3. **`unpaid` and `incomplete_expired` not handled.** Stripe transitions a subscription to `unpaid` after the dunning retries are exhausted. Today the row stays at `past_due` indefinitely (still inside the 3-day grace from the *last* `current_period_end`, but Stripe's signal is more authoritative).
4. **`customer.subscription.updated` is not switched on.** This event carries authoritative status flips (`past_due` → `unpaid`, manual cancel toggles, plan changes) that we currently miss between renewals.

## What this plan changes

### 1. Webhook hardening (`supabase/functions/stripe-webhook/index.ts`)

Add a `customer.subscription.updated` case that calls the existing `upsertSubscription` helper. This automatically syncs `status`, `current_period_end`, `cancel_at_period_end`, and seat counts on every Stripe-side change — covering `past_due → unpaid`, `active → canceled (at period end)`, plan upgrades, and dunning exhaustion.

No other webhook changes — `invoice.payment_failed` and `customer.subscription.deleted` already do the right thing.

### 2. Read-only logic (`src/hooks/useReadOnly.ts`)

Extend the hook to also lock the account immediately when status is `unpaid`, `incomplete_expired`, or `canceled` with `current_period_end` in the past. Keep the 3-day grace for `past_due` only.

Return shape changes from `boolean` to:

```ts
{ isReadOnly: boolean; reason: 'trial_expired' | 'past_due_grace' | 'unpaid' | 'canceled' | null; graceEndsAt: Date | null }
```

Add a thin `useReadOnly()` boolean wrapper for backwards compatibility so existing call sites in `ReadOnlyGuard` / `ReadOnlyBanner` keep working. New callers use `useReadOnlyState()` for the rich object.

### 3. Banner copy (`src/components/billing/ReadOnlyBanner.tsx`)

Switch on `reason` and show the right message:

- `trial_expired` → existing copy.
- `past_due_grace` → **warning** banner (amber, not destructive): "Payment failed. Update your card before {graceEndsAt} to avoid losing access." CTA = "Update Payment".
- `unpaid` → destructive banner: "Your subscription is unpaid. Update your card to restore access." CTA = "Update Payment".
- `canceled` → existing copy variant: "Your subscription ended. Resubscribe to regain access." CTA = "Choose Plan".

The grace banner is shown **even when the app is not yet read-only** (because grace is the warning window). `ReadOnlyGuard` continues to gate writes only when `isReadOnly === true`.

### 4. Settings → Billing surface

Add a small `PaymentStatusCard` in `src/components/billing/SubscriptionOverview.tsx` (or co-located) that mirrors the banner reason and links to the Stripe customer portal so users can replace their card without leaving the app. (Customer portal session creation already exists in another edge function — reuse it if present, otherwise add a one-line `create-billing-portal-session` call.)

## Files touched

- `supabase/functions/stripe-webhook/index.ts` — add `customer.subscription.updated` handler.
- `src/hooks/useReadOnly.ts` — extend to return reason + grace end; keep boolean export.
- `src/components/billing/ReadOnlyBanner.tsx` — branch copy on reason, add amber grace variant.
- `src/components/billing/SubscriptionOverview.tsx` — add Payment Status row tied to the same hook.
- (Optional, only if missing) `supabase/functions/create-billing-portal-session/index.ts` — quick portal-session creator for the "Update Payment" CTA.

## Out of scope

- No DB migration needed — `subscriptions_v2.status` already accepts the Stripe status strings written by the webhook.
- No changes to trial logic, seat sync, or Connect (platform-side payments).
- No polling fallback — the webhook + reconcile-subscription function we already have is sufficient; we'd only add polling if we start seeing missed events in logs.

## Acceptance criteria

1. A test card that fails on renewal flips the org to `past_due`; user sees an **amber banner with the grace deadline** but can still use the app.
2. After the 3-day grace, the app locks and the banner switches to the destructive "subscription unpaid" variant.
3. If Stripe's dunning fully fails before the 3 days (status → `unpaid`), the app locks immediately on the next webhook.
4. Re-paying via the portal flips the org back to `active` on `invoice.payment_succeeded` and the banner disappears.
5. Manual cancel from Stripe dashboard (`customer.subscription.updated` with `cancel_at_period_end=true`) is reflected in the UI without waiting for the period to end.
