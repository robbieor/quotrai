
-- =============================================
-- HOTFIX: Communication safety infrastructure
-- =============================================

-- 1. Create comms_audit_log table for traceability
CREATE TABLE public.comms_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  attempted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID,
  team_id UUID,
  record_type TEXT,
  record_id UUID,
  recipient TEXT,
  channel TEXT NOT NULL DEFAULT 'email',
  template TEXT,
  manual_send BOOLEAN NOT NULL DEFAULT false,
  confirmed_by_user BOOLEAN NOT NULL DEFAULT false,
  source_screen TEXT,
  allowed BOOLEAN NOT NULL DEFAULT false,
  blocked_reason TEXT,
  metadata JSONB
);

ALTER TABLE public.comms_audit_log ENABLE ROW LEVEL SECURITY;

-- Only service role and team owners can view audit logs
CREATE POLICY "Service role can manage comms audit log"
  ON public.comms_audit_log FOR ALL
  USING (auth.role() = 'service_role'::text)
  WITH CHECK (auth.role() = 'service_role'::text);

CREATE POLICY "Team owners can view comms audit log"
  ON public.comms_audit_log FOR SELECT
  USING (is_owner_of_team(team_id));

-- 2. Add communication_suppressed to invoices (default false, set true on imports)
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS communication_suppressed BOOLEAN NOT NULL DEFAULT false;

-- 3. Add communication_suppressed to quotes (default false, set true on imports)
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS communication_suppressed BOOLEAN NOT NULL DEFAULT false;

-- 4. Add delivery_status to invoices (separate from invoice lifecycle status)
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS delivery_status TEXT NOT NULL DEFAULT 'not_sent';

-- 5. Add delivery_status to quotes
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS delivery_status TEXT NOT NULL DEFAULT 'not_sent';
