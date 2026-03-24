
-- 4. Add balance_due column to invoices with auto-update trigger
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS balance_due numeric DEFAULT 0;

-- Initialize balance_due for all existing invoices
UPDATE public.invoices SET balance_due = GREATEST(0, COALESCE(total, 0) - COALESCE((
  SELECT SUM(amount) FROM payments WHERE payments.invoice_id = invoices.id
), 0));

-- Function to recalculate balance_due when payments change
CREATE OR REPLACE FUNCTION public.update_invoice_balance_due()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_invoice_id uuid;
  total_paid numeric;
  invoice_total numeric;
BEGIN
  -- Determine which invoice to update
  IF TG_OP = 'DELETE' THEN
    target_invoice_id := OLD.invoice_id;
  ELSE
    target_invoice_id := NEW.invoice_id;
  END IF;

  -- Calculate total paid
  SELECT COALESCE(SUM(amount), 0) INTO total_paid
  FROM payments WHERE invoice_id = target_invoice_id;

  -- Get invoice total
  SELECT COALESCE(total, 0) INTO invoice_total
  FROM invoices WHERE id = target_invoice_id;

  -- Update balance_due
  UPDATE invoices
  SET balance_due = GREATEST(0, invoice_total - total_paid)
  WHERE id = target_invoice_id;

  -- Also handle old invoice if payment was moved
  IF TG_OP = 'UPDATE' AND OLD.invoice_id IS DISTINCT FROM NEW.invoice_id THEN
    SELECT COALESCE(SUM(amount), 0) INTO total_paid
    FROM payments WHERE invoice_id = OLD.invoice_id;

    SELECT COALESCE(total, 0) INTO invoice_total
    FROM invoices WHERE id = OLD.invoice_id;

    UPDATE invoices
    SET balance_due = GREATEST(0, invoice_total - total_paid)
    WHERE id = OLD.invoice_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger on payments table
CREATE TRIGGER trg_update_invoice_balance
  AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_invoice_balance_due();

-- Also update balance_due when invoice total changes
CREATE OR REPLACE FUNCTION public.update_balance_on_invoice_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_paid numeric;
BEGIN
  IF OLD.total IS DISTINCT FROM NEW.total THEN
    SELECT COALESCE(SUM(amount), 0) INTO total_paid
    FROM payments WHERE invoice_id = NEW.id;
    
    NEW.balance_due := GREATEST(0, COALESCE(NEW.total, 0) - total_paid);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_balance_on_total_change
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_balance_on_invoice_change();
