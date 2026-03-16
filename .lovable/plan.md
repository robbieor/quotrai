

# Dashboard Analytics Redesign — Implementation Plan

## Current State Assessment

The dashboard today is a **static, one-size-fits-all page** with:
- 4 hardcoded metric tiles (Active Jobs, Revenue MTD, Outstanding, Quotes Pending)
- 2 basic charts (revenue bar chart, job status pie chart) — no interactivity beyond tooltips
- 2 tables (Jobs Due, Overdue Invoices) — rows click to list pages but no filtering
- 2 activity feeds (Recent Activity, Team Activity) — read-only, no filtering
- Morning Briefing card — proactive but not interactive
- **No global filters** (no customer, job type, staff, or date range slicers)
- **No drill-down** (clicking a metric or chart segment does nothing meaningful)
- **No cross-filtering** (charts are independent silos)
- The Reports page has date range filtering but the Dashboard does not

The memory notes reference a "BI engine with react-grid-layout and cross-filtering" but **none of that exists in the codebase** — no react-grid-layout dependency, no filter context, no drill-through drawers. This plan builds it for real.

---

## Architecture

```text
┌─────────────────────────────────────────────────┐
│  DashboardFilterContext (React Context)          │
│  ┌───────────┬──────────┬─────────┬───────────┐ │
│  │ DateRange  │ Customer │ JobType │ Staff     │ │
│  │ (default   │ (all)    │ (all)   │ (all)     │ │
│  │  this yr)  │          │         │           │ │
│  └───────────┴──────────┴─────────┴───────────┘ │
│  crossFilter: { dimension, value } | null        │
│  setFilter(), clearAll(), setCrossFilter()       │
└──────────────────────┬──────────────────────────┘
                       │ consumed by
         ┌─────────────┼─────────────┐
         ▼             ▼             ▼
   useDashboardData  Charts      DrillDrawer
   (single query     (onClick →   (Sheet with
    with filters)    setCross-    filtered
                     Filter)      record list)
```

### Key Design Decisions
1. **Single aggregated query** — one `useDashboardAnalytics` hook fetches all raw data for the filter set, then derives metrics/charts client-side. Avoids N+1 per-chart queries.
2. **Filter bar** — sticky row of compact selectors below the header. On mobile, collapses to a filter icon with a bottom sheet.
3. **Cross-filtering** — clicking a bar/pie slice sets a `crossFilter` in context. All charts and tables re-derive from the same dataset applying that filter.
4. **Drill-through drawer** — clicking a metric tile opens a Sheet with the underlying records (e.g., clicking "Outstanding €12k" shows the invoice list).
5. **No react-grid-layout** — unnecessary complexity for a trades app. Fixed responsive grid is faster and mobile-friendly.

---

## Implementation Steps

### 1. Create DashboardFilterContext
**New file:** `src/contexts/DashboardFilterContext.tsx`

- State: `dateRange`, `customerId`, `jobType`, `staffId`, `crossFilter`
- Provider wraps the Dashboard page
- `clearAll()`, `clearCrossFilter()`, individual setters
- Derives query keys so all hooks auto-refetch on filter change

### 2. Create DashboardFilterBar component
**New file:** `src/components/dashboard/DashboardFilterBar.tsx`

- Date range picker (reuse existing `DateRangePicker` from reports)
- Customer combobox (searchable, loads from `customers` table)
- Job Type select (from trade-aware categories)
- Staff select (from `profiles` where `team_id` matches)
- "Clear filters" button
- Active filter chips showing what's applied
- On mobile: collapse to single "Filters" button → bottom sheet with selectors

### 3. Create useDashboardAnalytics hook
**New file:** `src/hooks/useDashboardAnalytics.ts`

Single hook that:
- Reads filters from context
- Fetches jobs, invoices, quotes, expenses, payments in parallel (filtered by date range, with optional customer/staff joins)
- Returns derived datasets: metrics, revenue-by-month, job-status-counts, quote-funnel, top-customers, invoice-aging, payment-delays
- Applies `crossFilter` and `jobType`/`staffId` client-side from the fetched set
- Replaces the 6+ separate hooks currently used

### 4. Upgrade MetricTile with drill-through
**Edit:** `src/components/dashboard/MetricTile.tsx`

- Add `onDrillDown` prop
- Clicking opens a `Sheet` (side drawer) with a paginated table of the underlying records
- E.g., "Outstanding €12k" → drawer lists each overdue invoice with client, amount, days overdue, and a "View" link

**New file:** `src/components/dashboard/DrillThroughDrawer.tsx`
- Generic drawer component that accepts a title, columns config, and data array
- Sorted, paginated, with "View record" links

### 5. Upgrade charts with cross-filtering and interactivity

**Edit:** `DashboardRevenueChart.tsx`
- Switch to AreaChart with gradient fill (matches Reports style)
- Clicking a month bar sets `crossFilter: { dimension: "month", value: "Mar 26" }`
- Highlighted bar when cross-filtered
- Add comparison line (previous period) when date range allows

**Edit:** `DashboardJobStatusChart.tsx`
- Clicking a pie slice sets `crossFilter: { dimension: "jobStatus", value: "scheduled" }`
- Active slice gets an offset/glow effect
- Show count + percentage in center of donut

**New file:** `src/components/dashboard/QuoteConversionFunnel.tsx`
- Horizontal funnel: Created → Sent → Won
- Shows count and value at each stage
- Clickable stages → cross-filter

**New file:** `src/components/dashboard/InvoiceAgingChart.tsx`
- Stacked bar: Current / 1-30 days / 31-60 days / 60+ days overdue
- Color-coded severity (green → yellow → orange → red)
- Clickable segments → drill-through to invoice list

**New file:** `src/components/dashboard/TopCustomersChart.tsx`
- Horizontal bar chart of top 5 customers by revenue
- Clickable bars → cross-filter by customer
- Shows customer lifetime value

**New file:** `src/components/dashboard/PaymentDelaysChart.tsx`
- Average days-to-pay trend line over time
- Highlights months where payment delays spike

### 6. Add proactive insight alerts
**New file:** `src/components/dashboard/InsightAlerts.tsx`

Compact alert cards that surface automatically based on data:
- "3 invoices overdue by 30+ days — €4,200 at risk"
- "Quote conversion dropped to 22% this month"
- "Revenue trending 15% below last quarter"
- "No jobs scheduled next week — fill the gap?"
- "John Murphy has €8k lifetime value — your top customer"

Each alert has a CTA button linking to the relevant page with pre-applied filters.

### 7. Rebuild Dashboard.tsx layout
**Edit:** `src/pages/Dashboard.tsx`

New layout order:
1. UpgradePromptBanner / OnboardingChecklist (conditional)
2. MorningBriefingCard (keep, enhance with filter-aware data)
3. **DashboardFilterBar** (new — sticky)
4. **InsightAlerts** (new — auto-generated)
5. Metric tiles row (4 tiles, now with drill-through)
6. Charts grid:
   - Revenue trend (area chart) + Quote conversion funnel
   - Job status (donut) + Invoice aging
   - Top customers (horizontal bar) + Payment delays
7. Tables row: Jobs Due + Overdue Invoices (now filtered)
8. Activity feeds (keep, move to bottom)

### 8. Mobile optimization
- Filter bar: single "Filters (2)" chip button → opens bottom sheet
- Charts: 1-column stack, reduced heights (200px)
- Hide Y-axis labels on mobile to reclaim space
- Drill-through drawer: full-screen on mobile
- Metric tiles: 2×2 grid on mobile
- Insight alerts: horizontal scroll

---

## Summary of Changes

| Area | What Changes |
|------|-------------|
| **New context** | `DashboardFilterContext` — global filter state |
| **New hook** | `useDashboardAnalytics` — single aggregated query |
| **New components** (6) | FilterBar, DrillThroughDrawer, QuoteConversionFunnel, InvoiceAgingChart, TopCustomersChart, InsightAlerts |
| **Upgraded components** (3) | MetricTile (drill-down), RevenueChart (cross-filter + comparison), JobStatusChart (cross-filter) |
| **Page rebuild** | Dashboard.tsx — new layout with filters, insights, interactive charts |
| **Removed** | PaymentDelaysChart deferred if data insufficient; ExpenseEmailBanner moved to settings |

### New Insights Provided
- Quote conversion rate with funnel visualization
- Invoice aging breakdown by severity
- Customer lifetime value ranking
- Payment delay trends
- Proactive alerts for overdue invoices, conversion drops, revenue trends, scheduling gaps

### Interactive Capabilities Added
- Date range, customer, job type, staff filtering
- Cross-filtering (click chart → filters everything)
- Drill-through drawers (click metric → see underlying records)
- Clickable chart segments with visual feedback
- Active filter chips with one-click clear

