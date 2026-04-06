
-- 1. Global supplier product reference catalog
CREATE TABLE public.supplier_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_name text NOT NULL,
  source_url text,
  supplier_sku text NOT NULL,
  product_name text NOT NULL,
  description text,
  category text,
  subcategory text,
  trade_type text DEFAULT 'Electrical',
  manufacturer text,
  website_price numeric(12,2),
  vat_mode text DEFAULT 'ex_vat',
  image_url text,
  unit_of_measure text DEFAULT 'each',
  last_scraped_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(supplier_name, supplier_sku)
);

ALTER TABLE public.supplier_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read supplier sources"
  ON public.supplier_sources FOR SELECT
  TO authenticated USING (true);

-- 2. Per-team supplier discount/markup settings
CREATE TABLE public.team_supplier_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  supplier_name text NOT NULL,
  discount_percent numeric(5,2) DEFAULT 0,
  default_markup_percent numeric(5,2) DEFAULT 30,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(team_id, supplier_name)
);

ALTER TABLE public.team_supplier_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can read their supplier settings"
  ON public.team_supplier_settings FOR SELECT
  TO authenticated
  USING (team_id IN (SELECT team_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Team members can insert supplier settings"
  ON public.team_supplier_settings FOR INSERT
  TO authenticated
  WITH CHECK (team_id IN (SELECT team_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Team members can update their supplier settings"
  ON public.team_supplier_settings FOR UPDATE
  TO authenticated
  USING (team_id IN (SELECT team_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Team members can delete their supplier settings"
  ON public.team_supplier_settings FOR DELETE
  TO authenticated
  USING (team_id IN (SELECT team_id FROM public.profiles WHERE id = auth.uid()));

-- 3. Team catalog items (the new price book)
CREATE TABLE public.team_catalog_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  source_id uuid REFERENCES public.supplier_sources(id),
  item_name text NOT NULL,
  supplier_name text,
  supplier_sku text,
  manufacturer text,
  category text,
  subcategory text,
  trade_type text DEFAULT 'Electrical',
  unit text DEFAULT 'each',
  website_price numeric(12,2),
  discount_percent numeric(5,2) DEFAULT 0,
  cost_price numeric(12,2) DEFAULT 0,
  markup_percent numeric(5,2) DEFAULT 30,
  sell_price numeric(12,2) DEFAULT 0,
  image_url text,
  is_favourite boolean DEFAULT false,
  last_used_at timestamptz,
  created_at timestamptz DEFAULT now(),
  last_updated timestamptz DEFAULT now()
);

-- Partial unique: only enforce when both supplier_name and supplier_sku are present
CREATE UNIQUE INDEX uq_team_catalog_supplier_sku
  ON public.team_catalog_items (team_id, supplier_name, supplier_sku)
  WHERE supplier_name IS NOT NULL AND supplier_sku IS NOT NULL;

ALTER TABLE public.team_catalog_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can read their catalog items"
  ON public.team_catalog_items FOR SELECT
  TO authenticated
  USING (team_id IN (SELECT team_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Team members can insert catalog items"
  ON public.team_catalog_items FOR INSERT
  TO authenticated
  WITH CHECK (team_id IN (SELECT team_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Team members can update their catalog items"
  ON public.team_catalog_items FOR UPDATE
  TO authenticated
  USING (team_id IN (SELECT team_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Team members can delete their catalog items"
  ON public.team_catalog_items FOR DELETE
  TO authenticated
  USING (team_id IN (SELECT team_id FROM public.profiles WHERE id = auth.uid()));

-- 4. Migrate existing supplier_price_book data into team_catalog_items
INSERT INTO public.team_catalog_items (team_id, item_name, supplier_name, category, unit, cost_price, sell_price, created_at, last_updated)
SELECT team_id, item_name, supplier_name, category, unit, cost_price, sell_price, created_at, last_updated
FROM public.supplier_price_book;

-- 5. Indexes for performance
CREATE INDEX idx_team_catalog_items_team ON public.team_catalog_items(team_id);
CREATE INDEX idx_team_catalog_items_trade ON public.team_catalog_items(trade_type);
CREATE INDEX idx_team_catalog_items_category ON public.team_catalog_items(category);
CREATE INDEX idx_team_catalog_items_supplier ON public.team_catalog_items(supplier_name);
CREATE INDEX idx_supplier_sources_supplier ON public.supplier_sources(supplier_name);
CREATE INDEX idx_supplier_sources_sku ON public.supplier_sources(supplier_sku);
