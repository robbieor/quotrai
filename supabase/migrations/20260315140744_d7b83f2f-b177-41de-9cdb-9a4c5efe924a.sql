-- Change all comms_settings boolean defaults from true to false
ALTER TABLE public.comms_settings ALTER COLUMN visit_reminder_enabled SET DEFAULT false;
ALTER TABLE public.comms_settings ALTER COLUMN quote_followup_enabled SET DEFAULT false;
ALTER TABLE public.comms_settings ALTER COLUMN job_complete_enabled SET DEFAULT false;
ALTER TABLE public.comms_settings ALTER COLUMN on_my_way_enabled SET DEFAULT false;
ALTER TABLE public.comms_settings ALTER COLUMN enquiry_ack_enabled SET DEFAULT false;
ALTER TABLE public.comms_settings ALTER COLUMN review_request_enabled SET DEFAULT false;

-- Add invoice_reminder and payment_receipt toggles
ALTER TABLE public.comms_settings 
  ADD COLUMN IF NOT EXISTS invoice_reminder_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS invoice_reminder_days integer NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS payment_receipt_enabled boolean NOT NULL DEFAULT false;