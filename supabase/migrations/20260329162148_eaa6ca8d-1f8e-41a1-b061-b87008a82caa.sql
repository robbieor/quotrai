CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_team_id uuid;
BEGIN
  INSERT INTO public.teams (name, subscription_tier, trial_ends_at, is_trial)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'company_name', 'My Team'),
    'pro',
    now() + interval '30 days',
    true
  )
  RETURNING id INTO new_team_id;

  INSERT INTO public.profiles (id, team_id, full_name, email)
  VALUES (
    NEW.id,
    new_team_id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email
  );

  INSERT INTO public.team_memberships (team_id, user_id, role)
  VALUES (new_team_id, NEW.id, 'owner');

  RETURN NEW;
END;
$$;