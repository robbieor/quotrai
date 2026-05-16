-- GDPR launch sprint: consent + deletion + location consent
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS scheduled_deletion_at timestamptz,
  ADD COLUMN IF NOT EXISTS deletion_cancel_token text,
  ADD COLUMN IF NOT EXISTS consented_terms_at    timestamptz,
  ADD COLUMN IF NOT EXISTS consented_privacy_at  timestamptz,
  ADD COLUMN IF NOT EXISTS location_consent_at   timestamptz,
  ADD COLUMN IF NOT EXISTS marketing_opt_in      boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_profiles_scheduled_deletion
  ON public.profiles (scheduled_deletion_at)
  WHERE scheduled_deletion_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_deletion_cancel_token
  ON public.profiles (deletion_cancel_token)
  WHERE deletion_cancel_token IS NOT NULL;