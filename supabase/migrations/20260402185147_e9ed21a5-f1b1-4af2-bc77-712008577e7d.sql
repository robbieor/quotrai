-- Fix comms_queue FK delete rules
ALTER TABLE public.comms_queue DROP CONSTRAINT comms_queue_customer_id_fkey;
ALTER TABLE public.comms_queue ADD CONSTRAINT comms_queue_customer_id_fkey
  FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;

ALTER TABLE public.comms_queue DROP CONSTRAINT comms_queue_job_id_fkey;
ALTER TABLE public.comms_queue ADD CONSTRAINT comms_queue_job_id_fkey
  FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE SET NULL;

ALTER TABLE public.comms_queue DROP CONSTRAINT comms_queue_quote_id_fkey;
ALTER TABLE public.comms_queue ADD CONSTRAINT comms_queue_quote_id_fkey
  FOREIGN KEY (quote_id) REFERENCES public.quotes(id) ON DELETE SET NULL;

ALTER TABLE public.comms_queue DROP CONSTRAINT comms_queue_team_id_fkey;
ALTER TABLE public.comms_queue ADD CONSTRAINT comms_queue_team_id_fkey
  FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;

-- Fix customer_addresses.team_id
ALTER TABLE public.customer_addresses DROP CONSTRAINT customer_addresses_team_id_fkey;
ALTER TABLE public.customer_addresses ADD CONSTRAINT customer_addresses_team_id_fkey
  FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;

-- Fix expenses.created_by
ALTER TABLE public.expenses DROP CONSTRAINT expenses_created_by_fkey;
ALTER TABLE public.expenses ADD CONSTRAINT expenses_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Fix certificates.created_by
ALTER TABLE public.certificates DROP CONSTRAINT certificates_created_by_fkey;
ALTER TABLE public.certificates ADD CONSTRAINT certificates_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;