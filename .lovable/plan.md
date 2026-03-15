

# Billing Settings Overhaul — Stripe-Aligned, Per-Seat-Type Management

## Current State Assessment

The billing tab is a disorganized vertical stack of 6 cards with several critical problems:

1. **Wrong pricing model in code vs Stripe**: The `create-checkout-session` edge function creates a single "Quotr" product with one price. But Stripe already has **6 per-seat products** properly configured (Lite Monthly/Annual, Connect Monthly/Annual, Grow Monthly/Annual) with correct prices. The code ignores them entirely.

2. **v1/v2 architecture split**: The DB has both `subscriptions` (v1, used by current code) and `subscriptions_v2` + `org_members_v2` + `plans_v2` (v2, unused). The billing UI reads from v1 only.

3. **No per-member seat type management**: The `org_members_v2` table has a `seat_type` enum (`lite | connect | grow`) but there's no UI for owners to assign seat types to individual members. The Team tab has no concept of seat tiers.

4. **Billing tab is a dumping ground**: Online Payments (Stripe Connect), Xero, QuickBooks, subscription pricing, Foreman voice overview, and billing history are all stacked in one tab with no hierarchy. Accounting integrations are not billing concerns.

5. **SubscriptionManagement.tsx is dead code**: It's imported nowhere — `SubscriptionPricing.tsx` is what renders in the billing tab, but it only shows "Starter" and "Pro" (missing "Grow"), and hardcodes a single price for checkout.

6. **Trial says 30 days but memory says 14 days**: The `handleStartSubscription` passes `trial_period_days: 30` in the edge function, contradicting the 14-day trial model.

## Plan

### Phase 1: Restructure the Billing Tab Layout

**Settings.tsx** — Reorganize the billing tab into clear sections:

```
Billing Tab:
├── Subscription Overview (status, trial countdown, next billing date)
├── Seat Management (table of members with seat-type selector per member)
├── Plan Comparison (Lite/Connect/Grow cards with current highlighted)
├── Pricing Calculator (existing, refined)
└── Billing History (Foreman voice reports)

Move OUT of billing tab:
├── Stripe Connect → stays (it IS billing)
├── Xero/QuickBooks → move to new "Integrations" tab
```

**Add an "Integrations" tab** to Settings with icon `Plug`. Move `XeroConnectionCard` and `QuickBooksConnectionCard` there. This declutters billing.

### Phase 2: Per-Member Seat Type Management

**Create `SeatManagementTable` component** — a table showing each team member with:
- Name, email, role badge (CEO/Manager/Employee)
- Seat type dropdown (Lite/Connect/Grow) — only editable by CEO
- Monthly cost column showing the price for that seat type
- Total row at bottom

When CEO changes a member's seat type:
1. Update `org_members_v2.seat_type` in the database
2. Call a new edge function `sync-seat-to-stripe` that reconciles the Stripe subscription line items

### Phase 3: Fix Checkout to Use Real Stripe Prices

**Update `create-checkout-session`** edge function to:
- Accept seat type counts (e.g., `{ lite: 2, connect: 3, grow: 1, interval: "month" }`)
- Use the actual Stripe price IDs that already exist:
  - Lite Monthly: `price_1T7b44DQETj2awNE...` (€15/mo)
  - Connect Monthly: `price_1T7afYDQETj2awNE...` (€29/mo)
  - Grow Monthly: `price_1T7agsDQETj2awNE...` (€49/mo)
  - Lite Annual: `price_1T7b4eDQETj2awNE...` (€153/yr)
  - Connect Annual: `price_1T7apqDQETj2awNE...` (€295.80/yr)
  - Grow Annual: `price_1T7ahZDQETj2awNE...` (€499.80/yr)
- Create multi-line-item subscription (one line per seat type × quantity)
- Fix trial to 14 days (not 30)

### Phase 4: Create `sync-seat-to-stripe` Edge Function

New edge function that:
1. Reads all `org_members_v2` for the org, counts seats by type
2. Gets the current Stripe subscription
3. Reconciles line items — adds/removes/updates quantities per seat type price
4. Updates `subscriptions_v2` with new seat_count and status
5. Called after: member invited, member removed, seat type changed

### Phase 5: Update Plan Comparison Cards

**Update `SubscriptionPricing.tsx`** to show 3 tiers (Lite, Connect, Grow) instead of 2 (Starter, Pro):
- Use the memory-defined feature lists
- Show all 3 cards in a responsive grid (`md:grid-cols-3`)
- Highlight the "most popular" tier (Connect)
- Remove FAQ section (move to a help center or tooltip)
- Remove the pricing calculator toggle — make it always visible or remove it

### Phase 6: Subscription Overview Card

**New `SubscriptionOverview` component** replacing the current summary card:
- Trial state: countdown bar, days remaining, "Subscribe Now" CTA
- Active state: plan breakdown by seat type, next billing date, total monthly cost
- Cancelled state: access end date, resubscribe CTA
- Past due state: warning with "Update Payment" CTA
- "Manage Billing" button → Stripe Customer Portal (existing)

### Phase 7: Clean Up Dead Code

- Delete `src/components/settings/SubscriptionManagement.tsx` (unused)
- Delete `src/components/settings/AddSeatDialog.tsx` (replace with seat management table)
- Update `useSubscriptionTier.ts` — rename Starter→Lite, Pro→Connect, add Grow properly
- Update PRICING constants to match actual Stripe prices (Lite=€15, Connect=€29, Grow=€49)

## Files Changed

| File | Action |
|------|--------|
| `src/pages/Settings.tsx` | Add Integrations tab, restructure billing tab |
| `src/components/billing/SubscriptionPricing.tsx` | 3-tier cards, remove FAQ |
| `src/components/billing/SubscriptionOverview.tsx` | New — status/trial/billing summary |
| `src/components/billing/SeatManagementTable.tsx` | New — per-member seat type control |
| `src/hooks/useSubscriptionTier.ts` | Fix naming (Lite/Connect/Grow), fix prices |
| `supabase/functions/create-checkout-session/index.ts` | Multi-line-item checkout, real price IDs, 14-day trial |
| `supabase/functions/sync-seat-to-stripe/index.ts` | New — reconcile seat types to Stripe |
| `src/components/settings/SubscriptionManagement.tsx` | Delete |
| `src/components/settings/AddSeatDialog.tsx` | Delete |
| `src/hooks/useSubscription.ts` | Update to use v2 tables, add seat sync mutation |

## Stripe Price ID Map (Already Configured)

| Seat Type | Monthly | Annual |
|-----------|---------|--------|
| Lite (€15/mo) | `price_1T7b44DQETj2awNEVZC5FQn2` | `price_1T7b4eDQETj2awNEhlMGRoGE` |
| Connect (€29/mo) | `price_1T7afYDQETj2awNEcXocEe7h` | `price_1T7apqDQETj2awNEXdefYkfs` |
| Grow (€49/mo) | `price_1T7agsDQETj2awNEeLQafzg5` | `price_1T7ahZDQETj2awNE5gr1v6DI` |

