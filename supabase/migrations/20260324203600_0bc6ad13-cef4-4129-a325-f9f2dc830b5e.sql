
-- 1. Create job_status_history table
CREATE TABLE public.job_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  from_status job_status,
  to_status job_status NOT NULL,
  changed_by uuid,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_job_status_history_job_id ON public.job_status_history(job_id);
CREATE INDEX idx_job_status_history_team_id ON public.job_status_history(team_id);
CREATE INDEX idx_job_status_history_changed_at ON public.job_status_history(changed_at DESC);

ALTER TABLE public.job_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view own team history"
  ON public.job_status_history FOR SELECT TO authenticated
  USING (team_id IN (SELECT tm.team_id FROM team_memberships tm WHERE tm.user_id = auth.uid()));

CREATE POLICY "Team members can insert own team history"
  ON public.job_status_history FOR INSERT TO authenticated
  WITH CHECK (team_id IN (SELECT tm.team_id FROM team_memberships tm WHERE tm.user_id = auth.uid()));

-- 2. Update trigger function
CREATE OR REPLACE FUNCTION public.fn_log_job_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.job_status_history (job_id, team_id, from_status, to_status, changed_by, changed_at)
    VALUES (NEW.id, NEW.team_id, OLD.status, NEW.status, auth.uid(), now());
  END IF;
  RETURN NEW;
END;
$$;

-- 3. Seed from existing jobs
INSERT INTO public.job_status_history (job_id, team_id, from_status, to_status, changed_by, changed_at)
SELECT id, team_id, NULL, status, NULL, COALESCE(updated_at, created_at)
FROM public.jobs
WHERE status IN ('pending', 'scheduled', 'in_progress');

-- 4. Replace v_jobs_at_risk with real stage duration
CREATE OR REPLACE VIEW public.v_jobs_at_risk AS
SELECT
  j.id, j.team_id, j.title, j.status, j.estimated_value, j.customer_id,
  c.name AS customer_name, j.scheduled_date, j.updated_at,
  GREATEST(0, CURRENT_DATE - COALESCE(latest_entry.changed_at, j.updated_at)::date) AS days_in_stage
FROM jobs j
LEFT JOIN customers c ON c.id = j.customer_id
LEFT JOIN LATERAL (
  SELECT h.changed_at FROM job_status_history h WHERE h.job_id = j.id ORDER BY h.changed_at DESC LIMIT 1
) latest_entry ON true
WHERE j.status IN ('pending', 'scheduled', 'in_progress')
  AND GREATEST(0, CURRENT_DATE - COALESCE(latest_entry.changed_at, j.updated_at)::date) > 7
ORDER BY GREATEST(0, CURRENT_DATE - COALESCE(latest_entry.changed_at, j.updated_at)::date) DESC;

-- 5. Drop and recreate v_segment_jobs_at_risk (column layout changed)
DROP VIEW IF EXISTS public.v_segment_jobs_at_risk;
CREATE VIEW public.v_segment_jobs_at_risk AS
SELECT
  j.id AS job_id,
  j.customer_id,
  j.team_id,
  j.title,
  j.status,
  j.scheduled_date,
  j.updated_at,
  GREATEST(0, CURRENT_DATE - COALESCE(latest_entry.changed_at, j.updated_at)::date) AS days_since_update,
  CASE
    WHEN j.scheduled_date IS NOT NULL AND j.scheduled_date <= (CURRENT_DATE + 3)
         AND j.status IN ('pending', 'scheduled') THEN 'deadline_imminent'
    WHEN GREATEST(0, CURRENT_DATE - COALESCE(latest_entry.changed_at, j.updated_at)::date) > 14 THEN 'stale'
    WHEN GREATEST(0, CURRENT_DATE - COALESCE(latest_entry.changed_at, j.updated_at)::date) > 7 THEN 'stuck'
    ELSE 'at_risk'
  END AS risk_type
FROM jobs j
LEFT JOIN LATERAL (
  SELECT h.changed_at FROM job_status_history h WHERE h.job_id = j.id ORDER BY h.changed_at DESC LIMIT 1
) latest_entry ON true
WHERE j.status IN ('pending', 'scheduled', 'in_progress')
  AND (
    GREATEST(0, CURRENT_DATE - COALESCE(latest_entry.changed_at, j.updated_at)::date) > 7
    OR (j.scheduled_date IS NOT NULL AND j.scheduled_date <= (CURRENT_DATE + 3) AND j.status IN ('pending', 'scheduled'))
  );
