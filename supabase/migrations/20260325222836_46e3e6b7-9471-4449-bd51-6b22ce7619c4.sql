
-- Fix 1: Convert all analytics views to security_invoker = true
-- This ensures views respect the querying user's RLS policies instead of the view creator's

ALTER VIEW public.v_invoice_balances SET (security_invoker = true);
ALTER VIEW public.v_invoice_risk SET (security_invoker = true);
ALTER VIEW public.v_job_profitability SET (security_invoker = true);
ALTER VIEW public.v_jobs_at_risk SET (security_invoker = true);
ALTER VIEW public.v_payment_behavior SET (security_invoker = true);
ALTER VIEW public.v_quote_conversion SET (security_invoker = true);
ALTER VIEW public.v_segment_high_risk_customers SET (security_invoker = true);
ALTER VIEW public.v_segment_jobs_at_risk SET (security_invoker = true);
ALTER VIEW public.v_segment_recent_activity SET (security_invoker = true);
ALTER VIEW public.v_segment_top_customers SET (security_invoker = true);

-- Fix 2: Restrict currency_rates to authenticated users only
DROP POLICY IF EXISTS "Anyone can view currency rates" ON public.currency_rates;
CREATE POLICY "Authenticated users can read currency rates"
  ON public.currency_rates FOR SELECT
  TO authenticated
  USING (true);

-- Fix 3: Restrict plan_prices_v2 to authenticated users only
DROP POLICY IF EXISTS "Anyone can read plan prices" ON public.plan_prices_v2;
CREATE POLICY "Authenticated users can read plan prices"
  ON public.plan_prices_v2 FOR SELECT
  TO authenticated
  USING (true);
