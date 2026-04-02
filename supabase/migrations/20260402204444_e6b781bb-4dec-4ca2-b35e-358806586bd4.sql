
-- 1. document-emails: add DELETE policy (team-folder scoped)
CREATE POLICY "Team-scoped document email delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'document-emails'
  AND (storage.foldername(name))[1] = public.get_user_team_id()::text
);

-- 2. email-assets: add team-folder scoped policies
DROP POLICY IF EXISTS "Email assets auth read" ON storage.objects;
DROP POLICY IF EXISTS "Email assets auth upload" ON storage.objects;
DROP POLICY IF EXISTS "Email assets auth delete" ON storage.objects;

CREATE POLICY "Team-scoped email asset read"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'email-assets'
  AND (storage.foldername(name))[1] = public.get_user_team_id()::text
);

CREATE POLICY "Team-scoped email asset upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'email-assets'
  AND (storage.foldername(name))[1] = public.get_user_team_id()::text
);

CREATE POLICY "Team-scoped email asset delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'email-assets'
  AND (storage.foldername(name))[1] = public.get_user_team_id()::text
);

-- 3. drip_sequences: add policy so linter is happy
CREATE POLICY "Users can read own drip sequences"
ON public.drip_sequences
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 4. Portal token expiration columns
ALTER TABLE public.quotes
ADD COLUMN IF NOT EXISTS portal_token_expires_at timestamptz;

ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS portal_token_expires_at timestamptz;

-- Set default expiration for existing tokens
UPDATE public.quotes
SET portal_token_expires_at = now() + interval '30 days'
WHERE portal_token IS NOT NULL AND portal_token_expires_at IS NULL;

UPDATE public.invoices
SET portal_token_expires_at = now() + interval '30 days'
WHERE portal_token IS NOT NULL AND portal_token_expires_at IS NULL;

-- 5. Update portal RPC functions to check expiration
CREATE OR REPLACE FUNCTION public.get_quote_by_portal_token(token uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quote RECORD;
  v_items JSON;
  v_customer JSON;
  v_team JSON;
BEGIN
  SELECT * INTO v_quote FROM public.quotes
  WHERE portal_token = token
    AND (portal_token_expires_at IS NULL OR portal_token_expires_at > now());
  IF v_quote IS NULL THEN RETURN NULL; END IF;

  SELECT json_agg(row_to_json(qi)) INTO v_items
  FROM public.quote_items qi WHERE qi.quote_id = v_quote.id;

  SELECT json_build_object('name', c.name, 'email', c.email, 'phone', c.phone, 'address', c.address) INTO v_customer
  FROM public.customers c WHERE c.id = v_quote.customer_id;

  SELECT json_build_object(
    'name', t.name,
    'logo_url', cb.logo_url
  ) INTO v_team
  FROM public.teams t
  LEFT JOIN public.company_branding cb ON cb.team_id = t.id
  WHERE t.id = v_quote.team_id;

  RETURN json_build_object(
    'id', v_quote.id,
    'display_number', v_quote.display_number,
    'status', v_quote.status,
    'valid_until', v_quote.valid_until,
    'subtotal', v_quote.subtotal,
    'tax_rate', v_quote.tax_rate,
    'tax_amount', v_quote.tax_amount,
    'total', v_quote.total,
    'notes', v_quote.notes,
    'currency', v_quote.currency,
    'created_at', v_quote.created_at,
    'customer', v_customer,
    'team', v_team,
    'items', COALESCE(v_items, '[]'::json)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_invoice_by_portal_token(token uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice RECORD;
  v_items JSON;
  v_customer JSON;
  v_team JSON;
BEGIN
  SELECT * INTO v_invoice FROM public.invoices
  WHERE portal_token = token
    AND (portal_token_expires_at IS NULL OR portal_token_expires_at > now());
  IF v_invoice IS NULL THEN RETURN NULL; END IF;

  SELECT json_agg(row_to_json(ii)) INTO v_items
  FROM public.invoice_items ii WHERE ii.invoice_id = v_invoice.id;

  SELECT json_build_object('name', c.name, 'email', c.email, 'phone', c.phone, 'address', c.address) INTO v_customer
  FROM public.customers c WHERE c.id = v_invoice.customer_id;

  SELECT json_build_object(
    'name', t.name,
    'logo_url', cb.logo_url
  ) INTO v_team
  FROM public.teams t
  LEFT JOIN public.company_branding cb ON cb.team_id = t.id
  WHERE t.id = v_invoice.team_id;

  RETURN json_build_object(
    'id', v_invoice.id,
    'display_number', v_invoice.display_number,
    'status', v_invoice.status,
    'issue_date', v_invoice.issue_date,
    'due_date', v_invoice.due_date,
    'subtotal', v_invoice.subtotal,
    'tax_rate', v_invoice.tax_rate,
    'tax_amount', v_invoice.tax_amount,
    'total', v_invoice.total,
    'notes', v_invoice.notes,
    'currency', v_invoice.currency,
    'created_at', v_invoice.created_at,
    'customer', v_customer,
    'team', v_team,
    'items', COALESCE(v_items, '[]'::json)
  );
END;
$$;

-- 6. Tighten notifications SELECT
DROP POLICY IF EXISTS "Team members can view notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view team notifications" ON public.notifications;

CREATE POLICY "Users can view own or team-wide notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (
  team_id = public.get_user_team_id()
  AND (user_id IS NULL OR user_id = auth.uid())
);
