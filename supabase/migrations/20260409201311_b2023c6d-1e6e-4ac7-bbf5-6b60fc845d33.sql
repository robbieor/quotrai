CREATE OR REPLACE FUNCTION public.generate_invoice_number(p_team_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  WHERE team_id = p_team_id;

  RETURN 'INV-' || LPAD(next_num::text, 4, '0');
END;
$function$;