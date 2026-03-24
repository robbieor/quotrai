

# Payment Behaviour Tracking & Enhanced Invoice Risk Scoring

## What we're building
A customer payment behaviour system that tracks historical late-payment patterns and uses them to improve the Invoice Risk score — turning it from a simple "days overdue" check into a predictive risk indicator.

---

## Database changes

### 1. New table: `customer_payment_scores`
Stores pre-computed payment behaviour per customer:
- `customer_id` (FK to customers)
- `team_id`
- `total_invoices_paid` — lifetime count
- `late_payments_count` — paid after due date
- `avg_days_to_pay` — average calendar days from issue to payment
- `avg_days_late` — average days past due (only for late ones)
- `last_computed_at` — timestamp

RLS: team-scoped read/write for authenticated users.

### 2. Database function: `fn_compute_payment_scores()`
A SQL function that:
- Joins `invoices` → `payments` to find the earliest payment date per invoice
- Compares payment date vs due date to classify late/on-time
- Aggregates per customer into the scores table (upsert)
- Can be called on-demand or via a cron trigger

### 3. Updated view: `v_invoice_risk`
Enhance the existing risk score formula by joining `customer_payment_scores`:
- Current: purely `max_days_overdue` buckets (>60 = high, >30 = medium)
- New: weighted score combining overdue days (60%) + late payment history (30%) + exposure size (10%)
- Output a numeric `risk_points` column alongside the categorical `risk_score`

---

## Frontend changes

### 4. Update `InvoiceAtRisk` interface
Add fields: `latePaymentRate`, `avgDaysToPay`, `riskPoints`

### 5. Update `InvoiceRiskTable.tsx`
- Show `Avg Days to Pay` column (compact)
- Sort by `riskPoints` descending instead of just `daysOverdue`
- Tooltip on risk badge showing breakdown: "62 days overdue · 73% late history · £12k exposure"

### 6. Update `useDashboardAnalytics.ts`
- Query `customer_payment_scores` alongside invoice data
- Merge into the `InvoiceAtRisk` objects
- Use the enhanced risk scoring in Action Panel alerts

---

## Files to modify
1. New migration — `customer_payment_scores` table + `fn_compute_payment_scores` function + updated `v_invoice_risk` view
2. `src/hooks/useDashboardAnalytics.ts` — add payment score query, merge into risk data
3. `src/components/dashboard/InvoiceRiskTable.tsx` — add column, tooltip, sort by risk points

