
# Post-Launch Improvements — Full Implementation

## Batch 1: Security Hardening (Migration)

| # | Task | Effort |
|---|------|--------|
| 1 | **Add DELETE policy to `document-emails` bucket** — team-folder scoped | 5 min |
| 2 | **`email-assets` bucket team isolation** — add team-folder scoped SELECT/INSERT/DELETE | 10 min |
| 3 | **`currency_rates` table** — restrict to authenticated users only | 5 min |
| 4 | **`early_access_requests`** — add admin-only SELECT policy | 5 min |
| 5 | **`drip_sequences`** — add service-role-only INSERT policy (clear linter warning) | 5 min |

All above in a single migration.

## Batch 2: Edge Function Fixes

| # | Task | File |
|---|------|------|
| 6 | **ILIKE wildcard sanitization in `george-webhook`** — escape `%` and `_` in user input | `supabase/functions/george-webhook/index.ts` |
| 7 | **Portal token expiration** — add `expires_at` check on quote/invoice portal token lookup | Relevant portal hooks/pages |

## Batch 3: Frontend Code Fixes

| # | Task | File |
|---|------|------|
| 8 | **Quotes pagination** — replace `limit(5000)` with proper paginated fetching | `src/hooks/useQuotes.ts` |
| 9 | **Revenue reporting by `paid_at`** — use payment date instead of invoice issue date | `src/hooks/useDashboard.ts` |
| 10 | **Xero/QuickBooks type casts** — replace `(supabase as any)` with proper typing | `src/hooks/useXeroConnection.ts`, `src/hooks/useQuickBooksConnection.ts` |

## Not Included (Requires Supabase Dashboard Access)

- Moving extensions out of `public` schema — this requires `CREATE EXTENSION ... SCHEMA extensions` which can break existing function references. Documented as a future infrastructure task.

## Files

| Action | File |
|--------|------|
| Create | `supabase/migrations/<timestamp>.sql` — Batch 1 |
| Edit | `supabase/functions/george-webhook/index.ts` — Batch 2 |
| Edit | Quote/Invoice portal pages — Batch 2 |
| Edit | `src/hooks/useQuotes.ts` — Batch 3 |
| Edit | `src/hooks/useDashboard.ts` — Batch 3 |
| Edit | `src/hooks/useXeroConnection.ts` — Batch 3 |
| Edit | `src/hooks/useQuickBooksConnection.ts` — Batch 3 |
