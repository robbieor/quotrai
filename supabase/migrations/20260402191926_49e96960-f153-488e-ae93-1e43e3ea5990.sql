
-- Atomic quote number generation to prevent race conditions
CREATE OR REPLACE FUNCTION public.generate_quote_number(p_team_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num int;
BEGIN
  SELECT COALESCE(MAX(
    CASE WHEN display_number ~ '^Q-[0-9]+$'
         THEN CAST(SUBSTRING(display_number FROM 3) AS int)
         ELSE 0
    END
  ), 0) + 1
  INTO next_num
  FROM quotes
  WHERE team_id = p_team_id
  FOR UPDATE;  -- row-level lock prevents concurrent duplicates

  RETURN 'Q-' || LPAD(next_num::text, 4, '0');
END;
$$;

-- Atomic invoice number generation to prevent race conditions
CREATE OR REPLACE FUNCTION public.generate_invoice_number(p_team_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num int;
BEGIN
  SELECT COALESCE(MAX(
    CASE WHEN display_number ~ '^INV-[0-9]+$'
         THEN CAST(SUBSTRING(display_number FROM 5) AS int)
         ELSE 0
    END
  ), 0) + 1
  INTO next_num
  FROM invoices
  WHERE team_id = p_team_id
  FOR UPDATE;

  RETURN 'INV-' || LPAD(next_num::text, 4, '0');
END;
$$;
