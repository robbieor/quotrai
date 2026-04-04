
CREATE OR REPLACE FUNCTION public.get_invoice_by_portal_token(token text)
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
    'logo_url', cb.logo_url,
    'accent_color', cb.accent_color,
    'company_phone', cb.company_phone,
    'company_email', cb.company_email,
    'company_address', cb.company_address,
    'payment_terms', cb.payment_terms,
    'bank_details', cb.bank_details,
    'stripe_connect_active', COALESCE(t.stripe_connect_onboarding_complete, false)
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
    'balance_due', v_invoice.balance_due,
    'notes', v_invoice.notes,
    'currency', v_invoice.currency,
    'created_at', v_invoice.created_at,
    'team_id', v_invoice.team_id,
    'customer', v_customer,
    'team', v_team,
    'items', COALESCE(v_items, '[]'::json)
  );
END;
$$;
