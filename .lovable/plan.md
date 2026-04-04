

# Update All "7-Day" References to "14-Day" + Extend Existing Trials

## Problem
The database trigger was previously updated to 14 days but the latest migration (`20260330...`) still shows `interval '7 days'`. Multiple landing page sections, the trade landing page, terms page, and request access page all still say "7-day". Existing trial users in the database still have 7-day trial windows.

## Changes

### 1. Database Migration — Fix trigger + extend existing trials
One SQL migration that:
- Recreates `handle_new_user` trigger with `interval '14 days'` (both `teams.trial_ends_at` and `subscriptions_v2.trial_ends_at`)
- Updates all existing active trial teams: `UPDATE teams SET trial_ends_at = created_at + interval '14 days' WHERE is_trial = true`
- Updates matching `subscriptions_v2` records: `UPDATE subscriptions_v2 SET trial_ends_at = org_created_at_equivalent + interval '14 days' WHERE status = 'trialing'`

### 2. Landing Page Text Updates (6 files)

| File | Line | Change |
|------|------|--------|
| `src/components/landing/PricingPreviewSection.tsx` | 94 | `"7-day free trial"` → `"14-day free trial"` |
| `src/components/landing/FinalCTASection.tsx` | 20 | `"7-day free trial"` → `"14-day free trial"` |
| `src/pages/TradeLanding.tsx` | 107, 188 | Both `"7-day"` → `"14-day"` |
| `src/pages/RequestAccess.tsx` | 150 | `"7-day free trial"` → `"14-day free trial"` |
| `src/pages/Terms.tsx` | 60 | `"7-day free trial"` → `"14-day free trial"` |

### 3. Already Correct (no change needed)
- `src/pages/Signup.tsx` — already updated to "14-day" per prior work
- `useSubscriptionTier.ts` `startTrialMutation` — verify and update if still 7 days
- Invoice reminder "7 days" reference and calendar "7 days" label — these are functional, not trial-related

## Scope
- 1 database migration (trigger + backfill)
- 6 UI files, 1-line change each

