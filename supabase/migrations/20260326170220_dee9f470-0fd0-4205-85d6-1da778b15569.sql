
-- Feature 6: Supplier Price Book
CREATE TABLE public.supplier_price_book (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  item_name text NOT NULL,
  supplier_name text,
  category text,
  unit text DEFAULT 'each',
  cost_price numeric NOT NULL DEFAULT 0,
  sell_price numeric NOT NULL DEFAULT 0,
  last_updated timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.supplier_price_book ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own team price book"
  ON public.supplier_price_book FOR SELECT TO authenticated
  USING (team_id IN (SELECT team_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert own team price book"
  ON public.supplier_price_book FOR INSERT TO authenticated
  WITH CHECK (team_id IN (SELECT team_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update own team price book"
  ON public.supplier_price_book FOR UPDATE TO authenticated
  USING (team_id IN (SELECT team_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete own team price book"
  ON public.supplier_price_book FOR DELETE TO authenticated
  USING (team_id IN (SELECT team_id FROM public.profiles WHERE id = auth.uid()));

CREATE INDEX idx_supplier_price_book_team ON public.supplier_price_book(team_id);
CREATE INDEX idx_supplier_price_book_item ON public.supplier_price_book(team_id, item_name);

-- Feature 3: Job photos table
CREATE TABLE public.job_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  caption text,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.job_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own team job photos"
  ON public.job_photos FOR SELECT TO authenticated
  USING (team_id IN (SELECT team_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert own team job photos"
  ON public.job_photos FOR INSERT TO authenticated
  WITH CHECK (team_id IN (SELECT team_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete own team job photos"
  ON public.job_photos FOR DELETE TO authenticated
  USING (team_id IN (SELECT team_id FROM public.profiles WHERE id = auth.uid()));

-- Allow anonymous access for portal viewing
CREATE POLICY "Portal can view job photos"
  ON public.job_photos FOR SELECT TO anon
  USING (true);

-- Feature 3: Add signature columns to quotes
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS signature_url text;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS signed_at timestamptz;

-- Feature 7: Add timezone to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'Europe/Dublin';

-- Feature 4: Add lat/lng to jobs
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS latitude numeric;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS longitude numeric;
