
CREATE TABLE public.foreman_ai_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  always_create_drafts boolean NOT NULL DEFAULT true,
  default_payment_terms_days integer NOT NULL DEFAULT 14,
  itemised_format boolean NOT NULL DEFAULT true,
  require_confirmation_before_send boolean NOT NULL DEFAULT true,
  default_tax_rate numeric DEFAULT NULL,
  labour_materials_split boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, user_id)
);

ALTER TABLE public.foreman_ai_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences"
  ON public.foreman_ai_preferences FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own preferences"
  ON public.foreman_ai_preferences FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() AND is_member_of_team(team_id));

CREATE POLICY "Users can update own preferences"
  ON public.foreman_ai_preferences FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Service role can manage preferences"
  ON public.foreman_ai_preferences FOR ALL
  TO authenticated
  USING (auth.role() = 'service_role'::text)
  WITH CHECK (auth.role() = 'service_role'::text);

-- Add memory_resolution_log column to ai_action_audit for auditing memory use
ALTER TABLE public.ai_action_audit ADD COLUMN IF NOT EXISTS memory_resolution_log jsonb DEFAULT NULL;
