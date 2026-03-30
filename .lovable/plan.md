

# Foreman Billing Audit — Brutally Honest Assessment

---

## 1. CURRENT STATE ASSESSMENT

**What exists:**
- 3-tier per-seat pricing: Lite (€19), Connect (€39), Grow (€69/custom)
- 7-day free trial provisioned at signup via database trigger
- Stripe Checkout for payment collection, Stripe Customer Portal for management
- Webhook handling for subscription lifecycle (created, updated, deleted, payment failed/succeeded)
- In-app cancel/resume via `cancel-subscription` edge function
- Trial countdown popup (≤5 days), read-only lock after expiry, branded confirmation emails
- Seat management table with live Stripe sync (`sync-seat-to-stripe`)
- Burned accounts ledger for trial abuse prevention

**Verdict: Structurally solid, but feels like 3 different billing systems stitched together.**

The biggest issue: you have **two subscription systems running simultaneously** — the legacy `teams` table (`is_trial`, `trial_ends_at`, `subscription_tier`) and the V2 system (`subscriptions_v2`, `org_members_v2`). Both `useSubscriptionTier` (reads `teams`) and `useSubscription` (reads `subscriptions_v2`) are used across the app. `useReadOnly` checks **both**. This dual-source-of-truth is the root cause of most billing bugs.

**Production readiness: 6/10.** The happy path works. The edge cases are where it breaks.

---

## 2. USER JOURNEY — END TO END

### Sign up → Trial Start
✅ Works. `handle_new_user` trigger creates team + org + subscription with 7-day trial. User lands in-app immediately.

**Gap:** No welcome screen explaining what they get during the trial. They land on Dashboard with no billing context. Users don't know they're on a trial until 5 days in (when the countdown popup appears).

### Trial Experience → Upgrade Prompt
✅ `TrialCountdownPopup` shows at ≤5 days. Dismissible per day.
✅ `ReadOnlyBanner` appears after expiry.
✅ `ReadOnlyGuard` disables mutations.

**Gap:** Days 1-2 of the trial have ZERO billing touchpoints. No "You're on a 7-day trial" indicator anywhere in the main UI. The `SubscriptionOverview` in Settings shows trial status, but users aren't going to Settings on day 1.

### Entering Payment Details
✅ `SelectPlan` → Stripe Checkout. Card collected, trial preserved if remaining.

**Gap:** The checkout flow sends `seatCounts: { connect: 1 }` — a single seat type. But the pricing page lets you pick quantity per plan. If a user picks 3 Lite seats, they get 3 Lite seats on one checkout line item. They can't mix Lite + Connect in a single checkout. This is correct per the UI, but confusing — the seat management table implies you can change seat types later, but the initial checkout is single-type.

### Subscription Activation
✅ Webhook updates `subscriptions_v2`. Welcome email sent with plan details.

**Gap:** The `checkout.session.completed` handler in the webhook uses `PRICE_TO_PLAN` with legacy names: "Starter (Lite)", "Pro (Connect)". These should just be "Lite", "Connect", "Grow" — matching the UI. Mixing names erodes trust.

### Adding Team Members
⚠️ **Partially broken.** The `send-team-invitation` flow inserts into `team_memberships`, and the new trigger syncs to `org_members_v2`. But the `useAddSeat` hook calls `add-subscription-seat` which uses the **legacy** `subscriptions` table (not `subscriptions_v2`). This function is dead code in the V2 world — it reads from the wrong table.

The "Add Seat" button in `SeatManagementTable` invokes `add-subscription-seat`, which:
1. Reads `subscriptions.stripe_subscription_id` (legacy table)
2. Will fail if no legacy subscription exists
3. Uses old Stripe API version `2023-10-16`

**This is a critical bug.** Adding seats from the billing UI will fail for any V2-only customer.

### Ongoing Billing
✅ `invoice.payment_succeeded` marks subscription active.
✅ `invoice.payment_failed` marks `past_due`.
✅ UI shows past_due warning with "Update Payment" button.

**Gap:** No dunning email sent on payment failure. Stripe's built-in retry handles the Stripe side, but the user gets no in-app or email notification that their payment failed. The only signal is the `past_due` badge in Settings.

### Cancellation
✅ In-app cancel/resume works. Confirmation dialog explains period end.
✅ Webhook sends cancellation email on `customer.subscription.deleted`.
✅ Cancel sets `cancel_at_period_end`, resume unsets it.

**Gap:** No "win-back" flow. No reason capture. No offer of a discount or plan change. The user clicks cancel → dialog → done. For a $100M product, you need a cancellation flow that tries to retain.

---

## 3. CRITICAL RISKS

### Risk 1: `add-subscription-seat` reads from wrong table
**Severity: Critical.** It reads from `subscriptions` (legacy), not `subscriptions_v2`. Any V2 customer clicking "Add Seat" gets an error. Must be rewritten to use `subscriptions_v2`.

### Risk 2: Dual subscription state creates inconsistency
`useReadOnly` checks both `teams.is_trial` and `subscriptions_v2.status`. If they disagree (e.g., V2 says "active" but legacy says "trial expired"), the user could be locked out despite having paid. Or worse — unlocked without paying.

### Risk 3: No payment failure notification
If Stripe retries and fails 3 times, the subscription gets deleted. The user's only warning is a badge in Settings they may never visit. No email, no push, no banner on the main dashboard.

### Risk 4: Grow tier is "Contact Us" but has Stripe prices configured
`STRIPE_PRICES.grow` exists with real price IDs, but the UI shows "Custom — Contact Us" with an email button. If someone somehow hits the checkout with `grow` seat type, it would work. This is confusing — either make Grow self-serve or remove the price IDs.

### Risk 5: `PRICING` constants have legacy aliases cluttering the source
`STARTER_SEAT`, `BASE_SEAT`, `ENTERPRISE_SEAT`, `TEAM_SEAT`, `ANNUAL_SEAT` — these legacy aliases in `useSubscriptionTier.ts` create confusion for any developer working on billing. They're a maintenance hazard.

### Risk 6: No idempotency on checkout completion
If the webhook fires twice for the same `checkout.session.completed`, the welcome email gets sent twice. The `idempotency_key` uses `session.id` which is good, but only if the email queue respects it. If `enqueue_email` doesn't deduplicate, customers get duplicate welcome emails.

---

## 4. BILLING UX REVIEW

### Where billing lives
Settings → "Team & Billing" tab. Contains: `SubscriptionOverview`, `TeamManagement`, `SeatManagementTable`, `StripeConnectSetup`.

**Issue:** Billing is buried 2 clicks deep (Settings → tab). During trial, there's no persistent indicator in the main navigation or dashboard that reminds users of their trial status or billing state.

### Clarity assessment

| Element | Status | Notes |
|---------|--------|-------|
| Plan type | ⚠️ | Shown in seat breakdown but not as a prominent header |
| Price | ✅ | Total monthly shown clearly |
| Renewal date | ✅ | Next billing date in card description |
| Trial remaining | ✅ | Progress bar with days remaining |
| Cancel option | ✅ | Visible, with confirmation dialog |
| Payment history | ❌ | No invoice/receipt history in-app. "Manage Billing" opens Stripe portal externally |

### Does it feel "professional SaaS"?
**7/10 on desktop, 5/10 on mobile.** The SubscriptionOverview card is well-designed. The seat management table is clean. But:
- No payment/invoice history visible in-app
- "Manage Billing" kicks users to Stripe's portal (foreign UI, breaks trust)
- No billing-specific success state after checkout (just a toast)

---

## 5. PRICING & PACKAGING FEEDBACK

### Current structure
- Lite: €19/seat/mo — manual tools, no AI
- Connect: €39/seat/mo — AI + voice + reports
- Grow: €69/seat/mo — "Custom, Contact Us"

Plus 2.5% platform fee on Stripe Connect payments (1.5% for Grow).

### Assessment

**Strengths:**
- Per-seat is correct for field service (scales with team size)
- The 2.5% platform fee is smart — aligns incentives
- Annual discount at 15% is industry standard

**Problems:**
1. **Grow is dead weight.** It says "Custom" and "Contact Us" but has real prices in Stripe. Either make it self-serve at €69 or remove it from the pricing page and make it a true enterprise tier with sales calls.
2. **The jump from €19 to €39 is steep (105%).** For a solo plumber, €19 works. When they want AI, doubling the price is a hard sell. Consider a middle step or making the AI upsell more gradual (e.g., AI text at €29, AI voice at €39).
3. **Seat quantity stepper on the pricing page is premature.** Most users choosing a plan don't know how many seats they need yet. Let them pick 1 seat, then add more from Settings. The stepper adds decision friction.
4. **"For 10+ staff firms" on Grow.** This tells small teams (2-5 people) that Grow isn't for them. But the features (Xero sync, reduced fees) are valuable for 3-person teams too.

### Recommendations
- Make Grow self-serve at €69/seat or rebrand it as "Enterprise" with a sales motion
- Remove the seat quantity stepper from initial plan selection
- Consider a €29 "Connect Lite" tier (AI text only, no voice) to bridge the gap

---

## 6. HOW TO IMPROVE — ACTIONABLE

### Fix 1: Rewrite `add-subscription-seat` to use V2 tables
The function currently reads from `subscriptions` (legacy). Must read from `subscriptions_v2` and use the current Stripe API version.

### Fix 2: Add a persistent trial indicator to the sidebar or top bar
Not a banner — a small badge next to the workspace name: "Trial · 5 days left". Always visible, never dismissive. Clickable → Settings billing tab.

### Fix 3: Send payment failure email
In the `invoice.payment_failed` webhook handler, send a branded email: "Your payment failed. Update your card to keep access." Include a link to the Stripe portal.

### Fix 4: Show payment history in-app
Add a "Billing History" section to `SubscriptionOverview` that lists recent invoices from Stripe (via a new edge function that calls `stripe.invoices.list()`). Show date, amount, status, and a link to the hosted invoice PDF.

### Fix 5: Post-checkout success screen
Instead of redirecting to Settings with a toast, redirect to a dedicated `/subscription-confirmed` route with: plan name, next billing date, a "Get Started" button, and optional onboarding prompts.

### Fix 6: Remove legacy `useSubscriptionTier` reads where possible
`useReadOnly` should only check `subscriptions_v2`. The legacy `teams` table check should be a fallback, not a parallel path. Gradually migrate all billing reads to V2.

### Fix 7: Fix the webhook email plan names
Replace "Starter (Lite)" / "Pro (Connect)" with just "Lite" / "Connect" / "Grow" to match the UI.

### Fix 8: Cancellation flow with reason capture
Before confirming cancel, show 3-4 radio options: "Too expensive", "Missing features", "Switching to competitor", "Other". Store in a `cancellation_reasons` table. Optionally offer a discount or downgrade.

---

## 7. IDEAL BILLING FLOW

```text
SIGNUP
  └─ handle_new_user trigger creates:
     team + org + subscriptions_v2 (status: trialing, 7 days)
  └─ User lands on Dashboard
  └─ Sidebar shows "Trial · 7 days"

TRIAL (Days 1-7)
  └─ Sidebar badge counts down daily
  └─ Day 3: Non-intrusive "Upgrade" nudge in morning briefing
  └─ Day 5: TrialCountdownPopup (daily dismissible)
  └─ Day 7: Trial expires → ReadOnlyBanner + ReadOnlyGuard

CHECKOUT
  └─ /select-plan → Pick tier (no quantity stepper)
  └─ Stripe Checkout (card collected)
  └─ Webhook activates subscription
  └─ Redirect to /subscription-confirmed (success screen)
  └─ Welcome email with plan details

ACTIVE SUBSCRIPTION
  └─ Settings → Billing shows: plan, seats, cost, next billing, history
  └─ Add team members → auto-syncs seat to Stripe
  └─ Change seat types → auto-syncs via sync-seat-to-stripe
  └─ All billing changes reflected in-app (no Stripe portal needed for basics)

PAYMENT FAILURE
  └─ Webhook marks past_due
  └─ Email sent immediately with "Update Payment" link
  └─ In-app banner on Dashboard (not just Settings)
  └─ Stripe retries per their dunning schedule

CANCELLATION
  └─ Settings → Cancel → Reason capture → Offer discount/downgrade
  └─ If confirmed: cancel_at_period_end = true
  └─ Access continues until period end
  └─ "Resume" button available until then
  └─ Post-period: status → canceled → ReadOnly mode
```

---

## 8. PRIORITY FIXES

### Top 5 — Must Do Immediately

1. **Rewrite `add-subscription-seat`** to use `subscriptions_v2` and current Stripe API. The current function is broken for V2 customers.

2. **Send payment failure email** in the `invoice.payment_failed` webhook handler. Users with failed payments currently get no notification outside the app.

3. **Fix webhook email plan names** — replace "Starter (Lite)" / "Pro (Connect)" with "Lite" / "Connect" / "Grow".

4. **Add persistent trial badge to sidebar** — users shouldn't discover they're on a trial only when it's about to expire.

5. **Consolidate subscription reads** — `useReadOnly` should primarily use `subscriptions_v2`. The dual-system check is a ticking time bomb for state conflicts.

### Next 5 — After Launch

6. **Add in-app billing history** — list recent invoices with amounts, dates, and PDF links via a `list-invoices` edge function.

7. **Post-checkout success screen** — dedicated route instead of Settings redirect with a toast.

8. **Cancellation reason capture** — radio options before confirming, stored for analytics. Optional retention offer.

9. **Remove legacy pricing aliases** — clean up `STARTER_SEAT`, `BASE_SEAT`, `ENTERPRISE_SEAT`, `TEAM_SEAT` from `useSubscriptionTier.ts`.

10. **Decide on Grow tier** — either make it self-serve at €69 or remove price IDs and make it a true sales-led enterprise tier. The current "Custom + real prices" hybrid is confusing.

---

## BOTTOM LINE

The billing *skeleton* is correct: per-seat pricing, Stripe Checkout, webhook lifecycle, trial enforcement, cancellation. The problem is the **dual-system legacy** (`teams` vs `subscriptions_v2`) and missing edge-case handling (payment failures, seat additions, plan name consistency). Fix the 5 critical items and you have a production-ready billing system. Leave them and you'll have support tickets on day one.

