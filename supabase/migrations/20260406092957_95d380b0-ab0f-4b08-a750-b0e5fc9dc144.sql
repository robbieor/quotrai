
-- Add pricing display mode to quotes and invoices
ALTER TABLE public.quotes ADD COLUMN pricing_display_mode text NOT NULL DEFAULT 'detailed';
ALTER TABLE public.invoices ADD COLUMN pricing_display_mode text NOT NULL DEFAULT 'detailed';

-- Add line group and visibility to quote_items and invoice_items
ALTER TABLE public.quote_items ADD COLUMN line_group text NOT NULL DEFAULT 'Materials';
ALTER TABLE public.quote_items ADD COLUMN visible boolean NOT NULL DEFAULT true;

ALTER TABLE public.invoice_items ADD COLUMN line_group text NOT NULL DEFAULT 'Materials';
ALTER TABLE public.invoice_items ADD COLUMN visible boolean NOT NULL DEFAULT true;

-- Add default display mode to templates
ALTER TABLE public.templates ADD COLUMN default_display_mode text NOT NULL DEFAULT 'detailed';
