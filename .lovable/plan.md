

## Critical Billing Fix: Complete Subscription Workflow Repair

### Root Cause Analysis

**Why both "Start Free Trial" and "Choose Plan" fail for new users:**

The `handle_new_user` trigger creates records in the **legacy** tables (`teams`, `profiles`, `team_memberships`), but the entire billing system runs on **v2 tables** (`orgs_v2`, `org_members_v2`, `subscriptions_v2`). New signups get zero v2 records.

When a user clicks anything billing-related:
1. `create-checkout-session` calls `org_members_v2` → no row → **"User not in an organization"** → error
2. `SubscriptionOverview` calls `useSubscription()` → `get_user_org_id_v2()` → null → shows "Start Free Trial" card
3. That card calls `create-checkout-session` → same failure

Additionally, the `create-customer-portal-session` function uses the **old** `subscriptions` table (not v2) with an outdated Stripe SDK (v14), so "Manage Billing" will also fail for any user.

The "Start Free Trial" button in `SelectPlan.tsx` uses `startTrial()` which just updates the legacy `teams` table — it never creates a Stripe checkout or v2 records.

### Fix Plan (4 changes)

---

### 1. Update `handle_new_user` trigger to provision v2 records

**Migration SQL** — on signup, also create:
- `orgs_v2` row (org name from company_name or "My Org")
- `org_members_v2` row (user_id, org_id, role='owner', seat_type='connect')
- `subscriptions_v2` row (org_id, status='trialing', trial_ends_at=now()+30 days)

This ensures every new user immediately has the v2 records that the checkout flow requires.

### 2. Backfill existing users who have no v2 records

**Migration SQL** — for any `auth.users` row that has a `profiles` record but no `org_members_v2` entry, create the missing v2 records. This fixes existing users like the ones currently stuck.

### 3. Fix `create-customer-portal-session` to use v2 tables

Update `supabase/functions/create-customer-portal-session/index.ts`:
- Switch from `subscriptions` (legacy) to `subscriptions_v2`
- Use `org_members_v2` to find the org, then look up `stripe_customer_id` from `subscriptions_v2`
- Update Stripe SDK from v14 to v18.5.0
- Update API version to `2025-08-27.basil`
- Update CORS headers to match other functions

### 4. Fix the "Start Free Trial" flow

The `SubscriptionOverview` "Start Free Trial" button calls `create-checkout-session` with no `seatCounts` and no plan selection — it should default to 1 Connect seat. The edge function already handles this fallback, but it fails before reaching that code because there's no org.

Once fix #1 is applied, the existing fallback logic in `create-checkout-session` (line 88-89: default to 1 connect seat) will work correctly. No edge function changes needed there.

Also update `SelectPlan.tsx` `handleStartTrial` — it currently calls `startTrial()` which only touches the legacy `teams` table. Instead, route it through `create-checkout-session` like `SubscriptionPricing` does, so users get a proper Stripe trial with payment method collection.

---

### Files to modify

| File | Change |
|---|---|
| **Migration SQL** | Add v2 provisioning to `handle_new_user`, backfill existing users |
| `supabase/functions/create-customer-portal-session/index.ts` | Rewrite to use v2 tables + modern Stripe SDK |
| `src/pages/SelectPlan.tsx` | Route "Start Free Trial" through Stripe checkout instead of legacy `startTrial()` |

### Deployment

- 1 migration (trigger update + backfill)
- 1 edge function redeploy (`create-customer-portal-session`)
- Frontend changes auto-deploy

### Competitor context

Jobber/Tradify/ServiceM8 all use simple single-plan trials with no seat selection upfront. The current UX asking users to pick a plan tier before they've tried the product adds friction. The fix above preserves the 30-day trial with Stripe (card collected upfront = higher conversion) while defaulting new users to Connect tier — they can change later.

