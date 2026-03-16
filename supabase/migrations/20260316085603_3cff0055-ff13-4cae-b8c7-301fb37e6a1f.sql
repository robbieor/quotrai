ALTER TABLE public.comms_settings 
ADD COLUMN IF NOT EXISTS require_confirmation_all_comms boolean NOT NULL DEFAULT true;