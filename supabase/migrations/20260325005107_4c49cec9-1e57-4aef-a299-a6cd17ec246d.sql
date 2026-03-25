ALTER TABLE public.time_entries
  ADD COLUMN IF NOT EXISTS break_start timestamptz,
  ADD COLUMN IF NOT EXISTS break_end timestamptz,
  ADD COLUMN IF NOT EXISTS break_duration_seconds integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS clock_in_photo_url text;