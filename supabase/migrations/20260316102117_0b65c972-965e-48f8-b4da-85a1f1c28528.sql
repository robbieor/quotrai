-- Lock profiles.team_id from user updates
CREATE OR REPLACE FUNCTION public.prevent_team_id_change()
RETURNS trigger LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.team_id IS DISTINCT FROM NEW.team_id THEN
    RAISE EXCEPTION 'Cannot change team_id';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER prevent_team_id_change_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_team_id_change();