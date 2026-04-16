
Goal: fix three launch blockers at once: incorrect checkout pricing info, missing subscription confirmation after Apple Pay/Link, and the broken Google sign-in loop.

What I found
- The live billing model in code is now 1 included user, but stale copy still says 3 users in multiple places.
- The text shown inside Stripe checkout is likely coming from the Stripe product/price description, so the app and Stripe config are out of sync.
- Checkout currently redirects straight to `/subscription-confirmed`, and that page shows success immediately without verifying the subscription record first.
- The real subscription update + welcome email happen in `supabase/functions/stripe-webhook/index.ts`, so if the webhook is delayed or misconfigured, the app still looks successful while the account stays unchanged.
- Google auth is using `supabase.auth.signInWithOAuth` directly in `src/hooks/useAuth.ts`. In this Cloud setup, that should be switched to the managed Lovable Cloud OAuth flow, which matches the login-loop symptom you described.

Implementation plan
1. Align pricing and checkout messaging
- Update all stale “up to 3 users” copy in the app to match the current launch model.
- Review and correct the Stripe product name/description used by checkout so the live payment screen matches the actual plan.
- Files likely involved: `src/pages/SelectPlan.tsx`, `src/components/billing/SubscriptionPricing.tsx`, `src/pages/Pricing.tsx`, related billing copy.

2. Make subscription confirmation reliable
- Keep the webhook as the source of truth.
- Update `src/pages/SubscriptionConfirmed.tsx` so it polls the real subscription state for a short window before showing a true success state.
- If the subscription is still pending, show a “We’re confirming your subscription” state instead of a false success message.
- Refresh/invalidate subscription queries so the app updates immediately once confirmation lands.

3. Harden checkout + webhook handoff
- Review `supabase/functions/create-checkout-session/index.ts` and `supabase/functions/stripe-webhook/index.ts` together to make sure org/customer metadata always resolves correctly.
- Verify the live webhook configuration and subscribed events for subscription activation, renewals, and failures.
- Ensure the email confirmation is tied to successful webhook processing, not just redirect completion.

4. Fix Google sign-in properly
- Replace the direct Google OAuth call in `src/hooks/useAuth.ts` with the managed Lovable Cloud Google auth flow.
- Keep redirect handling consistent so users return authenticated instead of landing back on the login form.
- Preserve the current post-auth behavior such as dashboard redirect and invite handling.

5. End-to-end verification
- Test Google sign-in from login and signup.
- Test checkout with card and Apple Pay/Link.
- Confirm all of the following:
  - checkout copy is correct
  - payment completes
  - app subscription status updates automatically
  - confirmation email is sent
  - user does not get stuck on checkout or have to log in again

Technical notes
- Key files: `src/hooks/useAuth.ts`, `src/pages/Login.tsx`, `src/pages/Signup.tsx`, `src/pages/SubscriptionConfirmed.tsx`, `src/pages/SelectPlan.tsx`, `src/components/billing/SubscriptionPricing.tsx`, `supabase/functions/create-checkout-session/index.ts`, `supabase/functions/stripe-webhook/index.ts`.
- Important inconsistency found: pricing constants and checkout logic use `BASE_USERS = 1`, but stale copy still says 3 users.
- Important UX bug found: `SubscriptionConfirmed.tsx` currently claims success without first confirming that the subscription actually became active.
