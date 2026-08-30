DO $validation$
DECLARE
  v_google_rejected boolean := false;
  v_facebook_rejected boolean := false;
BEGIN
  BEGIN
    INSERT INTO auth.users (
      id, aud, role, email, encrypted_password,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, is_sso_user, is_anonymous
    ) VALUES (
      gen_random_uuid(), 'authenticated', 'authenticated',
      'pr599-google-no-intent-validation@invalid.example', '',
      '{"provider":"google","providers":["google"]}'::jsonb,
      '{"sub":"pr599-google-subject-without-intent"}'::jsonb,
      now(), now(), false, false
    );
  EXCEPTION WHEN OTHERS THEN
    IF position('Google registration authorization not found' in SQLERRM) > 0 THEN
      v_google_rejected := true;
    ELSE
      RAISE;
    END IF;
  END;

  IF NOT v_google_rejected THEN
    RAISE EXCEPTION 'validation failure: fresh Google identity without provider-bound intent was accepted';
  END IF;

  BEGIN
    INSERT INTO auth.users (
      id, aud, role, email, encrypted_password,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, is_sso_user, is_anonymous
    ) VALUES (
      gen_random_uuid(), 'authenticated', 'authenticated',
      'pr599-facebook-validation@invalid.example', '',
      '{"provider":"facebook","providers":["facebook"]}'::jsonb,
      '{}'::jsonb,
      now(), now(), false, false
    );
  EXCEPTION WHEN OTHERS THEN
    IF position('Facebook signup requires registration authorization' in SQLERRM) > 0 THEN
      v_facebook_rejected := true;
    ELSE
      RAISE;
    END IF;
  END;

  IF NOT v_facebook_rejected THEN
    RAISE EXCEPTION 'validation failure: fresh Facebook identity was accepted';
  END IF;
END
$validation$;;
