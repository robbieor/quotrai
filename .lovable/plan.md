

# Critical-Path Audit — Foreman (revenue & money flows)

Scope: signup → trial → checkout → Stripe sync → seat add/remove → webhooks → invoice → payment receipt. Findings are file/line specific. Severity: 🔴 must-fix this week, 🟠 fix soon, 🟡 cleanup.

---

## 1. Pricing config is split across 3 files and disagrees with itself

You have **three sources of truth** for prices and they actively contradict each other. This is the #1 revenue risk right now — checkout charges the wrong amount depending on which path the user takes.

| File | Crew monthly | Business monthly | Seat | Notes |
|---|---|---|---|---|
| `src/hooks/useSubscriptionTier.ts` (L67-83) | `price_1TIJDe…` (legacy €39 pretending to be €49) | `price_1TOmfH…` (✅ real €89) | seat €15 (legacy) | Has TODO placeholders |
| `supabase/functions/create-checkout-session/index.ts` (L25-57) | same legacy €39 | **`price_TODO_BUSINESS_MONTHLY` — checkout will throw `resource_missing`** | seat €15 | Business literally cannot be purchased |
| `supabase/functions/sync-seat-to-stripe/index.ts` (L11-13) | hardcoded €39 base + €15 seat, **single-plan only** | not aware of Business | seat €15 | Will silently downgrade Business subs to Crew on next member change |
| `supabase/functions/add-subscription-seat/index.ts` (L11) | n/a | n/a | hardcoded €15 | Same |
| `supabase/functions/stripe-webhook/index.ts` (L386-391) | `PRICE_TO_PLAN` map only knows the 4 legacy IDs | n/a | "Extra Seat" | Welcome email shows wrong plan name for any new tier |

**🔴 Fix list:**
1. Create the missing Stripe prices: Solo monthly/annual, Crew monthly/annual at €49/€499.80, Crew seat at €19/€193.80, Business seat at €19/€193.80. (Already approved and partly done — finish the remaining 6.)
2. Move all price IDs into a single `supabase/functions/_shared/pricing.ts` module that both edge functions import. Re-export the same constants in `src/hooks/useSubscriptionTier.ts` via a thin TS file shared with edge.
3. Replace `BASE_PLAN_PRICE` / `EXTRA_SEAT_PRICE` constants in `sync-seat-to-stripe` and `add-subscription-seat` with a tier-aware lookup that reads the **current subscription's existing line items** and re-uses the same price IDs (don't assume Crew).
4. Update `PRICE_TO_PLAN` in `stripe-webhook` (L386) to be generated from the same shared map, so it never goes stale again.

---

## 2. `sync-seat-to-stripe` will destroy Business and Solo subscriptions 🔴

`supabase/functions/sync-seat-to-stripe/index.ts` L108-113:

```ts
for (const [priceId, item] of Object.entries(currentItems)) {
  if (priceId !== BASE_PLAN_PRICE && priceId !== EXTRA_SEAT_PRICE) {
    items.push({ id: item.id, deleted: true });
  }
}
```

This deletes **every line item that isn't the legacy €39 Crew base or €15 Crew seat**. The first time anyone on Business adds or removes a member:
- Business €89 line item → deleted.
- Crew €39 line item → added.
- Customer is silently downgraded and underbilled by €40+/mo, but keeps premium access. Pure revenue leak.

**🔴 Fix:** Detect the existing tier from the current Stripe sub items (`stripeSub.items.data[0].price.id` → reverse-lookup), then sync only that tier's base + seat prices. Never delete unknown items unless they're explicitly known legacy.

---

## 3. `add-subscription-seat` always charges €15, never €19 🔴

`add-subscription-seat/index.ts` L11 hardcodes `EXTRA_SEAT_PRICE = "price_1TKjaNDQETj2awNEXHD4jFRq"` (€15 legacy). New Crew/Business customers using "Add seat" from the UI will be undercharged €4/seat/month, indefinitely.

**🔴 Fix:** Read the existing subscription's interval (month/year) and tier, then pick `TIER_PRICES[tier][interval].seat` from the shared pricing module.

---

## 4. Two parallel tenancy models (`teams` vs `org_members_v2`) 🔴

Evidence the model is still mid-migration:
- Webhook + checkout + sync write to `subscriptions_v2.org_id` and read from `org_members_v2`.
- `useSubscriptionTier` (L329-344) reads `profiles.team_id` and the `teams` table (the *old* model) for tier/voice limits.
- `useSeatUsage` (L137) calls `get_user_team_id` + `get_team_seat_usage` (old model).
- `add-subscription-seat` L36 uses `get_user_org_id_v2`, but L40-52 also reads `team_memberships` for the role check.
- `create-invoice-payment` L41 still scopes the Connect account by `teams.id`.

**Concrete failure modes:**
- A user added via `org_members_v2` but missing from `team_memberships` → role check passes (line 60 falls through silently when `profile?.team_id` is null) and a non-owner can add seats.
- Voice minutes (`teams.george_voice_minutes_*`) and seat counts (`subscriptions_v2.seat_count`) can drift — there's no trigger keeping them aligned.
- Tier changes update `subscriptions_v2.plan_id` but `useSubscriptionTier` reads `teams.subscription_tier`. UI won't reflect the new plan until something manually mirrors it.

**🔴 Fix:**
1. Add a SQL trigger on `subscriptions_v2` that mirrors `status`, `plan_id`, `seat_count`, `trial_ends_at` into the matching `teams` row by joining `org_members_v2`.
2. Replace the `team_memberships` role check in `add-subscription-seat` (L46-60) with `is_org_owner_v2(orgId)` RPC — same source of truth as everywhere else.
3. Stop reading subscription state from `teams` in `useSubscriptionTier`. Switch to `useSubscription()` from `useSubscription.ts` and derive `currentPlan` from `subscriptions_v2.plan_id`.

---

## 5. Stripe webhook: silent failures + missing events 🟠

`supabase/functions/stripe-webhook/index.ts`:
- L161 `switch`: handles 5 events. Missing `customer.subscription.trial_will_end` (no trial-ending email), `charge.refunded` (no refund recording → invoice still marked paid), `invoice.payment_action_required` (SCA/3DS — user gets no notification).
- L168 `resolveOrgId` returns `null` and you only `console.log` (L172). The HTTP response is still 200 → Stripe never retries → subscription stays orphaned forever.
- L464 catch-all returns **400 on any internal error**. Stripe will retry, which is good, but you also return 400 for "missing signature" (L149) which is correct, and for downstream DB failures, which means a transient Supabase blip causes Stripe to retry the same event up to 3 days. Distinguish: 400 for signature/parse errors, **500 for processing errors** (Stripe will retry with backoff).
- L211-232 `invoice.payment_succeeded` only flips status to `active` when `billing_reason === "subscription_cycle"`. The very first paid invoice has `billing_reason === "subscription_create"` and is skipped — fine because `customer.subscription.created` handles it, but worth a comment.
- L286-363 The "invoice payment recorded" branch inserts into `payments` with `payment_method: "card"` but **does not check idempotency**. Stripe retries the same `checkout.session.completed` event → duplicate `payments` row → invoice balance trigger double-decrements → invoice shows credit. 🔴
- L94 `subscription.items.data[0]?.price.recurring?.interval` — if the first item is the **seat** (not base), this works, but you should pick the base item explicitly.

**🟠/🔴 Fix:**
1. Add `payments` unique index on `(invoice_id, notes)` or store `stripe_session_id` and `ON CONFLICT DO NOTHING`.
2. On `resolveOrgId` failure, return 500 so Stripe retries.
3. Add the 3 missing event handlers above (refund, trial-ending, action-required).

---

## 6. Anyone can mark any invoice paid via the unauthenticated payment endpoint 🔴

`supabase/functions/create-invoice-payment/index.ts` is **unauthenticated** (it only requires a `portal_token`). That's by design for customer payment, BUT:
- L34 only blocks `status === "paid"`. There's no check that the invoice is actually *unpaid and outstanding* (e.g. status `"draft"`, `"void"`, or `"cancelled"` will still let a Stripe checkout session be created for it, and on success the webhook flips it to `"paid"`).
- The webhook (L286-363) trusts `session.metadata.invoice_id` and updates that row to `paid` without re-validating the original status. A draft invoice silently becomes paid.
- The amount comes from `lineItems` re-computed from `invoice.items` (L65) — fine — but `invoice.tax_amount` is added as a separate line on top of items that may already include tax depending on the user's price entry mode. Risk of double-charging tax.

**🔴 Fix:**
1. In `create-invoice-payment` add `if (!["sent","overdue","partially_paid"].includes(invoice.status)) throw "Not payable";`.
2. In the webhook, before flipping to paid, re-read the invoice and only update if previous status was payable.
3. Decide once whether `invoice.items[].unit_price` is tax-inclusive or exclusive and document it; remove the separate tax line if items already include it.

---

## 7. RLS holes & policy issues 🟠

From `pg_policies`:
- `org_members_v2 INSERT` `with_check = is_org_admin_or_owner_v2(org_id)` ✅ but **the qual is empty in pg_catalog SELECT view** for both `invoices` INSERT and `payments` INSERT. They're actually fine (with_check is set), but worth verifying with a manual test that an unauthenticated user cannot insert.
- `subscriptions_v2` has no INSERT policy at all → only service role can insert. ✅ Good.
- `burned_accounts` is service-role only ✅, but `create-checkout-session` L166-170 queries it with the **anon-keyed user client** (line 26 uses `supabaseServiceKey` actually — ✅ fine).
- `profiles` policies not shown but heavily depended on. Check that profile email isn't readable by other tenants — it's used in webhook L318-322 to find the owner; if a tenant could write a profile with another team's `team_id`, they'd intercept payment-received emails. 🟠 Verify.

**🟠 Fix:** Add a regression test (psql script) that, as a logged-in non-owner user, attempts:
- `UPDATE subscriptions_v2` of own org (should fail unless owner)
- `INSERT INTO payments` for another team's invoice (should fail)
- `SELECT * FROM profiles WHERE team_id != my_team_id` (should return 0)

---

## 8. Trial / burned-accounts logic bypass 🟠

`create-checkout-session` L157-176:
- Burned check uses `email.eq.<plain>,email.eq.<sha256>`. If the row was inserted with the hash but later code stops hashing, or vice versa, repeat trials slip through. Pick one (hashed) and migrate.
- L193-201 "preserve existing trial" reads `subscription.trial_ends_at` from your DB. If a malicious user manually `UPDATE subscriptions_v2 SET trial_ends_at = '2099-…'` they get free access. RLS should prevent it (L4 of subscriptions_v2 policies allows owner UPDATE). 🔴 **Owners can extend their own trial indefinitely via the public API.** Restrict the UPDATE policy to specific columns (Postgres 15+ doesn't support per-column policy on UPDATE without rewrites — use a trigger that resets `trial_ends_at` to its OLD value on owner-driven updates; only service role can change it).

---

## 9. ROI calculator is now consumer-facing math but inconsistent with billing 🟡

`src/components/landing/ROICalculator.tsx` uses `TIER_PRICING` constants duplicated locally. They're correct *today* but will silently drift the next time you change pricing.

**🟡 Fix:** Import `PRICING` from `useSubscriptionTier.ts`. (You already have `SOLO`, `CREW`, `BUSINESS`, `EXTRA_SEAT` there.)

---

## 10. Front-end revenue UX gaps 🟡

`src/hooks/useSubscription.ts`:
- `useSeatUsage` (L137) calls `get_user_team_id` then `get_team_seat_usage` — old model. Returns wrong numbers for orgs that exist only in `org_members_v2`.
- No optimistic update on `useSyncSeatsToStripe` — UI freezes for 3-8s while Stripe roundtrips.
- `useAddSeat` invalidates `subscription-v2` and `seat-usage` but not `org-members-v2` — member list shows stale count after add.

`src/components/billing/TrialCountdownPopup.tsx` (referenced in `DashboardLayout`) — verify it reads `subscriptions_v2.trial_ends_at`, not `teams.trial_ends_at`. (Mentioned, not yet read — flag for review.)

---

## Ranked fix list — do this week

| # | Fix | Files | Severity |
|---|---|---|---|
| 1 | Create remaining Stripe prices (Solo m/y, Crew €49 m/y, Crew seat €19 m/y, Business seat €19 m/y) | Stripe dashboard + `useSubscriptionTier.ts` L66-83 | 🔴 |
| 2 | Stop `sync-seat-to-stripe` from deleting non-Crew line items | `sync-seat-to-stripe/index.ts` L108-113 | 🔴 |
| 3 | Make `add-subscription-seat` tier+interval aware | `add-subscription-seat/index.ts` L11, L83-95 | 🔴 |
| 4 | Add idempotency on payment insert in webhook | `stripe-webhook/index.ts` L303 + DB unique index on `payments(invoice_id, notes)` | 🔴 |
| 5 | Block trial extension via owner `UPDATE` on `subscriptions_v2` | DB trigger | 🔴 |
| 6 | Reject paying draft/void invoices via portal | `create-invoice-payment/index.ts` L34, webhook L290 | 🔴 |
| 7 | Centralize prices in `_shared/pricing.ts` and import from edge + client | new file + 4 imports | 🟠 |
| 8 | Fix `useSubscriptionTier` to read from `subscriptions_v2`, not `teams` | `useSubscriptionTier.ts` L320-401 | 🟠 |
| 9 | Replace `team_memberships` role check with `is_org_owner_v2` everywhere | `add-subscription-seat` L46-60 + 2 others | 🟠 |
| 10 | Return 500 (not 400) from webhook on processing errors so Stripe retries | `stripe-webhook/index.ts` L464-470 | 🟠 |
| 11 | Add handlers for `charge.refunded`, `customer.subscription.trial_will_end`, `invoice.payment_action_required` | webhook switch | 🟠 |
| 12 | Import `PRICING` into `ROICalculator.tsx` instead of local constants | `ROICalculator.tsx` | 🟡 |
| 13 | Fix `useSeatUsage` to use org_members_v2 | `useSubscription.ts` L137 | 🟡 |
| 14 | Add unit/regression tests for the 3 RLS bypass attempts in §7 | new `supabase/tests/rls.sql` | 🟡 |

When you approve, I'll implement #1-6 first as one batch (the revenue-leak stoppers), then #7-11, then the cleanup.

