
-- Fix 1: Map 'ceo' to 'owner' in get_user_team_role()
CREATE OR REPLACE FUNCTION public.get_user_team_role()
RETURNS team_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE WHEN role::text = 'ceo' THEN 'owner'::team_role ELSE role END
  FROM team_memberships
  WHERE user_id = auth.uid()
  LIMIT 1
$$;

-- Fix 2: Create trigger to sync team_memberships → org_members_v2
CREATE OR REPLACE FUNCTION public.sync_team_membership_to_org_v2()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  -- Find the org for the team owner
  SELECT org_id INTO v_org_id
  FROM org_members_v2
  WHERE user_id = (
    SELECT user_id FROM team_memberships
    WHERE team_id = NEW.team_id AND role IN ('ceo', 'owner')
    LIMIT 1
  )
  LIMIT 1;

  IF v_org_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Upsert into org_members_v2 with default seat_type 'lite' for members
  INSERT INTO org_members_v2 (org_id, user_id, role, seat_type, status)
  VALUES (
    v_org_id,
    NEW.user_id,
    CASE WHEN NEW.role::text IN ('ceo', 'owner') THEN 'owner' ELSE NEW.role::text END,
    CASE
      WHEN NEW.role::text IN ('ceo', 'owner') THEN 'connect'
      WHEN NEW.role::text = 'manager' THEN 'connect'
      ELSE 'lite'
    END,
    'active'
  )
  ON CONFLICT (org_id, user_id) DO UPDATE SET
    role = EXCLUDED.role,
    status = 'active';

  RETURN NEW;
END;
$$;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS trg_sync_team_to_org_v2 ON team_memberships;

-- Create trigger
CREATE TRIGGER trg_sync_team_to_org_v2
  AFTER INSERT ON team_memberships
  FOR EACH ROW
  EXECUTE FUNCTION sync_team_membership_to_org_v2();
