
-- 2. Job status change audit log
CREATE TABLE public.job_status_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  old_status text,
  new_status text NOT NULL,
  changed_by uuid,
  changed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.job_status_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view their job status changes"
  ON public.job_status_changes FOR SELECT TO authenticated
  USING (team_id IN (SELECT team_id FROM public.team_memberships WHERE user_id = auth.uid()));

CREATE POLICY "Team members can insert job status changes"
  ON public.job_status_changes FOR INSERT TO authenticated
  WITH CHECK (team_id IN (SELECT team_id FROM public.team_memberships WHERE user_id = auth.uid()));

-- Trigger function to auto-log status changes
CREATE OR REPLACE FUNCTION public.log_job_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.job_status_changes (job_id, team_id, old_status, new_status, changed_by)
    VALUES (NEW.id, NEW.team_id, OLD.status::text, NEW.status::text, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_job_status_change
  AFTER UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.log_job_status_change();

-- Index for fast lookups
CREATE INDEX idx_job_status_changes_job_id ON public.job_status_changes(job_id);
CREATE INDEX idx_job_status_changes_team_id ON public.job_status_changes(team_id);
