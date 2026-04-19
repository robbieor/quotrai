

## Launch Readiness Audit — Foreman

**Verdict: NOT ready to launch.** One blocker stops paid subscriptions from syncing. Three other Stripe issues will fire on day one. Several non-blockers should be cleaned up. Otherwise architecture is solid for ~1,000 companies.

---

### 🔴 BLOCKER 1 — Subscription sync silently fails (no one becomes "active")

The `subscriptions_v2.billing_period` column has a CHECK constraint allowing only `'monthly'` or `'annual'`. But three edge functions write `'month'` or `'year'`:

- `create-checkout-session` line 58 — writes `"month"` / `"year"`
- `stripe-webhook` line 91 — writes `"month"` / `"year"`
- `reconcile-subscription` line 98 — writes `"month"` / `"year"`

**DB evidence**: All 7 existing rows in `subscriptions_v2` have `stripe_subscription_id = NULL`. Not a single Stripe checkout has ever successfully written back. Customers will pay Stripe and the app will still treat them as expired/trial.

**Fix**: Standardise on `'monthly'`/`'annual'` everywhere (the constraint and DB rows already use those).

---

### 🔴 BLOCKER 2 — Customer invoice payments use wrong/old Stripe API versions

Functions handling **clients paying invoices** are pinned to `apiVersion: "2023-10-16"` (16 months old) on SDK `stripe@14.21.0` and `stripe@17.4.0`:

- `create-invoice-payment/index.ts` — this is the "Pay Now" button on every invoice portal
- `stripe-connect/index.ts` — onboarding flow for businesses
- `toggle-george-voice/index.ts`
- `list-invoices/index.ts` — uses the not-yet-released `"2026-02-25.clover"` cast as `any`

**Impact**: `2023-10-16` is supported but emits deprecation warnings; `clover` doesn't exist on SDK 18.5 and will throw at runtime when a user opens billing history.

**Fix**: Pin all to `"2025-08-27.basil"` and SDK `stripe@18.5.0` to match the rest of the codebase.

---

### 🔴 BLOCKER 3 — Connect webhooks ignore failed payments

`connect-webhooks` handles `checkout.session.completed` but does NOT handle:
- `payment_intent.payment_failed` (card declined for client invoice payments)
- `charge.refunded` (refund issued from Stripe dashboard → invoice still shows paid in app)
- `account.updated` standard event (only V2 thin events are wired up — businesses without thin events configured won't have `stripe_connect_onboarding_complete` flipped to `true`)

**Impact**: Businesses can complete Stripe onboarding and the app keeps showing "Set up payments" forever.

---

### 🟡 BLOCKER 4 — Welcome email "billing_period" inconsistency

In `stripe-webhook` line 393, the welcome email computes `billingInterval` as `"annual"`/`"monthly"` (different from line 91's `"year"`/`"month"`). Two different conventions in the same file. Cleanup needed once we standardise.

---

### 🟡 Non-blocking issues

1. **Dead code shipped to prod bundle**: `InvestorPitch`, `InvestorMarket`, `InvestorProduct`, `InvestorTeam`, `InvestorForecast`, `FounderProjections`, `FunnelAnalytics`, `AppStoreAssets` are all lazy-loaded routes behind `RoleGuard`. Fine to keep but verify `RoleGuard` actually blocks them — if a regular user hits `/investor/pitch` they should 404, not see the page.
2. **Stripe SDK version sprawl**: 4 different SDK versions in functions (`14.21.0`, `17.4.0`, `18.5.0`, `18.6.0`). Pin all to `18.5.0`.
3. **Console noise**: `connect-webhooks` and `george-chat` log 10–15 console.log per request. Fine for now, will get expensive at 1,000 customers.
4. **No unique index on `subscriptions_v2.stripe_subscription_id`** — only `org_id` is unique. Webhook lookup by `stripe_subscription_id` (line 205, 229) does a full scan. Add `CREATE UNIQUE INDEX ON subscriptions_v2(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL`.

---

### ✅ What's solid for 1,000 companies

- Indexes on hot tables (`invoices`, `quotes`, `jobs`, `customers`) are properly composite-indexed by `team_id` + status/date
- RLS multi-tenancy is enforced via `team_id` and `org_id` everywhere
- Portal token expiration (90 days) is in place
- Webhook idempotency keys on emails prevent duplicate sends
- Stripe Connect application_fee model works (1.5% platform fee, configurable per team)
- Auth flows (no Google OAuth — confirmed removed from current source)

---

### Plan of action (default mode)

1. **Fix billing_period constraint mismatch** — update the 3 edge functions to write `'monthly'`/`'annual'`. Migration to backfill any future bad rows is unnecessary (none exist).
2. **Pin all Stripe API versions** to `2025-08-27.basil` and SDKs to `stripe@18.5.0`. Affects: `create-invoice-payment`, `stripe-connect`, `toggle-george-voice`, `list-invoices`, `connect-checkout`, `connect-products`, `connect-subscription`, `connect-webhooks`.
3. **Add `account.updated` handler** in `connect-webhooks` for businesses without V2 thin events.
4. **Add `payment_intent.payment_failed` and `charge.refunded` handlers** in `connect-webhooks` so client payment failures notify the business and refunds reverse the invoice status.
5. **Add unique partial index** on `subscriptions_v2.stripe_subscription_id`.
6. **Verify**: end-to-end test of (a) signup → trial → upgrade to paid, (b) business connects Stripe → onboarding completes → status flips, (c) client clicks "Pay Now" on invoice → success → emails fire → invoice marked paid.

After these fixes the app is launch-ready for the first 1,000 companies and clients can charge through the portal reliably.

