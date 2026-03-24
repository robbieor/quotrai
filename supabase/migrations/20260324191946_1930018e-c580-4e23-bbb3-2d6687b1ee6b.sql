
-- Fix views to use security_invoker = true (Postgres 15+)
DROP VIEW IF EXISTS public.v_dashboard_kpis;
DROP VIEW IF EXISTS public.v_invoice_risk;
DROP VIEW IF EXISTS public.v_jobs_at_risk;
DROP VIEW IF EXISTS public.v_quote_conversion;
DROP VIEW IF EXISTS public.v_invoice_balances;

-- Recreate with security_invoker
CREATE VIEW public.v_invoice_balances
WITH (security_invoker = true)
AS
SELECT
  i.id, i.team_id, i.customer_id, i.invoice_number, i.status,
  i.issue_date, i.due_date, i.total,
  COALESCE(p.paid, 0) AS total_paid,
  GREATEST(COALESCE(i.total, 0) - COALESCE(p.paid, 0), 0) AS balance_due,
  CASE
    WHEN COALESCE(i.total, 0) - COALESCE(p.paid, 0) <= 0 THEN 'fully_paid'
    WHEN COALESCE(p.paid, 0) > 0 THEN 'partially_paid'
    ELSE 'unpaid'
  END AS payment_status,
  GREATEST(0, CURRENT_DATE - i.due_date) AS days_overdue
FROM invoices i
LEFT JOIN (SELECT invoice_id, SUM(amount) AS paid FROM payments GROUP BY invoice_id) p ON p.invoice_id = i.id;

CREATE VIEW public.v_jobs_at_risk
WITH (security_invoker = true)
AS
SELECT
  j.id, j.team_id, j.title, j.status, j.estimated_value, j.customer_id,
  c.name AS customer_name, j.scheduled_date, j.updated_at,
  GREATEST(0, CURRENT_DATE - j.updated_at::date) AS days_in_stage
FROM jobs j
LEFT JOIN customers c ON c.id = j.customer_id
WHERE j.status IN ('pending', 'scheduled', 'in_progress')
  AND CURRENT_DATE - j.updated_at::date > 7
ORDER BY days_in_stage DESC;

CREATE VIEW public.v_invoice_risk
WITH (security_invoker = true)
AS
SELECT
  ib.customer_id AS id, ib.team_id, c.name AS customer,
  SUM(ib.balance_due) AS total_due,
  MIN(ib.due_date) AS oldest_due_date,
  MAX(ib.days_overdue) AS max_days_overdue,
  COUNT(*) AS invoice_count,
  CASE WHEN MAX(ib.days_overdue) > 60 THEN 'high' WHEN MAX(ib.days_overdue) > 30 THEN 'medium' ELSE 'low' END AS risk_score
FROM v_invoice_balances ib
JOIN customers c ON c.id = ib.customer_id
WHERE ib.balance_due > 0 AND ib.status NOT IN ('cancelled', 'draft')
GROUP BY ib.customer_id, ib.team_id, c.name
ORDER BY max_days_overdue DESC;

CREATE VIEW public.v_quote_conversion
WITH (security_invoker = true)
AS
SELECT
  q.team_id,
  COUNT(*) AS total_created,
  COUNT(*) FILTER (WHERE q.status IN ('sent', 'accepted', 'declined')) AS total_sent,
  COUNT(*) FILTER (WHERE q.status = 'accepted') AS total_won,
  COUNT(*) FILTER (WHERE q.status = 'declined') AS total_lost,
  COALESCE(SUM(q.total), 0) AS created_value,
  COALESCE(SUM(q.total) FILTER (WHERE q.status IN ('sent', 'accepted', 'declined')), 0) AS sent_value,
  COALESCE(SUM(q.total) FILTER (WHERE q.status = 'accepted'), 0) AS won_value,
  COALESCE(SUM(q.total) FILTER (WHERE q.status = 'declined'), 0) AS lost_value,
  COALESCE(AVG(CASE WHEN q.status = 'accepted' THEN EXTRACT(EPOCH FROM (q.updated_at - q.created_at)) / 86400.0 END)::int, 0) AS avg_days_to_win,
  COUNT(*) FILTER (WHERE q.status = 'sent' AND CURRENT_DATE - q.created_at::date > 7) AS stale_quotes
FROM quotes q
GROUP BY q.team_id;
