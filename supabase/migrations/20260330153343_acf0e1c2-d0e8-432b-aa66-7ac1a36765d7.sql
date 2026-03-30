CREATE TABLE public.cancellation_reasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reason text NOT NULL,
  detail text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.cancellation_reasons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert own reasons" ON public.cancellation_reasons
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());