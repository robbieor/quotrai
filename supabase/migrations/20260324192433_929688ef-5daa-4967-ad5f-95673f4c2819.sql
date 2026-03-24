
-- 1. Add job cost tracking columns to jobs table
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS actual_cost numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS labour_cost numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS materials_cost numeric DEFAULT 0;

-- Also add a computed profit helper view
CREATE OR REPLACE VIEW public.v_job_profitability
WITH (security_invoker = true)
AS
SELECT
  j.id,
  j.team_id,
  j.title,
  j.status,
  j.customer_id,
  c.name AS customer_name,
  COALESCE(j.estimated_value, 0) AS estimated_value,
  COALESCE(j.actual_cost, 0) AS actual_cost,
  COALESCE(j.labour_cost, 0) AS labour_cost,
  COALESCE(j.materials_cost, 0) AS materials_cost,
  COALESCE(e.expense_total, 0) AS expense_total,
  COALESCE(j.actual_cost, 0) + COALESCE(e.expense_total, 0) AS total_cost,
  COALESCE(j.estimated_value, 0) - (COALESCE(j.actual_cost, 0) + COALESCE(e.expense_total, 0)) AS profit,
  CASE
    WHEN COALESCE(j.estimated_value, 0) > 0
    THEN ROUND(((COALESCE(j.estimated_value, 0) - (COALESCE(j.actual_cost, 0) + COALESCE(e.expense_total, 0))) / j.estimated_value * 100)::numeric, 1)
    ELSE 0
  END AS profit_margin_pct
FROM jobs j
LEFT JOIN customers c ON c.id = j.customer_id
LEFT JOIN (
  SELECT job_id, SUM(amount) AS expense_total
  FROM expenses
  GROUP BY job_id
) e ON e.job_id = j.id;
