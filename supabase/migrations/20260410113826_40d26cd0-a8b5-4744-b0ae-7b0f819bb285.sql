
-- Create voice minute purchases table for transparent payment history
CREATE TABLE public.voice_minute_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  minutes_purchased INTEGER NOT NULL DEFAULT 30,
  amount_paid NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'eur',
  stripe_session_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'completed',
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.voice_minute_purchases ENABLE ROW LEVEL SECURITY;

-- Team members can view their team's purchases
CREATE POLICY "Team members can view purchases"
  ON public.voice_minute_purchases
  FOR SELECT
  TO authenticated
  USING (
    team_id IN (
      SELECT p.team_id FROM public.profiles p WHERE p.id = auth.uid()
    )
  );

-- Create atomic function to process a voice minute purchase (idempotent via stripe_session_id)
CREATE OR REPLACE FUNCTION public.process_voice_minute_purchase(
  p_stripe_session_id TEXT,
  p_team_id UUID,
  p_user_id UUID,
  p_minutes INTEGER,
  p_amount NUMERIC,
  p_currency TEXT DEFAULT 'eur'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert purchase record (will fail on duplicate stripe_session_id)
  INSERT INTO public.voice_minute_purchases (
    team_id, user_id, minutes_purchased, amount_paid, currency, stripe_session_id, status
  ) VALUES (
    p_team_id, p_user_id, p_minutes, p_amount, p_currency, p_stripe_session_id, 'completed'
  );

  -- Credit minutes to team
  UPDATE public.teams
  SET george_voice_minutes_limit = COALESCE(george_voice_minutes_limit, 0) + p_minutes
  WHERE id = p_team_id;

  RETURN TRUE;
EXCEPTION
  WHEN unique_violation THEN
    -- Already processed this session
    RETURN FALSE;
END;
$$;
