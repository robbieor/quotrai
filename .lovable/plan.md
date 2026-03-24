

# Deep-Link Dashboard Interactions to Exact Data

## Problem
Every clickable element in the dashboard (KPI cards, Control Header buttons, Action Panel rows, Jobs at Risk rows, Invoice Risk rows, DrillThroughDrawer links) navigates to generic pages like `/jobs` or `/invoices` with no query parameters. Users land on unfiltered lists and must manually find the relevant records.

## Solution
Wire URL search parameters into the listing pages and pass specific filters from every dashboard interaction.

---

## Technical Approach

### 1. Add URL parameter support to listing pages

**Jobs page** (`src/pages/Jobs.tsx`):
- Read `?status=` from URL on mount using `useSearchParams`
- If present, set `statusFilter` state from it
- Example: `/jobs?status=pending` pre-selects "Pending" filter

**Invoices page** (`src/pages/Invoices.tsx`):
- Read `?status=` from URL (e.g. `overdue`, `pending`)
- If present, set `statusFilter` state from it
- Example: `/invoices?status=overdue` shows only overdue invoices

**Quotes page** (`src/pages/Quotes.tsx`):
- Read `?status=` from URL (e.g. `sent`, `draft`)
- If present, set `statusFilter` state from it

All three pages: also support `?highlight=<id>` to auto-open the detail sheet for a specific record.

### 2. Update Dashboard navigation targets

**ControlHeader.tsx**:
- "Chase" button → `/invoices?status=overdue`
- "Quotes" button → `/quotes?status=sent` (stale quotes are sent but not followed up)
- "Jobs" button → `/jobs?status=in_progress` (stuck jobs)

**KPIStrip.tsx** — `onDrillDown` callback:
- "cash" → open drill drawer (already works)
- "outstanding" → open drill drawer (already works)
- "overdue30" → `/invoices?status=overdue`
- "jobs" → `/jobs?status=in_progress`

**ActionPanel.tsx**:
- Each alert already has an `href` field — update the analytics hook to generate precise URLs:
  - Overdue quotes alert → `/quotes?status=sent`
  - Stuck jobs alert → `/jobs?status=in_progress`
  - Quote win rate opportunity → `/quotes`
  - No jobs scheduled → `/jobs?status=scheduled`

**JobsAtRiskTable.tsx**:
- Row click → `/jobs?highlight=<job.id>` (opens that specific job's detail sheet)

**InvoiceRiskTable.tsx**:
- Row click → `/invoices?status=overdue` (filtered to overdue)
- Mail button → `/invoices?highlight=<invoice.id>` (opens specific invoice)

**TopCustomersTable.tsx**:
- Row click → `/customers?highlight=<customer.id>`

**DrillThroughDrawer.tsx**:
- External link button per row → navigate to `linkPrefix + "?highlight=" + row.id`

### 3. Detail sheet auto-open logic

In each listing page, after data loads:
- Check for `highlight` param
- Find the matching record
- Set it as `selectedJob`/`selectedInvoice`/`selectedQuote`
- Open the detail sheet automatically
- Clear the URL param after opening (using `replace` to avoid polluting history)

### 4. Update analytics hook href generation

In `useDashboardAnalytics.ts`, update the `ActionAlert.href` values to include query params instead of bare paths.

---

## Files to modify

1. `src/pages/Jobs.tsx` — add `useSearchParams`, sync status filter + auto-open detail
2. `src/pages/Invoices.tsx` — same pattern
3. `src/pages/Quotes.tsx` — same pattern
4. `src/pages/Customers.tsx` — add highlight support
5. `src/components/dashboard/ControlHeader.tsx` — update navigate calls with query params
6. `src/components/dashboard/KPIStrip.tsx` — add direct navigation for overdue30 and jobs
7. `src/components/dashboard/ActionPanel.tsx` — no changes needed (already uses `alert.href`)
8. `src/components/dashboard/JobsAtRiskTable.tsx` — navigate with `?highlight=<id>`
9. `src/components/dashboard/InvoiceRiskTable.tsx` — navigate with `?status=overdue` and `?highlight=<id>`
10. `src/components/dashboard/TopCustomersTable.tsx` — navigate with `?highlight=<id>`
11. `src/components/dashboard/DrillThroughDrawer.tsx` — append `?highlight=<row.id>` to link
12. `src/hooks/useDashboardAnalytics.ts` — update `href` values in action alerts to include query params

## Decisions this enables
- Click "132 stuck jobs" → land on Jobs page showing only in-progress jobs
- Click a specific stuck job row → land on Jobs page with that job's detail sheet open
- Click "Chase" → land on Invoices page filtered to overdue
- Click an invoice risk row → land on that specific invoice's detail

