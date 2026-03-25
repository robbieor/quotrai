ALTER TABLE public.quotes 
  ALTER COLUMN display_number SET DEFAULT 'QR-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.quotes_ref_seq')::text, 5, '0');

ALTER TABLE public.invoices 
  ALTER COLUMN display_number SET DEFAULT 'IR-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.invoices_ref_seq')::text, 5, '0');