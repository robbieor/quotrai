
-- View: invoice balances (accounts for partial payments)
CREATE OR REPLACE VIEW public.v_invoice_balances AS
SELECT
  i.id,
  i.team_id,
  i.customer_id,
  i.invoice_number,
  i.status,
  i.issue_date,
  i.due_date,
  i.total,
  COALESCE(p.paid, 0) AS total_paid,
  GREATEST(COALESCE(i.total, 0) - COALESCE(p.paid, 0), 0) AS balance_due,
  CASE
    WHEN COALESCE(i.total, 0) - COALESCE(p.paid, 0) <= 0 THEN 'fully_paid'
    WHEN COALESCE(p.paid, 0) > 0 THEN 'partially_paid'
    ELSE 'unpaid'
  END AS payment_status,
  GREATEST(0, CURRENT_DATE - i.due_date) AS days_overdue
FROM invoices i
LEFT JOIN (
  SELECT invoice_id, SUM(amount) AS paid
  FROM payments
  GROUP BY invoice_id
) p ON p.invoice_id = i.id;

-- View: dashboard KPIs
CREATE OR REPLACE VIEW public.v_dashboard_kpis AS
SELECT
  ib.team_id,
  -- Cash Collected MTD
  COALESCE(SUM(CASE WHEN pay.payment_date >= date_trunc('month', CURRENT_DATE)
    AND pay.payment_date <= CURRENT_DATE THEN pay.amount ELSE 0 END), 0) AS cash_collected_mtd,
  COUNT(DISTINCT CASE WHEN pay.payment_date >= date_trunc('month', CURRENT_DATE)
    AND pay.payment_date <= CURRENT_DATE THEN pay.id END) AS cash_collected_count,
  -- Outstanding AR (balance_due > 0)
  COALESCE(SUM(CASE WHEN ib.balance_due > 0 AND ib.status NOT IN ('cancelled', 'draft') THEN ib.balance_due ELSE 0 END), 0) AS outstanding_ar,
  COUNT(DISTINCT CASE WHEN ib.balance_due > 0 AND ib.status NOT IN ('cancelled', 'draft') THEN ib.id END) AS outstanding_ar_count,
  -- 30+ Day Overdue
  COALESCE(SUM(CASE WHEN ib.days_overdue > 30 AND ib.balance_due > 0 THEN ib.balance_due ELSE 0 END), 0) AS overdue_30_plus,
  COUNT(DISTINCT CASE WHEN ib.days_overdue > 30 AND ib.balance_due > 0 THEN ib.id END) AS overdue_30_plus_count,
  -- Revenue MTD (invoiced this month, all non-cancelled)
  COALESCE(SUM(CASE WHEN ib.issue_date >= date_trunc('month', CURRENT_DATE)
    AND ib.issue_date <= CURRENT_DATE AND ib.status NOT IN ('cancelled', 'draft') THEN ib.total ELSE 0 END), 0) AS revenue_mtd,
  -- Revenue Last Month
  COALESCE(SUM(CASE WHEN ib.issue_date >= date_trunc('month', CURRENT_DATE) - INTERVAL '1 month'
    AND ib.issue_date < date_trunc('month', CURRENT_DATE) AND ib.status NOT IN ('cancelled', 'draft') THEN ib.total ELSE 0 END), 0) AS revenue_last_month
FROM v_invoice_balances ib
LEFT JOIN payments pay ON pay.team_id = ib.team_id
GROUP BY ib.team_id;

-- View: jobs at risk (using updated_at for stage duration)
CREATE OR REPLACE VIEW public.v_jobs_at_risk AS
SELECT
  j.id,
  j.team_id,
  j.title,
  j.status,
  j.estimated_value,
  j.customer_id,
  c.name AS customer_name,
  j.scheduled_date,
  j.updated_at,
  GREATEST(0, CURRENT_DATE - j.updated_at::date) AS days_in_stage
FROM jobs j
LEFT JOIN customers c ON c.id = j.customer_id
WHERE j.status IN ('pending', 'scheduled', 'in_progress')
  AND CURRENT_DATE - j.updated_at::date > 7
ORDER BY days_in_stage DESC;

-- View: invoice risk by customer
CREATE OR REPLACE VIEW public.v_invoice_risk AS
SELECT
  ib.customer_id AS id,
  ib.team_id,
  c.name AS customer,
  SUM(ib.balance_due) AS total_due,
  MIN(ib.due_date) AS oldest_due_date,
  MAX(ib.days_overdue) AS max_days_overdue,
  COUNT(*) AS invoice_count,
  CASE
    WHEN MAX(ib.days_overdue) > 60 THEN 'high'
    WHEN MAX(ib.days_overdue) > 30 THEN 'medium'
    ELSE 'low'
  END AS risk_score
FROM v_invoice_balances ib
JOIN customers c ON c.id = ib.customer_id
WHERE ib.balance_due > 0 AND ib.status NOT IN ('cancelled', 'draft')
GROUP BY ib.customer_id, ib.team_id, c.name
ORDER BY max_days_overdue DESC;

-- View: quote conversion funnel
CREATE OR REPLACE VIEW public.v_quote_conversion AS
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
  COALESCE(AVG(
    CASE WHEN q.status = 'accepted'
    THEN EXTRACT(EPOCH FROM (q.updated_at - q.created_at)) / 86400.0
    END
  )::int, 0) AS avg_days_to_win,
  COUNT(*) FILTER (WHERE q.status = 'sent' AND CURRENT_DATE - q.created_at::date > 7) AS stale_quotes
FROM quotes q
GROUP BY q.team_id;
