
-- Segment: High Risk — invoices overdue 30+ days OR balance > 500, plus stuck jobs
CREATE OR REPLACE VIEW public.v_segment_high_risk_customers
WITH (security_invoker = true)
AS
SELECT DISTINCT customer_id, team_id
FROM (
  -- Invoices overdue 30+ days with balance remaining
  SELECT ib.customer_id, ib.team_id
  FROM v_invoice_balances ib
  WHERE ib.balance_due > 0
    AND ib.days_overdue > 30
    AND ib.status NOT IN ('cancelled', 'draft')
  UNION
  -- Customers with high outstanding balance (top quartile or > 1000)
  SELECT ib.customer_id, ib.team_id
  FROM v_invoice_balances ib
  WHERE ib.balance_due > 0
    AND ib.status NOT IN ('cancelled', 'draft')
  GROUP BY ib.customer_id, ib.team_id
  HAVING SUM(ib.balance_due) > 1000
  UNION
  -- Customers with stuck jobs (7+ days no update)
  SELECT j.customer_id, j.team_id
  FROM v_jobs_at_risk j
) sub;

-- Segment: Top Customers — by collected cash (payments), not invoiced amount
CREATE OR REPLACE VIEW public.v_segment_top_customers
WITH (security_invoker = true)
AS
SELECT
  i.customer_id,
  i.team_id,
  SUM(COALESCE(p.paid, 0)) AS total_collected,
  SUM(COALESCE(i.total, 0)) AS total_invoiced,
  COUNT(DISTINCT i.id) AS invoice_count
FROM invoices i
LEFT JOIN (
  SELECT invoice_id, SUM(amount) AS paid FROM payments GROUP BY invoice_id
) p ON p.invoice_id = i.id
WHERE i.status NOT IN ('cancelled', 'draft')
GROUP BY i.customer_id, i.team_id
HAVING SUM(COALESCE(p.paid, 0)) > 0
ORDER BY total_collected DESC;

-- Segment: Jobs at Risk — stuck, nearing deadline, or stale
CREATE OR REPLACE VIEW public.v_segment_jobs_at_risk
WITH (security_invoker = true)
AS
SELECT
  j.id AS job_id,
  j.customer_id,
  j.team_id,
  j.title,
  j.status,
  j.scheduled_date,
  j.updated_at,
  GREATEST(0, CURRENT_DATE - j.updated_at::date) AS days_since_update,
  CASE
    WHEN j.scheduled_date IS NOT NULL AND j.scheduled_date <= CURRENT_DATE + 3
      AND j.status IN ('pending', 'scheduled') THEN 'deadline_imminent'
    WHEN CURRENT_DATE - j.updated_at::date > 14 THEN 'stale'
    WHEN CURRENT_DATE - j.updated_at::date > 7 THEN 'stuck'
    ELSE 'at_risk'
  END AS risk_type
FROM jobs j
WHERE j.status IN ('pending', 'scheduled', 'in_progress')
  AND (
    CURRENT_DATE - j.updated_at::date > 7
    OR (j.scheduled_date IS NOT NULL AND j.scheduled_date <= CURRENT_DATE + 3 AND j.status IN ('pending', 'scheduled'))
  );

-- Segment: Recent Activity — last 7 days of meaningful events
CREATE OR REPLACE VIEW public.v_segment_recent_activity
WITH (security_invoker = true)
AS
SELECT customer_id, team_id, 'job_created' AS event_type, id AS record_id, created_at AS event_date
FROM jobs WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '7 days'
UNION ALL
SELECT customer_id, team_id, 'job_completed', id, updated_at
FROM jobs WHERE status = 'completed' AND updated_at >= CURRENT_TIMESTAMP - INTERVAL '7 days'
UNION ALL
SELECT customer_id, team_id, 'job_updated', id, updated_at
FROM jobs WHERE updated_at >= CURRENT_TIMESTAMP - INTERVAL '7 days' AND status != 'completed'
  AND updated_at != created_at
UNION ALL
SELECT customer_id, team_id, 'invoice_created', id, created_at
FROM invoices WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '7 days'
UNION ALL
SELECT i.customer_id, i.team_id, 'invoice_paid', i.id, p.payment_date::timestamptz
FROM invoices i
JOIN payments p ON p.invoice_id = i.id
WHERE p.payment_date >= CURRENT_DATE - 7;
