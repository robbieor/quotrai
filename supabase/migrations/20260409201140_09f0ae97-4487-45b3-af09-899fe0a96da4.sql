CREATE OR REPLACE FUNCTION public.notify_on_quote_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('accepted', 'declined') THEN
    INSERT INTO public.notifications (team_id, type, title, message, link)
    VALUES (
      NEW.team_id,
      CASE WHEN NEW.status = 'accepted' THEN 'quote_accepted' ELSE 'quote_declined' END,
      CASE WHEN NEW.status = 'accepted' THEN 'Quote Accepted' ELSE 'Quote Declined' END,
      'Quote ' || NEW.display_number || ' has been ' || NEW.status,
      '/quotes'
    );
  END IF;
  RETURN NEW;
END;
$function$;