

# Full Button & Navigation Audit — Findings & Fixes

## Audit Scope
Every page, every clickable element, every navigation path. Checked: route existence, tab names, handler completeness, edge function availability, Stripe price IDs.

---

## CRITICAL FIXES (will cause user confusion or errors)

### 1. Wrong Settings Tab Name — 3 Files
`?tab=billing` does not exist. The actual tab is `?tab=team-billing`. Users clicking billing CTAs from these components land on the default "Profile" tab instead of billing.

| File | Current | Should Be |
|------|---------|-----------|
| `src/components/george/GeorgeUsageWarning.tsx` (lines 26, 48) | `/settings?tab=billing` | `/settings?tab=team-billing` |
| `src/components/billing/TrialBanner.tsx` (line 32) | `/settings?tab=billing` | `/settings?tab=team-billing` |
| `src/components/billing/TrialCountdownPopup.tsx` (line 57) | `/settings?tab=billing` | `/settings?tab=team-billing` |

**3 files, 4 line changes. All simple string replacements.**

### 2. Integrations Tab Shows "Coming Soon" Despite Built Components
`Settings.tsx` line 405-413 shows a static "Coming Soon" card for Xero/QuickBooks, but `XeroConnectionCard.tsx`, `QuickBooksConnectionCard.tsx`, and `StripeConnectSetup.tsx` components are imported (lines 18-20) and never rendered. The Stripe Connect setup is especially important for invoice payments.

**Fix**: Replace the "Coming Soon" card with the actual connection components:
```
<StripeConnectSetup />
<XeroConnectionCard />
<QuickBooksConnectionCard />
```

---

## IMPORTANT UX FIXES

### 3. SubscriptionPricing.tsx Missing Bulk Discount Logic
The `SubscriptionPricing` component (used in Settings billing tab) does not apply the bulk discount display logic that was added to `SelectPlan.tsx`. It always shows 1 seat with no quantity selector. This is a secondary subscription UI and less critical, but creates pricing inconsistency.

**Fix**: Low priority — this component always subscribes with `quantity: 1`, so bulk discount doesn't apply here. No code change needed unless multi-seat checkout is added.

---

## VERIFIED WORKING (No Issues Found)

| Area | Status |
|------|--------|
| `/select-plan` checkout → `create-checkout-session` edge function | ✅ Works — all 6 Stripe price IDs verified |
| Upgrade prompts → `/select-plan` route | ✅ Fixed in prior session |
| Dashboard drill-through drawer | ✅ Handlers wired |
| Morning briefing quick actions (Jobs, Invoices, Quotes, AI) | ✅ All navigate correctly |
| Notification center links | ✅ Routes exist |
| Sidebar sign-out | ✅ Handler exists |
| Invoice portal "Pay Now" → `create-invoice-payment` | ✅ Edge function exists |
| Cancel subscription flow | ✅ Edge function exists, reason capture works |
| "Manage Billing" → `create-customer-portal-session` | ✅ Edge function exists |
| "End Trial Early" → `end-trial-early` | ✅ Edge function exists |
| Back button on SelectPlan → `/settings?tab=team-billing` | ✅ Correct tab name |
| ReadOnlyBanner → `/select-plan` | ✅ Route exists |
| SeatGuard → `/settings?tab=team-billing` | ✅ Correct tab name |
| PlanGate → `/settings?tab=team-billing` | ✅ Correct tab name |
| All edge functions referenced in UI | ✅ All 55 functions exist in `supabase/functions/` |

---

## Summary

| Priority | Issue | Files | Effort |
|----------|-------|-------|--------|
| **P0** | Wrong tab name `billing` → `team-billing` | 3 files, 4 lines | 2 min |
| **P1** | Integrations tab shows "Coming Soon" instead of real components | 1 file, ~10 lines | 5 min |

Two real bugs. Everything else verified working.
