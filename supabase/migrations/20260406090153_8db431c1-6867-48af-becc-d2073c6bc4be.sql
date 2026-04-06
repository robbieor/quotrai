
-- Create team_pricebooks table
CREATE TABLE public.team_pricebooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name text NOT NULL,
  supplier_name text,
  source_type text NOT NULL DEFAULT 'manual',
  source_url text,
  trade_type text,
  item_count integer NOT NULL DEFAULT 0,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.team_pricebooks ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Team members can view their pricebooks"
  ON public.team_pricebooks FOR SELECT
  TO authenticated
  USING (team_id IN (SELECT team_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Team members can create pricebooks"
  ON public.team_pricebooks FOR INSERT
  TO authenticated
  WITH CHECK (team_id IN (SELECT team_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Team members can update their pricebooks"
  ON public.team_pricebooks FOR UPDATE
  TO authenticated
  USING (team_id IN (SELECT team_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Team members can delete their pricebooks"
  ON public.team_pricebooks FOR DELETE
  TO authenticated
  USING (team_id IN (SELECT team_id FROM public.profiles WHERE id = auth.uid()));

-- Add pricebook_id to team_catalog_items
ALTER TABLE public.team_catalog_items
  ADD COLUMN pricebook_id uuid REFERENCES public.team_pricebooks(id) ON DELETE SET NULL;

-- Index for fast lookups
CREATE INDEX idx_team_pricebooks_team_id ON public.team_pricebooks(team_id);
CREATE INDEX idx_team_catalog_items_pricebook_id ON public.team_catalog_items(pricebook_id);

-- Timestamp trigger
CREATE TRIGGER update_team_pricebooks_updated_at
  BEFORE UPDATE ON public.team_pricebooks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
