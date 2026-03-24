

# Dashboard Data Logic is Broken — Root Cause & Fix Plan

## Problems Found

### Problem 1: Revenue & Cash metrics IGNORE the time filter
The edge function receives `fromDate`/`toDate` and filters the raw data correctly. But then **all KPI calculations use hardcoded `mStart`/`mEnd` (current month)** regardless of the selected time range.

Lines 184-206 of `dashboard-analytics/index.ts`:
- `cashCollectedMTD` filters payments by `mStart`–`mEnd` (current calendar month)
- `revenueMTD` filters invoices by `mStart`–`mEnd` (current calendar month)  
- `revenueLastMonth` uses `lmStart`–`lmEnd` (previous calendar month)

So when you select "YTD" (Jan 1 – today), the KPI still shows **this month's revenue as €66k** and compares it to **last month's €152k**. The label says "YTD" but the number is MTD. That's the core bug.

### Problem 2: "Revenue vs last month" comparison is meaningless for non-MTD presets
When you select "7 days" or "YTD", comparing against "last month" makes no sense. The comparison period should match the selected period (e.g., YTD this year vs YTD last year, or last 7 days vs previous 7 days).

### Problem 3: Revenue chart is hardcoded to last 6 months
Line 275: `for (let i = 5; i >= 0; i--)` — always shows 6 months regardless of filter. If you pick "7 days", you still see a 6-month chart.

### Problem 4: No "Revenue by Job Type" chart on dashboard
The edge function computes `jobStatusData` (jobs by status) but there is **no job type breakdown** returned. The `matchJobType()` function exists but is only used for filtering, not for generating a "Revenue by Job Type" dataset.

---

## Fix Plan

### 1. Make KPI metrics respect the date filter — `dashboard-analytics/index.ts`

Replace the hardcoded MTD calculations with filter-aware logic:

- **Cash Collected**: Sum all payments within `fromDate`–`toDate` (the already-filtered `payments` array), not just current month
- **Revenue**: Sum all non-draft/cancelled invoices within `fromDate`–`toDate` (the already-filtered `invoices` array), not just current month
- **Comparison period**: Calculate dynamically based on the time range length:
  - If range = 30 days, compare to previous 30 days
  - If range = YTD, compare to same period last year
  - If range = this month, compare to last month (current behavior)
  - If range = 7 days, compare to previous 7 days

This means removing `mStart`/`mEnd` from KPI calculations and using the full filtered dataset instead.

### 2. Update comparison label — `KPIStrip.tsx`

Change the subMetric from hardcoded `"vs ${formatCurrency(data.revenueLastMonth)} last month"` to a dynamic label the edge function returns (e.g., `"vs €152k prev period"` or `"vs €X same period last year"`).

Add a `comparisonLabel` field to the `KPIData` interface so the edge function can return the correct context string.

### 3. Make revenue chart respect date range — `dashboard-analytics/index.ts`

Instead of always showing 6 months, derive chart buckets from `fromDate`–`toDate`:
- Under 14 days: daily buckets
- 14 days – 3 months: weekly buckets
- Over 3 months: monthly buckets (current behavior but bounded by the actual range)

### 4. Add "Revenue by Job Type" dataset — `dashboard-analytics/index.ts`

Use the existing `matchJobType()` to group paid invoices (via their linked jobs) by job type. Return a `revenueByJobType` array: `[{ type: "Electrical", revenue: X, count: Y }, ...]`

### 5. Add Revenue by Job Type chart — new component + `Dashboard.tsx`

Create a simple bar/donut chart showing revenue broken down by job type. Place it in the Analytics Zone alongside the Revenue chart.

---

## Files to modify

| File | Change |
|------|--------|
| `supabase/functions/dashboard-analytics/index.ts` | Fix KPI calculations to use filtered date range; add dynamic comparison period; add revenue-by-job-type dataset; make chart buckets respect date range |
| `src/hooks/useDashboardAnalytics.ts` | Add `comparisonLabel` and `revenueByJobType` to interfaces |
| `src/components/dashboard/KPIStrip.tsx` | Use `comparisonLabel` from data instead of hardcoded "last month" |
| `src/components/dashboard/RevenueByJobTypeChart.tsx` | New chart component for job type breakdown |
| `src/pages/Dashboard.tsx` | Add the job type chart to the analytics grid |

## Why this fixes the confusion

The dashboard currently fetches data for the selected range but then throws it away and recalculates everything for the current calendar month. After this fix, every metric will reflect exactly the period you selected, with an appropriate comparison period, eliminating the "€66k YTD vs €152k last month" nonsense.

