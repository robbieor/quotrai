CREATE OR REPLACE FUNCTION public.get_user_seat_type()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team_id uuid;
  v_tier text;
  v_status text;
  v_trial_ends_at timestamptz;
BEGIN
  -- Get the user's team
  SELECT team_id INTO v_team_id
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;

  IF v_team_id IS NULL THEN
    RETURN 'connect';
  END IF;

  -- Get tier from teams table
  SELECT 
    COALESCE(subscription_tier, tier, 'connect'),
    subscription_status,
    trial_ends_at
  INTO v_tier, v_status, v_trial_ends_at
  FROM public.teams
  WHERE id = v_team_id
  LIMIT 1;

  -- Trial users get connect-level access
  IF v_status = 'trialing' AND v_trial_ends_at IS NOT NULL AND v_trial_ends_at > now() THEN
    RETURN 'connect';
  END IF;

  -- Map new tier names to seat types
  RETURN CASE lower(COALESCE(v_tier, 'connect'))
    WHEN 'solo' THEN 'lite'
    WHEN 'lite' THEN 'lite'
    WHEN 'crew' THEN 'connect'
    WHEN 'pro' THEN 'connect'
    WHEN 'connect' THEN 'connect'
    WHEN 'business' THEN 'grow'
    WHEN 'scale' THEN 'grow'
    WHEN 'grow' THEN 'grow'
    ELSE 'connect'
  END;
EXCEPTION WHEN OTHERS THEN
  RETURN 'connect';
END;
$$;