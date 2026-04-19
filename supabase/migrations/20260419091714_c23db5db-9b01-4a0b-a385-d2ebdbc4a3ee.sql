
-- =====================================================
-- 1. PORTAL TOKEN EXPIRATION
-- =====================================================
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS portal_token_expires_at TIMESTAMPTZ;

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS portal_token_expires_at TIMESTAMPTZ;

-- Backfill existing tokens to expire 90 days from now (so links keep working)
UPDATE public.quotes
SET portal_token_expires_at = now() + interval '90 days'
WHERE portal_token IS NOT NULL AND portal_token_expires_at IS NULL;

UPDATE public.invoices
SET portal_token_expires_at = now() + interval '90 days'
WHERE portal_token IS NOT NULL AND portal_token_expires_at IS NULL;

-- Set default for new tokens going forward
ALTER TABLE public.quotes
  ALTER COLUMN portal_token_expires_at SET DEFAULT (now() + interval '90 days');

ALTER TABLE public.invoices
  ALTER COLUMN portal_token_expires_at SET DEFAULT (now() + interval '90 days');

-- Update portal lookup functions to reject expired tokens
CREATE OR REPLACE FUNCTION public.get_quote_by_portal_token(token UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quote RECORD;
  v_items JSON;
  v_branding RECORD;
  v_customer RECORD;
BEGIN
  SELECT * INTO v_quote
  FROM public.quotes
  WHERE portal_token = token
    AND (portal_token_expires_at IS NULL OR portal_token_expires_at > now());

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Invalid or expired token');
  END IF;

  SELECT json_agg(qi.*) INTO v_items
  FROM public.quote_items qi
  WHERE qi.quote_id = v_quote.id;

  SELECT * INTO v_branding
  FROM public.company_branding
  WHERE team_id = v_quote.team_id;

  SELECT * INTO v_customer
  FROM public.customers
  WHERE id = v_quote.customer_id;

  RETURN json_build_object(
    'quote', row_to_json(v_quote),
    'items', COALESCE(v_items, '[]'::json),
    'branding', row_to_json(v_branding),
    'customer', row_to_json(v_customer)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_invoice_by_portal_token(token UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice RECORD;
  v_items JSON;
  v_branding RECORD;
  v_customer RECORD;
BEGIN
  SELECT * INTO v_invoice
  FROM public.invoices
  WHERE portal_token = token
    AND (portal_token_expires_at IS NULL OR portal_token_expires_at > now());

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Invalid or expired token');
  END IF;

  SELECT json_agg(ii.*) INTO v_items
  FROM public.invoice_items ii
  WHERE ii.invoice_id = v_invoice.id;

  SELECT * INTO v_branding
  FROM public.company_branding
  WHERE team_id = v_invoice.team_id;

  SELECT * INTO v_customer
  FROM public.customers
  WHERE id = v_invoice.customer_id;

  RETURN json_build_object(
    'invoice', row_to_json(v_invoice),
    'items', COALESCE(v_items, '[]'::json),
    'branding', row_to_json(v_branding),
    'customer', row_to_json(v_customer)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_quote_from_portal(token UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quote_id UUID;
BEGIN
  SELECT id INTO v_quote_id
  FROM public.quotes
  WHERE portal_token = token
    AND (portal_token_expires_at IS NULL OR portal_token_expires_at > now());

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid or expired token');
  END IF;

  UPDATE public.quotes
  SET status = 'accepted',
      accepted_at = now(),
      updated_at = now()
  WHERE id = v_quote_id;

  RETURN json_build_object('success', true, 'quote_id', v_quote_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.decline_quote_from_portal(token UUID, decline_reason TEXT DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quote_id UUID;
BEGIN
  SELECT id INTO v_quote_id
  FROM public.quotes
  WHERE portal_token = token
    AND (portal_token_expires_at IS NULL OR portal_token_expires_at > now());

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid or expired token');
  END IF;

  UPDATE public.quotes
  SET status = 'declined',
      decline_reason = COALESCE(decline_quote_from_portal.decline_reason, 'Declined by customer'),
      updated_at = now()
  WHERE id = v_quote_id;

  RETURN json_build_object('success', true, 'quote_id', v_quote_id);
END;
$$;

-- =====================================================
-- 2. AVATARS BUCKET — make private (auth required)
-- =====================================================
UPDATE storage.buckets SET public = false WHERE id = 'avatars';

DROP POLICY IF EXISTS "Public can view avatars" ON storage.objects;

CREATE POLICY "Authenticated users can view avatars"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'avatars');

-- =====================================================
-- 3. EMAIL-ASSETS — drop the broad listing policy
-- (Files remain publicly readable via signed/public URL when known —
--  required so email clients like Gmail can render logos —
--  but enumeration / listing is no longer possible.)
-- =====================================================
DROP POLICY IF EXISTS "Email assets are publicly accessible" ON storage.objects;

-- Keep "Team-scoped email asset read" policy (already exists) for app-side reads.
-- Public file delivery for email clients works via the public bucket URL with the exact key.

-- =====================================================
-- 4. OAUTH TOKEN HARDENING — Xero & QuickBooks
-- Remove team-owner SELECT on the raw token tables.
-- Expose a "safe" view with non-secret metadata only.
-- =====================================================

-- QuickBooks
DROP POLICY IF EXISTS "Team owners can view quickbooks connections" ON public.quickbooks_connections;

CREATE OR REPLACE VIEW public.quickbooks_connections_safe
WITH (security_invoker = true) AS
SELECT
  id,
  team_id,
  realm_id,
  company_name,
  token_expires_at,
  created_at,
  updated_at
FROM public.quickbooks_connections;

-- Allow owners SELECT on the underlying table only for the non-token columns via the view's security_invoker
-- We need a NEW restrictive policy that lets owners read but app code must use the view.
-- To prevent direct token reads, re-add a SELECT policy that returns rows BUT we cannot do column-level RLS easily.
-- Instead: keep SELECT removed from the table and ONLY allow access via the view.
-- The view uses security_invoker=true so it relies on the table policies — meaning the view will ALSO be empty.
-- Switch to security_invoker=false (definer) so the view bypasses the missing SELECT policy but only exposes safe columns.

DROP VIEW IF EXISTS public.quickbooks_connections_safe;
CREATE VIEW public.quickbooks_connections_safe
WITH (security_invoker = false) AS
SELECT
  id,
  team_id,
  realm_id,
  company_name,
  token_expires_at,
  created_at,
  updated_at
FROM public.quickbooks_connections;

REVOKE ALL ON public.quickbooks_connections_safe FROM PUBLIC, anon;
GRANT SELECT ON public.quickbooks_connections_safe TO authenticated;

-- Add a row-filter via a SECURITY DEFINER function used as a barrier
CREATE OR REPLACE FUNCTION public.get_my_quickbooks_connection()
RETURNS SETOF public.quickbooks_connections_safe
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.*
  FROM public.quickbooks_connections_safe s
  WHERE public.is_owner_of_team(s.team_id);
$$;

REVOKE ALL ON FUNCTION public.get_my_quickbooks_connection() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_quickbooks_connection() TO authenticated;

-- Xero
DROP POLICY IF EXISTS "Team owners can view xero connections" ON public.xero_connections;

DROP VIEW IF EXISTS public.xero_connections_safe;
CREATE VIEW public.xero_connections_safe
WITH (security_invoker = false) AS
SELECT
  id,
  team_id,
  xero_tenant_id,
  xero_tenant_name,
  scopes,
  token_expires_at,
  connected_by,
  created_at,
  updated_at
FROM public.xero_connections;

REVOKE ALL ON public.xero_connections_safe FROM PUBLIC, anon;
GRANT SELECT ON public.xero_connections_safe TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_xero_connection()
RETURNS SETOF public.xero_connections_safe
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.*
  FROM public.xero_connections_safe s
  WHERE public.is_owner_of_team(s.team_id);
$$;

REVOKE ALL ON FUNCTION public.get_my_xero_connection() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_xero_connection() TO authenticated;

-- =====================================================
-- 5. EARLY ACCESS REQUESTS — add platform admin role
-- =====================================================

-- Create app_role enum + user_roles table (skip if exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('platform_admin');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Admin policies on early_access_requests
DROP POLICY IF EXISTS "Platform admins can view early access requests" ON public.early_access_requests;
CREATE POLICY "Platform admins can view early access requests"
ON public.early_access_requests FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'platform_admin'));

DROP POLICY IF EXISTS "Platform admins can update early access requests" ON public.early_access_requests;
CREATE POLICY "Platform admins can update early access requests"
ON public.early_access_requests FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'platform_admin'))
WITH CHECK (public.has_role(auth.uid(), 'platform_admin'));
