
CREATE TABLE IF NOT EXISTS public.customer_payment_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  total_invoices_paid integer NOT NULL DEFAULT 0,
  late_payments_count integer NOT NULL DEFAULT 0,
  avg_days_to_pay numeric(6,1) NOT NULL DEFAULT 0,
  avg_days_late numeric(6,1) NOT NULL DEFAULT 0,
  last_computed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (customer_id, team_id)
);

ALTER TABLE public.customer_payment_scores ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Team members can read payment scores' AND tablename = 'customer_payment_scores') THEN
    CREATE POLICY "Team members can read payment scores"
      ON public.customer_payment_scores FOR SELECT TO authenticated
      USING (team_id IN (SELECT get_user_team_id()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Team members can manage payment scores' AND tablename = 'customer_payment_scores') THEN
    CREATE POLICY "Team members can manage payment scores"
      ON public.customer_payment_scores FOR ALL TO authenticated
      USING (team_id IN (SELECT get_user_team_id()))
      WITH CHECK (team_id IN (SELECT get_user_team_id()));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.fn_compute_payment_scores(p_team_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO customer_payment_scores (customer_id, team_id, total_invoices_paid, late_payments_count, avg_days_to_pay, avg_days_late, last_computed_at)
  SELECT
    i.customer_id,
    i.team_id,
    COUNT(*)::integer,
    COUNT(*) FILTER (WHERE ep.earliest_payment > i.due_date)::integer,
    COALESCE(AVG(EXTRACT(EPOCH FROM (ep.earliest_payment - i.issue_date::timestamptz)) / 86400), 0)::numeric(6,1),
    COALESCE(
      AVG(EXTRACT(EPOCH FROM (ep.earliest_payment - i.due_date::timestamptz)) / 86400)
        FILTER (WHERE ep.earliest_payment > i.due_date),
      0
    )::numeric(6,1),
    now()
  FROM invoices i
  INNER JOIN LATERAL (
    SELECT MIN(p.payment_date::timestamptz) AS earliest_payment
    FROM payments p
    WHERE p.invoice_id = i.id
  ) ep ON ep.earliest_payment IS NOT NULL
  WHERE i.team_id = p_team_id
    AND i.status = 'paid'
  GROUP BY i.customer_id, i.team_id
  ON CONFLICT (customer_id, team_id) DO UPDATE SET
    total_invoices_paid = EXCLUDED.total_invoices_paid,
    late_payments_count = EXCLUDED.late_payments_count,
    avg_days_to_pay = EXCLUDED.avg_days_to_pay,
    avg_days_late = EXCLUDED.avg_days_late,
    last_computed_at = now();
END;
$$;
