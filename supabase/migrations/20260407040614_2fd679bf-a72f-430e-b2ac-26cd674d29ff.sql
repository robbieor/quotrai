
-- Migration: Add internal costing + pricebook link to template_items, quote_items, invoice_items

-- 1. Extend template_items
ALTER TABLE public.template_items
  ADD COLUMN IF NOT EXISTS catalog_item_id UUID REFERENCES public.team_catalog_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cost_price NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sell_price NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS margin_percent NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS line_group TEXT DEFAULT 'Other';

-- 2. Extend quote_items with internal costing
ALTER TABLE public.quote_items
  ADD COLUMN IF NOT EXISTS cost_price NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS margin_percent NUMERIC DEFAULT 0;

-- 3. Extend invoice_items with internal costing
ALTER TABLE public.invoice_items
  ADD COLUMN IF NOT EXISTS cost_price NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS margin_percent NUMERIC DEFAULT 0;

-- Backfill template_items sell_price from existing unit_price where sell_price is 0
UPDATE public.template_items SET sell_price = unit_price WHERE sell_price = 0 AND unit_price > 0;
