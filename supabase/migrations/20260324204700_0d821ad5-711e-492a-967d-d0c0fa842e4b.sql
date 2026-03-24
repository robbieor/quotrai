
DROP VIEW IF EXISTS public.v_invoice_risk;

CREATE VIEW public.v_invoice_risk AS
WITH overdue AS (
  SELECT
    i.id,
    i.customer_id,
    i.team_id,
    i.invoice_number,
    i.total,
    i.balance_due,
    i.due_date,
    i.issue_date,
    EXTRACT(DAY FROM (now() - i.due_date::timestamptz))::integer AS days_overdue,
    c.name AS customer_name
  FROM invoices i
  JOIN customers c ON c.id = i.customer_id
  WHERE i.status IN ('pending', 'overdue')
    AND i.due_date < CURRENT_DATE
    AND COALESCE(i.balance_due, i.total) > 0
),
grouped AS (
  SELECT
    o.customer_id,
    o.team_id,
    o.customer_name,
    SUM(COALESCE(o.balance_due, o.total)) AS total_due,
    MIN(o.due_date) AS oldest_due_date,
    MAX(o.days_overdue) AS max_days_overdue,
    COUNT(*) AS invoice_count
  FROM overdue o
  GROUP BY o.customer_id, o.team_id, o.customer_name
)
SELECT
  g.customer_id AS id,
  g.team_id,
  g.customer_name AS customer,
  g.total_due,
  g.oldest_due_date,
  TO_CHAR(g.oldest_due_date, 'DD Mon') AS oldest_invoice,
  g.max_days_overdue AS days_overdue,
  g.invoice_count,
  ROUND(
    (LEAST(g.max_days_overdue, 120)::numeric / 120 * 60) +
    (COALESCE(ps.late_payments_count::numeric / NULLIF(ps.total_invoices_paid, 0), 0) * 30) +
    (LEAST(g.total_due::numeric / 10000, 1) * 10),
    1
  ) AS risk_points,
  CASE
    WHEN (LEAST(g.max_days_overdue, 120)::numeric / 120 * 60) +
         (COALESCE(ps.late_payments_count::numeric / NULLIF(ps.total_invoices_paid, 0), 0) * 30) +
         (LEAST(g.total_due::numeric / 10000, 1) * 10) > 50 THEN 'high'
    WHEN (LEAST(g.max_days_overdue, 120)::numeric / 120 * 60) +
         (COALESCE(ps.late_payments_count::numeric / NULLIF(ps.total_invoices_paid, 0), 0) * 30) +
         (LEAST(g.total_due::numeric / 10000, 1) * 10) > 25 THEN 'medium'
    ELSE 'low'
  END AS risk_score,
  COALESCE(ps.avg_days_to_pay, 0) AS avg_days_to_pay,
  COALESCE(
    ROUND(ps.late_payments_count::numeric / NULLIF(ps.total_invoices_paid, 0) * 100, 0),
    0
  ) AS late_payment_rate
FROM grouped g
LEFT JOIN customer_payment_scores ps
  ON ps.customer_id = g.customer_id AND ps.team_id = g.team_id
ORDER BY risk_points DESC;
