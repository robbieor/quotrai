

# Dashboard Tiles — Unified Click-to-Drill Experience

## Problems

1. **ControlHeader tiles** (Overdue, Stale Quotes, Stuck Jobs, Status) are completely static — no click handlers at all
2. **KPI Strip tiles** are inconsistent — "Outstanding" opens a drawer, "Overdue 30+" and "Jobs" navigate away to a different page, "Cash Collected" has an onClick that does nothing (no handler case), "Revenue" has no onClick
3. No unified interaction pattern — sometimes drawer, sometimes page navigation, sometimes nothing

## Solution

Every tile in both rows opens the same `DrillThroughDrawer` with the relevant records. Each row in the drawer links to the specific record (invoice, job, quote). This is already built — it just needs to be wired up consistently.

## Changes

### 1. `ControlHeader.tsx` — Make all 4 tiles clickable

Add an `onDrillDown` callback prop (same pattern as KPIStrip). Each tile gets a click handler:
- **Overdue** → `onDrillDown("overdue")` — shows overdue invoices
- **Stale Quotes** → `onDrillDown("staleQuotes")` — shows quotes needing follow-up
- **Stuck Jobs** → `onDrillDown("stuckJobs")` — shows jobs with 7+ days no progress
- **Status** → `onDrillDown("status")` — shows combined issues list

Add cursor-pointer, hover state, and the "Click to drill ↗" hint (same as KPICard).

### 2. `Dashboard.tsx` — Wire up all drill handlers

Add a `handleControlDrillDown` function that opens the DrillThroughDrawer for each ControlHeader metric:
- **overdue**: columns = Invoice #, Client, Amount, Days Overdue → data from `data?.drillData?.outstanding` filtered to overdue, link to `/invoices`
- **staleQuotes**: columns = Quote #, Client, Amount, Days Since Sent → data from `data?.drillData?.pendingQuotes`, link to `/quotes`
- **stuckJobs**: columns = Job Title, Customer, Status, Days Stuck, Value → data from `data?.jobsAtRisk`, link to `/jobs`

Fix `handleKPIDrillDown` to handle ALL cases:
- **cash**: show payments collected (from drill data)
- **outstanding**: already works (keep)
- **overdue30**: open drawer instead of navigating away
- **revenue**: show invoices contributing to revenue
- **jobs**: open drawer with active jobs instead of navigating away

### 3. `DrillThroughDrawer.tsx` — Minor improvement

Add row click behavior: clicking a row navigates to the record (not just the small icon button). Makes touch targets much better on mobile.

### 4. Edge function `dashboard-analytics/index.ts` — Ensure drill data is complete

Check that the edge function returns sufficient drill data for all tiles. May need to add:
- `staleQuotes` array (quotes sent 7+ days ago, no response)
- `cashCollected` array (payments in period)
- `overdueInvoices` array (30+ day overdue specifically)

## Files

| Action | File |
|--------|------|
| Edit | `src/components/dashboard/ControlHeader.tsx` — add onDrillDown prop + clickable tiles |
| Edit | `src/components/dashboard/KPIStrip.tsx` — ensure all 5 cards have onClick |
| Edit | `src/pages/Dashboard.tsx` — wire both handlers with complete drill data |
| Edit | `src/components/dashboard/DrillThroughDrawer.tsx` — row-click navigation |
| Edit | `supabase/functions/dashboard-analytics/index.ts` — ensure all drill arrays populated |

