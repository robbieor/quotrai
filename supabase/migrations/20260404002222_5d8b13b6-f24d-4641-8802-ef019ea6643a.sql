
-- 1. Recreate handle_new_user with 14-day trial
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
  -- 1. Create team
  INSERT INTO public.teams (id, name, subscription_tier, trial_ends_at, is_trial)
  VALUES (
    gen_random_uuid(),
    COALESCE(NEW.raw_user_meta_data->>'company_name', 'My Team'),
    'pro',
    now() + interval '14 days',
    true
  )
  RETURNING id INTO new_team_id;

  -- 2. Create profile (team_id already exists)
  INSERT INTO public.profiles (id, full_name, team_id, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    new_team_id,
    'owner'
  );

  -- V2: create org
  INSERT INTO public.orgs_v2 (id, name, owner_id)
  VALUES (new_team_id, COALESCE(NEW.raw_user_meta_data->>'company_name', 'My Team'), NEW.id)
  RETURNING id INTO new_org_id;

  -- V2: create org member
  INSERT INTO public.org_members_v2 (org_id, user_id, role, seat_type)
  VALUES (new_org_id, NEW.id, 'owner', 'connect');

  -- V2: create subscription record (trialing)
  INSERT INTO public.subscriptions_v2 (org_id, status, seat_count, trial_ends_at)
  VALUES (new_org_id, 'trialing', 1, now() + interval '14 days');

  RETURN NEW;
END;
$$;

-- 2. Backfill existing trial teams to 14 days
UPDATE public.teams
SET trial_ends_at = created_at + interval '14 days'
WHERE is_trial = true
  AND trial_ends_at IS NOT NULL;

-- 3. Backfill existing trialing subscriptions to 14 days
UPDATE public.subscriptions_v2
SET trial_ends_at = created_at + interval '14 days'
WHERE status = 'trialing'
  AND trial_ends_at IS NOT NULL;
