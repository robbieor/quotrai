## Problem

The `stripe-connect` edge function is failing with:

> The provided key 'rk_live_...bV05KG' does not have the required permissions for this endpoint on account 'acct_1TKo0EDyDQJqDq47'. Having the 'rak_accounts_kyc_basic_read' permission would allow this request to continue.

The currently stored `STRIPE_SECRET_KEY` is a **restricted key** (`rk_live_...`). Stripe Connect (account creation, retrieval, onboarding links, login links) requires a **full secret key** (`sk_live_...`). Restricted keys can't be granted the right Connect permissions for what Revamo does.

This is consistent with your existing memory note `mem://integrations/stripe-api-key-requirement` — restricted keys must be bypassed for Stripe initialization.

## Plan

### Step 1 — Rotate the secret
Open the secure secret update form for `STRIPE_SECRET_KEY` so you can paste the new key. You'll need to:
1. Go to Stripe Dashboard → Developers → API keys
2. Reveal the **Secret key** (starts with `sk_live_`, not `rk_live_` and not `pk_live_`)
3. Paste it into the form

This rotates the key for **all** edge functions that use it: `stripe-connect`, `create-checkout-session`, `connect-checkout`, `connect-webhooks`, `stripe-webhook`, `create-voice-topup-checkout`, `connect-subscription`, `end-trial-early`.

### Step 2 — Add a key-format guard to `stripe-connect`
Add a small `validatePaymentKey()` check at the top of `supabase/functions/stripe-connect/index.ts` that rejects `pk_`, `rk_`, and malformed keys with a clear error message. This way if a restricted key ever gets pasted in again, the function returns a friendly 400 ("Invalid Stripe key: restricted keys are not supported, use sk_live_/sk_test_") instead of bleeding a confusing 403 from Stripe.

### Step 3 — Verify
After the key is rotated:
1. Reload the Settings → Billing page
2. The Connect status check should return cleanly (no 403)
3. Clicking "Connect Bank Account" should successfully open the Stripe onboarding link

### What this does NOT change
- No change to Lovable Payments / built-in payment provider — you keep your own Stripe account.
- No change to Connect architecture, fees, or the 2.9% platform fee logic.
- No data migration. Existing connected accounts (`stripe_connect_account_id` rows) keep working.

## Reply "go" to switch to build mode and ship it.