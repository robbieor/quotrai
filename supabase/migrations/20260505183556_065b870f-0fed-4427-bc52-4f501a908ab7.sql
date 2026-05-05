-- Notify rorourke@revamo.ai whenever a user verifies their email
CREATE OR REPLACE FUNCTION public.notify_signup_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, vault
AS $$
DECLARE
  v_service_key text;
  v_project_url text := 'https://leojhjynyxhpfyrbcabf.supabase.co';
  v_payload jsonb;
  v_provider text;
  v_full_name text;
BEGIN
  -- Only fire when email_confirmed_at transitions from NULL to a value,
  -- or when a row is inserted already-confirmed (e.g. OAuth signups).
  IF (TG_OP = 'INSERT' AND NEW.email_confirmed_at IS NOT NULL)
     OR (TG_OP = 'UPDATE'
         AND OLD.email_confirmed_at IS NULL
         AND NEW.email_confirmed_at IS NOT NULL) THEN

    BEGIN
      SELECT decrypted_secret INTO v_service_key
      FROM vault.decrypted_secrets
      WHERE name = 'email_queue_service_role_key'
      LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
      v_service_key := NULL;
    END;

    IF v_service_key IS NULL OR v_service_key = '' THEN
      RAISE LOG 'notify_signup_completion: service key missing, skipping';
      RETURN NEW;
    END IF;

    v_provider := COALESCE(NEW.raw_app_meta_data->>'provider', 'email');
    v_full_name := COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name'
    );

    v_payload := jsonb_build_object(
      'templateName', 'signup-completion-notification',
      'idempotencyKey', 'signup-completion-' || NEW.id::text,
      'templateData', jsonb_build_object(
        'email', NEW.email,
        'fullName', v_full_name,
        'userId', NEW.id::text,
        'provider', v_provider,
        'createdAt', NEW.created_at::text,
        'confirmedAt', NEW.email_confirmed_at::text,
        'metadata', jsonb_build_object(
          'raw_user_meta_data', NEW.raw_user_meta_data,
          'raw_app_meta_data', NEW.raw_app_meta_data
        )
      )
    );

    BEGIN
      PERFORM net.http_post(
        url := v_project_url || '/functions/v1/send-transactional-email',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_service_key
        ),
        body := v_payload,
        timeout_milliseconds := 5000
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE LOG 'notify_signup_completion http_post failed: %', SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_signup_completion ON auth.users;

CREATE TRIGGER on_auth_user_signup_completion
AFTER INSERT OR UPDATE OF email_confirmed_at ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.notify_signup_completion();