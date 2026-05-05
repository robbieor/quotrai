
-- ============================================================
-- auth_sessions: per-device session tracking
-- ============================================================
CREATE TABLE public.auth_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_session_id TEXT NOT NULL,
  ip TEXT,
  user_agent TEXT,
  country TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT,
  UNIQUE (user_id, client_session_id)
);

CREATE INDEX idx_auth_sessions_user_active ON public.auth_sessions (user_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_auth_sessions_last_seen ON public.auth_sessions (last_seen_at DESC);

ALTER TABLE public.auth_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions"
  ON public.auth_sessions FOR SELECT
  USING (auth.uid() = user_id);

-- No INSERT/UPDATE/DELETE policies — service role only.

ALTER PUBLICATION supabase_realtime ADD TABLE public.auth_sessions;
ALTER TABLE public.auth_sessions REPLICA IDENTITY FULL;

-- ============================================================
-- security_events: audit log for sketchy behavior
-- ============================================================
CREATE TABLE public.security_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  user_id UUID,
  email TEXT,
  ip TEXT,
  user_agent TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_security_events_type_time ON public.security_events (event_type, created_at DESC);
CREATE INDEX idx_security_events_user ON public.security_events (user_id, created_at DESC);
CREATE INDEX idx_security_events_email ON public.security_events (email, created_at DESC);

ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- Only owners can read security events
CREATE POLICY "Owners can view security events"
  ON public.security_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.team_memberships tm
      WHERE tm.user_id = auth.uid() AND tm.role = 'owner'
    )
  );

-- ============================================================
-- One-email-one-team enforcement
-- ============================================================
CREATE OR REPLACE FUNCTION public.enforce_single_team_membership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_team UUID;
  user_email TEXT;
BEGIN
  SELECT team_id INTO existing_team
  FROM public.team_memberships
  WHERE user_id = NEW.user_id
    AND team_id IS DISTINCT FROM NEW.team_id
  LIMIT 1;

  IF existing_team IS NOT NULL THEN
    SELECT email INTO user_email FROM auth.users WHERE id = NEW.user_id;

    INSERT INTO public.security_events (event_type, user_id, email, details)
    VALUES (
      'multi_company_attempt',
      NEW.user_id,
      user_email,
      jsonb_build_object(
        'existing_team_id', existing_team,
        'attempted_team_id', NEW.team_id,
        'attempted_role', NEW.role
      )
    );

    RAISE EXCEPTION 'This email already belongs to another company. Use a different email or contact support.'
      USING ERRCODE = 'unique_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_single_team_membership
  BEFORE INSERT ON public.team_memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_single_team_membership();
