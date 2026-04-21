-- 1. Idempotency for webhook-inserted payments
-- The webhook stores `notes = "Stripe checkout cs_..."` which is unique per session.
-- A partial unique index lets pre-existing rows (some with NULL notes) coexist while
-- guaranteeing future webhook inserts cannot duplicate.
CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_invoice_notes
  ON public.payments (invoice_id, notes)
  WHERE notes IS NOT NULL;

-- 2. Block non-service-role updates to trial_ends_at on subscriptions_v2.
-- Owners legitimately need to UPDATE other columns (cancel_at_period_end etc.),
-- so we keep the existing UPDATE policy but lock down trial_ends_at via a trigger.
CREATE OR REPLACE FUNCTION public.protect_trial_ends_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow service role (webhook / edge functions w/ service key) to update freely
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- For all other roles (authenticated owners, etc.) reject any change to trial_ends_at
  IF NEW.trial_ends_at IS DISTINCT FROM OLD.trial_ends_at THEN
    RAISE EXCEPTION 'trial_ends_at can only be modified by the billing system'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_trial_ends_at ON public.subscriptions_v2;
CREATE TRIGGER trg_protect_trial_ends_at
  BEFORE UPDATE ON public.subscriptions_v2
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_trial_ends_at();