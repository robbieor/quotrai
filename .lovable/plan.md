
The user is asking whether the checkout flow issues they raised earlier (incorrect "3 users" copy, Apple Pay completing without confirmation, no email, no subscription update) have actually been resolved. Let me check what was done vs what's still outstanding.

From the summary:
1. ✅ Pricing copy updated in Pricing.tsx + InvestorForecast.tsx
2. ✅ SubscriptionConfirmed.tsx now polls the DB before showing success
3. ❌ Stripe product/price description on the Stripe-hosted checkout sheet — NOT changed (this is the "€39 for up to 3 accounts" the client saw on Stripe's screen)
4. ❌ create-checkout-session + stripe-webhook handoff — never reviewed
5. ❌ Webhook config (events, signing secret) — never verified
6. ❌ Email confirmation tied to webhook — never verified
7. ❓ Apple Pay/Link silent failure root cause — never investigated

Let me verify by checking the actual files and recent webhook logs.

I should:
- Check create-checkout-session and stripe-webhook code
- Check recent webhook logs to see if events are arriving
- Check the subscriptions_v2 table for recent activity
- Check the Stripe product description being used

Then present a status + remaining-work plan.

## Status of your checkout fixes

**Done**
- App-side "3 users" copy cleaned up (Pricing page + investor forecast)
- Confirmation page now waits for the real subscription record before saying "You're all set" — no more false success

**Not done yet (the actual blockers your client hit)**
1. **Stripe-hosted checkout still shows the wrong copy.** The "€39 for up to 3 accounts" your client saw is text living on the Stripe product itself, not in our app. Nothing was changed on Stripe's side. This needs either a manual rename in Stripe, or I update the checkout session to override the product name/description on the fly.
2. **Apple Pay silent failure not diagnosed.** I never opened `create-checkout-session` or `stripe-webhook` to check why the payment took money but no subscription/email landed. That's the most serious one.
3. **Webhook health not verified.** No check on whether Stripe is actually delivering `checkout.session.completed` / `customer.subscription.created` events to our endpoint, whether the signing secret matches, or whether events are silently 4xx'ing.
4. **Confirmation email path not verified.** The welcome email is supposed to fire from the webhook — if the webhook isn't firing, the email never sends. Not yet checked.

## Plan to actually close this out

**Step 1 — Diagnose (read-only, ~2 min)**
- Read `supabase/functions/create-checkout-session/index.ts` and `supabase/functions/stripe-webhook/index.ts`.
- Pull recent logs for both functions to see if Apple Pay sessions are creating, and whether webhook events are arriving and succeeding.
- Query `subscriptions_v2` for the most recent rows to see if any payment activity reached the DB.

**Step 2 — Fix Stripe-hosted copy**
- Override the line item name/description in `create-checkout-session` so the Stripe payment sheet shows the correct plan ("Foreman — 1 user included, €15/extra seat") regardless of what the Stripe product is named. This avoids needing you to log into Stripe.

**Step 3 — Fix the Apple Pay → no confirmation gap**
Most likely one of these (will confirm in Step 1):
- Webhook signing secret mismatch → events rejected silently
- Missing `checkout.session.completed` in subscribed events list
- Metadata (org_id / user_id) not attached to the session, so the webhook can't link the payment to an account
- Webhook handler erroring before it writes to `subscriptions_v2` or enqueues the email

Fix whichever applies, and add a fallback: on the `/subscription-confirmed` page, if polling times out, call a "reconcile" function that pulls the session from Stripe directly and writes the subscription row — so even if the webhook fails, the user's account still activates.

**Step 4 — Confirm welcome email fires from the webhook path**, not the redirect.

**Step 5 — End-to-end test**
- Test card checkout
- Test Apple Pay / Link
- Confirm: correct copy on Stripe sheet, subscription appears in app, welcome email sent, no stuck states.

Short version: the **app-side cosmetics are fixed**, the **actual payment-doesn't-activate-account bug is not**. Approve and I'll dig into the edge functions and webhook config next.
