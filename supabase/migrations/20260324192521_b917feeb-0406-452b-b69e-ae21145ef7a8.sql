
CREATE OR REPLACE VIEW public.v_payment_behavior
WITH (security_invoker = true)
AS
SELECT
  i.customer_id,
  i.team_id,
  c.name AS customer_name,
  COUNT(DISTINCT i.id) AS total_invoices,
  COUNT(DISTINCT CASE WHEN i.status = 'paid' THEN i.id END) AS paid_invoices,
  COUNT(DISTINCT CASE WHEN i.status IN ('pending', 'overdue') THEN i.id END) AS outstanding_invoices,
  COALESCE(
    AVG(
      CASE WHEN p.first_payment IS NOT NULL
      THEN (p.first_payment - i.issue_date)
      END
    )::int, 0
  ) AS avg_days_to_pay,
  CASE
    WHEN COUNT(DISTINCT CASE WHEN i.status = 'paid' THEN i.id END) > 0
    THEN ROUND(
      (COUNT(DISTINCT CASE WHEN p.first_payment > i.due_date AND i.status = 'paid' THEN i.id END)::numeric /
       NULLIF(COUNT(DISTINCT CASE WHEN i.status = 'paid' THEN i.id END), 0) * 100), 1
    )
    ELSE 0
  END AS late_payment_pct,
  CASE
    WHEN COUNT(DISTINCT i.id) = 0 THEN 50
    ELSE LEAST(100, GREATEST(0,
      100
      - (COALESCE(AVG(CASE WHEN p.first_payment IS NOT NULL THEN GREATEST(0, p.first_payment - i.due_date) END), 0) * 2)::int
      - (COUNT(DISTINCT CASE WHEN i.status = 'overdue' THEN i.id END) * 10)
    ))
  END AS reliability_score
FROM invoices i
LEFT JOIN customers c ON c.id = i.customer_id
LEFT JOIN (
  SELECT invoice_id, MIN(payment_date) AS first_payment
  FROM payments
  GROUP BY invoice_id
) p ON p.invoice_id = i.id
WHERE i.status NOT IN ('cancelled', 'draft')
GROUP BY i.customer_id, i.team_id, c.name;
