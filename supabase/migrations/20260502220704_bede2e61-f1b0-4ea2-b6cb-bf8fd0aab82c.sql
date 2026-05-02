
-- =========================================================
-- automation_suggestions
-- =========================================================
CREATE TABLE public.automation_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL,
  pattern_key TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  confidence NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (team_id, pattern_key, status) DEFERRABLE INITIALLY DEFERRED
);
CREATE INDEX idx_auto_suggestions_team_status ON public.automation_suggestions(team_id, status, created_at DESC);
ALTER TABLE public.automation_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members read suggestions" ON public.automation_suggestions
FOR SELECT TO authenticated USING (is_member_of_team(team_id));
CREATE POLICY "Owners managers update suggestions" ON public.automation_suggestions
FOR UPDATE TO authenticated USING (is_owner_or_manager_of_team(team_id));
CREATE POLICY "Service role manages suggestions" ON public.automation_suggestions
FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =========================================================
-- team_automations
-- =========================================================
CREATE TABLE public.team_automations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL,
  pattern_key TEXT NOT NULL,
  name TEXT NOT NULL,
  trigger_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  action_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  enabled BOOLEAN NOT NULL DEFAULT true,
  preview_mode BOOLEAN NOT NULL DEFAULT true,
  run_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_team_automations_team_enabled ON public.team_automations(team_id, enabled);
ALTER TABLE public.team_automations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members read automations" ON public.team_automations
FOR SELECT TO authenticated USING (is_member_of_team(team_id));
CREATE POLICY "Owners managers create automations" ON public.team_automations
FOR INSERT TO authenticated WITH CHECK (is_owner_or_manager_of_team(team_id) AND created_by = auth.uid());
CREATE POLICY "Owners managers update automations" ON public.team_automations
FOR UPDATE TO authenticated USING (is_owner_or_manager_of_team(team_id));
CREATE POLICY "Owners managers delete automations" ON public.team_automations
FOR DELETE TO authenticated USING (is_owner_or_manager_of_team(team_id));
CREATE POLICY "Service role manages team automations" ON public.team_automations
FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =========================================================
-- automation_runs
-- =========================================================
CREATE TABLE public.automation_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  automation_id UUID NOT NULL REFERENCES public.team_automations(id) ON DELETE CASCADE,
  team_id UUID NOT NULL,
  ran_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  target_table TEXT,
  target_id UUID,
  action TEXT NOT NULL,
  preview BOOLEAN NOT NULL DEFAULT false,
  success BOOLEAN NOT NULL DEFAULT true,
  error TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);
CREATE INDEX idx_automation_runs_team_ran ON public.automation_runs(team_id, ran_at DESC);
CREATE INDEX idx_automation_runs_automation ON public.automation_runs(automation_id, ran_at DESC);
ALTER TABLE public.automation_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members read runs" ON public.automation_runs
FOR SELECT TO authenticated USING (is_member_of_team(team_id));
CREATE POLICY "Service role writes runs" ON public.automation_runs
FOR ALL TO service_role USING (true) WITH CHECK (true);

-- updated_at triggers
CREATE TRIGGER trg_automation_suggestions_updated
BEFORE UPDATE ON public.automation_suggestions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_team_automations_updated
BEFORE UPDATE ON public.team_automations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
