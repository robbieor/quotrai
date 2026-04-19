
-- Drop the SECURITY DEFINER views and the SETOF-view functions that depend on them
DROP FUNCTION IF EXISTS public.get_my_quickbooks_connection();
DROP FUNCTION IF EXISTS public.get_my_xero_connection();
DROP VIEW IF EXISTS public.quickbooks_connections_safe;
DROP VIEW IF EXISTS public.xero_connections_safe;

-- Replace with JSON-returning SECURITY DEFINER functions (no view layer)
CREATE OR REPLACE FUNCTION public.get_my_quickbooks_connection()
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team_id UUID;
  v_result JSON;
BEGIN
  v_team_id := public.get_user_team_id();
  IF v_team_id IS NULL THEN
    RETURN NULL;
  END IF;

  IF NOT public.is_owner_of_team(v_team_id) THEN
    RETURN NULL;
  END IF;

  SELECT json_build_object(
    'id', id,
    'team_id', team_id,
    'realm_id', realm_id,
    'company_name', company_name,
    'token_expires_at', token_expires_at,
    'created_at', created_at,
    'updated_at', updated_at
  ) INTO v_result
  FROM public.quickbooks_connections
  WHERE team_id = v_team_id
  LIMIT 1;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_quickbooks_connection() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_quickbooks_connection() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_xero_connection()
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team_id UUID;
  v_result JSON;
BEGIN
  v_team_id := public.get_user_team_id();
  IF v_team_id IS NULL THEN
    RETURN NULL;
  END IF;

  IF NOT public.is_owner_of_team(v_team_id) THEN
    RETURN NULL;
  END IF;

  SELECT json_build_object(
    'id', id,
    'team_id', team_id,
    'xero_tenant_id', xero_tenant_id,
    'xero_tenant_name', xero_tenant_name,
    'scopes', scopes,
    'token_expires_at', token_expires_at,
    'connected_by', connected_by,
    'created_at', created_at,
    'updated_at', updated_at
  ) INTO v_result
  FROM public.xero_connections
  WHERE team_id = v_team_id
  LIMIT 1;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_xero_connection() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_xero_connection() TO authenticated;
