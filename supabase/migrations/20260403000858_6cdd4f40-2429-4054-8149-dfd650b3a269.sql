
CREATE OR REPLACE FUNCTION public.get_quote_by_portal_token(token text)
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
    'logo_url', cb.logo_url,
    'accent_color', cb.accent_color,
    'company_phone', cb.company_phone,
    'company_email', cb.company_email,
    'company_address', cb.company_address
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
    'created_at', v_quote.created_at,
    'customer', v_customer,
    'team', v_team,
    'items', COALESCE(v_items, '[]'::json)
  );
END;
$$;
