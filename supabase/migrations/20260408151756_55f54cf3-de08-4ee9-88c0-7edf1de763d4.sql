
-- Remove the global sequence default
ALTER TABLE public.customers ALTER COLUMN client_number DROP DEFAULT;

-- Create a function that assigns per-team sequential client numbers
CREATE OR REPLACE FUNCTION public.assign_team_client_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SELECT COALESCE(MAX(client_number), 0) + 1
  INTO NEW.client_number
  FROM public.customers
  WHERE team_id = NEW.team_id;
  
  RETURN NEW;
END;
$$;

-- Create trigger that fires before insert
CREATE TRIGGER trg_assign_client_number
BEFORE INSERT ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.assign_team_client_number();

-- Fix existing data: renumber all customers per team sequentially
WITH numbered AS (
  SELECT id, team_id,
    ROW_NUMBER() OVER (PARTITION BY team_id ORDER BY created_at) AS new_number
  FROM public.customers
)
UPDATE public.customers c
SET client_number = n.new_number
FROM numbered n
WHERE c.id = n.id;
