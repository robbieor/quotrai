
-- Create sequences for system-generated refs
CREATE SEQUENCE IF NOT EXISTS public.quotes_ref_seq;
CREATE SEQUENCE IF NOT EXISTS public.invoices_ref_seq;

-- Add ref columns to quotes and invoices
ALTER TABLE public.quotes ADD COLUMN ref TEXT UNIQUE;
ALTER TABLE public.invoices ADD COLUMN ref TEXT UNIQUE;

-- Rename existing number columns to display_number
ALTER TABLE public.quotes RENAME COLUMN quote_number TO display_number;
ALTER TABLE public.invoices RENAME COLUMN invoice_number TO display_number;

-- Backfill ref for existing quotes
UPDATE public.quotes 
SET ref = 'QR-' || to_char(created_at, 'YYYY') || '-' || lpad(nextval('public.quotes_ref_seq')::text, 5, '0')
WHERE ref IS NULL;

-- Backfill ref for existing invoices
UPDATE public.invoices 
SET ref = 'IR-' || to_char(created_at, 'YYYY') || '-' || lpad(nextval('public.invoices_ref_seq')::text, 5, '0')
WHERE ref IS NULL;

-- Set default for ref columns going forward
ALTER TABLE public.quotes ALTER COLUMN ref SET DEFAULT 'QR-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.quotes_ref_seq')::text, 5, '0');
ALTER TABLE public.invoices ALTER COLUMN ref SET DEFAULT 'IR-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.invoices_ref_seq')::text, 5, '0');

-- Make ref NOT NULL after backfill
ALTER TABLE public.quotes ALTER COLUMN ref SET NOT NULL;
ALTER TABLE public.invoices ALTER COLUMN ref SET NOT NULL;
