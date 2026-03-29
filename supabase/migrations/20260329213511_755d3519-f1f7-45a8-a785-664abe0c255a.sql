
-- 1. Update handle_new_user to also provision v2 records
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_team_id uuid;
  new_org_id uuid;
BEGIN
  -- Legacy: create team
  INSERT INTO public.teams (name, subscription_tier, trial_ends_at, is_trial)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'company_name', 'My Team'),
    'pro',
    now() + interval '30 days',
    true
  )
  RETURNING id INTO new_team_id;

  -- Legacy: create profile with team_id in initial INSERT
  INSERT INTO public.profiles (id, team_id, full_name, email)
  VALUES (
    NEW.id,
    new_team_id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email
  );

  -- Legacy: create team membership
  INSERT INTO public.team_memberships (team_id, user_id, role)
  VALUES (new_team_id, NEW.id, 'owner');

  -- V2: create org
  INSERT INTO public.orgs_v2 (name)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'company_name', 'My Org'))
  RETURNING id INTO new_org_id;

  -- V2: create org member
  INSERT INTO public.org_members_v2 (org_id, user_id, role, seat_type, status)
  VALUES (new_org_id, NEW.id, 'owner', 'connect', 'active');

  -- V2: create subscription record (trialing)
  INSERT INTO public.subscriptions_v2 (org_id, status, seat_count, trial_ends_at)
  VALUES (new_org_id, 'trialing', 1, now() + interval '30 days');

  RETURN NEW;
END;
$$;

-- 2. Backfill existing users missing v2 records
DO $$
DECLARE
  r RECORD;
  new_org_id uuid;
BEGIN
  FOR r IN
    SELECT p.id AS user_id, p.full_name, p.email, t.name AS team_name
    FROM public.profiles p
    LEFT JOIN public.teams t ON t.id = p.team_id
    WHERE NOT EXISTS (
      SELECT 1 FROM public.org_members_v2 om WHERE om.user_id = p.id
    )
  LOOP
    -- Create org
    INSERT INTO public.orgs_v2 (name)
    VALUES (COALESCE(r.team_name, 'My Org'))
    RETURNING id INTO new_org_id;

    -- Create org member
    INSERT INTO public.org_members_v2 (org_id, user_id, role, seat_type, status)
    VALUES (new_org_id, r.user_id, 'owner', 'connect', 'active');

    -- Create subscription
    INSERT INTO public.subscriptions_v2 (org_id, status, seat_count, trial_ends_at)
    VALUES (new_org_id, 'trialing', 1, now() + interval '30 days');
  END LOOP;
END;
$$;
