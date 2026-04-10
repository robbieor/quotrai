CREATE OR REPLACE FUNCTION public.increment_voice_minutes(p_team_id uuid, p_minutes integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.teams
  SET george_voice_minutes_used = COALESCE(george_voice_minutes_used, 0) + p_minutes
  WHERE id = p_team_id;
END;
$$;