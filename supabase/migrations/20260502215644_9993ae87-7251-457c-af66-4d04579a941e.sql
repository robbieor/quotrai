
CREATE TABLE public.daily_briefings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL,
  briefing_date DATE NOT NULL,
  content JSONB NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (team_id, briefing_date)
);
CREATE INDEX idx_daily_briefings_team_date ON public.daily_briefings(team_id, briefing_date DESC);
ALTER TABLE public.daily_briefings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team read briefings" ON public.daily_briefings FOR SELECT TO authenticated USING (team_id IN (SELECT team_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Team insert briefings" ON public.daily_briefings FOR INSERT TO authenticated WITH CHECK (team_id IN (SELECT team_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Team update briefings" ON public.daily_briefings FOR UPDATE TO authenticated USING (team_id IN (SELECT team_id FROM public.profiles WHERE id = auth.uid()));

CREATE TABLE public.pinned_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL,
  pinned_by UUID NOT NULL,
  question TEXT NOT NULL,
  answer_markdown TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_pinned_insights_team ON public.pinned_insights(team_id, created_at DESC);
ALTER TABLE public.pinned_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team read insights" ON public.pinned_insights FOR SELECT TO authenticated USING (team_id IN (SELECT team_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Team pin insights" ON public.pinned_insights FOR INSERT TO authenticated WITH CHECK (team_id IN (SELECT team_id FROM public.profiles WHERE id = auth.uid()) AND pinned_by = auth.uid());
CREATE POLICY "Team unpin insights" ON public.pinned_insights FOR DELETE TO authenticated USING (team_id IN (SELECT team_id FROM public.profiles WHERE id = auth.uid()));

CREATE MATERIALIZED VIEW public.team_metrics_aggregated AS
WITH
team_profile AS (
  SELECT DISTINCT ON (p.team_id)
    p.team_id,
    COALESCE(NULLIF(p.trade_type, ''), 'general') AS trade_type,
    COALESCE(NULLIF(p.country, ''), 'IE') AS country
  FROM profiles p WHERE p.team_id IS NOT NULL
),
quote_stats AS (
  SELECT team_id,
    COUNT(*) AS quote_count_90d,
    COALESCE(AVG(total), 0) AS avg_quote_value,
    COALESCE(
      COUNT(*) FILTER (WHERE status::text = 'accepted')::numeric
        / NULLIF(COUNT(*) FILTER (WHERE status::text IN ('accepted','declined','expired')), 0),
      0
    ) AS close_rate
  FROM quotes WHERE created_at > now() - INTERVAL '90 days' GROUP BY team_id
),
invoice_stats AS (
  SELECT team_id,
    COUNT(*) AS invoice_count_90d,
    COALESCE(
      COUNT(*) FILTER (WHERE status::text = 'paid' AND updated_at::date <= due_date)::numeric
        / NULLIF(COUNT(*) FILTER (WHERE status::text = 'paid'), 0),
      0
    ) AS paid_on_time_rate
  FROM invoices WHERE created_at > now() - INTERVAL '90 days' GROUP BY team_id
),
team_stats AS (
  SELECT tp.team_id, tp.trade_type, tp.country,
    COALESCE(qs.quote_count_90d, 0) AS quote_count_90d,
    COALESCE(qs.avg_quote_value, 0) AS avg_quote_value,
    COALESCE(qs.close_rate, 0) AS close_rate,
    COALESCE(inv.invoice_count_90d, 0) AS invoice_count_90d,
    COALESCE(inv.paid_on_time_rate, 0) AS paid_on_time_rate
  FROM team_profile tp
  LEFT JOIN quote_stats qs ON qs.team_id = tp.team_id
  LEFT JOIN invoice_stats inv ON inv.team_id = tp.team_id
)
SELECT trade_type, country, COUNT(*) AS team_count,
  PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY close_rate) AS close_rate_p25,
  PERCENTILE_CONT(0.5)  WITHIN GROUP (ORDER BY close_rate) AS close_rate_median,
  PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY close_rate) AS close_rate_p75,
  PERCENTILE_CONT(0.5)  WITHIN GROUP (ORDER BY avg_quote_value) AS avg_quote_value_median,
  PERCENTILE_CONT(0.5)  WITHIN GROUP (ORDER BY paid_on_time_rate) AS paid_on_time_median
FROM team_stats
WHERE quote_count_90d >= 10 AND invoice_count_90d >= 5
GROUP BY trade_type, country
HAVING COUNT(*) >= 3;

CREATE UNIQUE INDEX idx_team_metrics_agg_key ON public.team_metrics_aggregated(trade_type, country);
GRANT SELECT ON public.team_metrics_aggregated TO authenticated;

CREATE OR REPLACE FUNCTION public.get_team_benchmarks(_team_id UUID)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_trade TEXT; v_country TEXT; v_team JSONB; v_peer JSONB;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND team_id = _team_id) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  SELECT COALESCE(NULLIF(trade_type, ''), 'general'), COALESCE(NULLIF(country, ''), 'IE')
  INTO v_trade, v_country FROM profiles WHERE team_id = _team_id LIMIT 1;

  WITH q AS (
    SELECT * FROM quotes WHERE team_id = _team_id AND created_at > now() - INTERVAL '90 days'
  ), inv AS (
    SELECT * FROM invoices WHERE team_id = _team_id AND created_at > now() - INTERVAL '90 days'
  )
  SELECT jsonb_build_object(
    'close_rate', COALESCE((SELECT COUNT(*) FILTER (WHERE status::text='accepted')::numeric
       / NULLIF(COUNT(*) FILTER (WHERE status::text IN ('accepted','declined','expired')), 0) FROM q), 0),
    'avg_quote_value', COALESCE((SELECT AVG(total) FROM q), 0),
    'paid_on_time_rate', COALESCE((SELECT COUNT(*) FILTER (WHERE status::text='paid' AND updated_at::date <= due_date)::numeric
       / NULLIF(COUNT(*) FILTER (WHERE status::text='paid'), 0) FROM inv), 0),
    'quote_count', (SELECT COUNT(*) FROM q),
    'invoice_count', (SELECT COUNT(*) FROM inv)
  ) INTO v_team;

  SELECT to_jsonb(t) INTO v_peer FROM team_metrics_aggregated t
  WHERE t.trade_type = v_trade AND t.country = v_country;

  RETURN jsonb_build_object('trade_type', v_trade, 'country', v_country,
    'team', v_team, 'peer', COALESCE(v_peer, '{}'::jsonb));
END; $$;
GRANT EXECUTE ON FUNCTION public.get_team_benchmarks(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.refresh_team_benchmarks()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ BEGIN REFRESH MATERIALIZED VIEW CONCURRENTLY public.team_metrics_aggregated; END; $$;
