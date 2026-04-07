
-- Supplier directory: curated list of known suppliers per country
CREATE TABLE public.supplier_directory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_name TEXT NOT NULL,
  domain TEXT,
  country_code TEXT NOT NULL DEFAULT 'IE',
  trade_types TEXT[] DEFAULT '{}',
  logo_url TEXT,
  is_scrapeable BOOLEAN DEFAULT false,
  product_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.supplier_directory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can browse supplier directory"
  ON public.supplier_directory FOR SELECT TO authenticated USING (true);

-- Supplier requests: user suggestions pipeline
CREATE TABLE public.supplier_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  supplier_name TEXT NOT NULL,
  supplier_website TEXT,
  country_code TEXT NOT NULL DEFAULT 'IE',
  trade_type TEXT,
  notes TEXT,
  status TEXT DEFAULT 'pending',
  vote_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.supplier_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their team supplier requests"
  ON public.supplier_requests FOR SELECT TO authenticated
  USING (team_id IN (SELECT team_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create supplier requests for their team"
  ON public.supplier_requests FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND team_id IN (SELECT team_id FROM profiles WHERE id = auth.uid())
  );

-- Pre-seed Irish suppliers
INSERT INTO public.supplier_directory (supplier_name, domain, country_code, trade_types, is_scrapeable, product_count) VALUES
  ('Wesco', 'wesco.ie', 'IE', ARRAY['Electrical'], true, 0),
  ('City Plumbing', 'cityplumbing.ie', 'IE', ARRAY['Plumbing', 'Heating'], false, 0),
  ('Chadwicks', 'chadwicks.ie', 'IE', ARRAY['General', 'Building'], false, 0),
  ('Brooks', '?"brooks.ie"', 'IE', ARRAY['Building', 'Timber'], false, 0),
  ('Dera Group', 'deragroup.ie', 'IE', ARRAY['Electrical'], false, 0),
  ('Heat Merchants', 'heatmerchants.ie', 'IE', ARRAY['Plumbing', 'Heating'], false, 0),
  ('Tubs & Tiles', 'tubsandtiles.ie', 'IE', ARRAY['Plumbing', 'Bathrooms'], false, 0),
  ('Screwfix', 'screwfix.ie', 'IE', ARRAY['General', 'Electrical', 'Plumbing'], false, 0),
  ('Toolfix', 'toolfix.ie', 'IE', ARRAY['Tools', 'General'], false, 0),
  ('CEF', 'cef.ie', 'IE', ARRAY['Electrical'], false, 0);

CREATE INDEX idx_supplier_directory_country ON public.supplier_directory(country_code);
CREATE INDEX idx_supplier_requests_team ON public.supplier_requests(team_id);
