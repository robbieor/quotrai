
-- AI Action Audit Log table
CREATE TABLE public.ai_action_audit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  action_id TEXT NOT NULL,
  command_text TEXT NOT NULL,
  intent TEXT NOT NULL,
  intent_label TEXT NOT NULL,
  entities JSONB DEFAULT '[]'::jsonb,
  steps JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'completed',
  output_type TEXT,
  output_record_id TEXT,
  confirmation_required BOOLEAN DEFAULT false,
  confirmation_result TEXT,
  conversation_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for fast queries
CREATE INDEX idx_ai_action_audit_team_created ON public.ai_action_audit(team_id, created_at DESC);
CREATE INDEX idx_ai_action_audit_user ON public.ai_action_audit(user_id);
CREATE INDEX idx_ai_action_audit_intent ON public.ai_action_audit(intent);
CREATE INDEX idx_ai_action_audit_status ON public.ai_action_audit(status);

-- Enable RLS
ALTER TABLE public.ai_action_audit ENABLE ROW LEVEL SECURITY;

-- Service role can do anything (edge function writes)
CREATE POLICY "Service role manages ai audit"
  ON public.ai_action_audit FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Team owners/managers can view audit logs
CREATE POLICY "Owners and managers can view ai audit"
  ON public.ai_action_audit FOR SELECT
  USING (is_owner_or_manager_of_team(team_id));

-- Team members can view their own actions
CREATE POLICY "Members can view own ai audit"
  ON public.ai_action_audit FOR SELECT
  USING (user_id = auth.uid() AND is_member_of_team(team_id));
