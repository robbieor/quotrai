
-- Step 1: Create pricebook_import_jobs table
CREATE TABLE public.pricebook_import_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  pricebook_id UUID REFERENCES public.team_pricebooks(id) ON DELETE SET NULL,
  source_type TEXT NOT NULL DEFAULT 'manual',
  status TEXT NOT NULL DEFAULT 'pending',
  items_found INTEGER NOT NULL DEFAULT 0,
  items_imported INTEGER NOT NULL DEFAULT 0,
  items_failed INTEGER NOT NULL DEFAULT 0,
  error_log JSONB,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pricebook_import_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view their import jobs"
  ON public.pricebook_import_jobs FOR SELECT
  USING (team_id IN (SELECT team_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Team members can create import jobs"
  ON public.pricebook_import_jobs FOR INSERT
  WITH CHECK (team_id IN (SELECT team_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Team members can update their import jobs"
  ON public.pricebook_import_jobs FOR UPDATE
  USING (team_id IN (SELECT team_id FROM public.profiles WHERE id = auth.uid()));

-- Step 2: Add catalog_item_id FK to quote_items and invoice_items
ALTER TABLE public.quote_items
  ADD COLUMN catalog_item_id UUID REFERENCES public.team_catalog_items(id) ON DELETE SET NULL;

ALTER TABLE public.invoice_items
  ADD COLUMN catalog_item_id UUID REFERENCES public.team_catalog_items(id) ON DELETE SET NULL;
