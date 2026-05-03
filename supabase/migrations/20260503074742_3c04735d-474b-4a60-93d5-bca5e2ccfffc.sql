CREATE TABLE IF NOT EXISTS public.voice_session_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  team_id uuid,
  attempt_id text,
  phase_reached text,
  transport text,
  connected boolean NOT NULL DEFAULT false,
  duration_ms integer,
  close_code integer,
  reason text,
  message text,
  raw_details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_voice_session_logs_user_created
  ON public.voice_session_logs (user_id, created_at DESC);

ALTER TABLE public.voice_session_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own voice session logs"
  ON public.voice_session_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own voice session logs"
  ON public.voice_session_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);