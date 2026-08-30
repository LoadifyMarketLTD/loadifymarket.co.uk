DO $validation$
DECLARE
  v_hook_result jsonb;
  v_legacy_rejected boolean := false;
BEGIN
  UPDATE private.auth_signup_cutover_control
  SET allow_legacy_server_registration = false,
      updated_at = now()
  WHERE singleton = true;

  v_hook_result := public.before_user_created_validate_signup_intent(
    jsonb_build_object(
      'metadata', jsonb_build_object(
        'uuid', gen_random_uuid()::text,
        'time', now()::text,
        'name', 'before-user-created',
        'ip_address', '127.0.0.1'
      ),
      'user', jsonb_build_object(
        'id', gen_random_uuid()::text,
        'aud', 'authenticated',
        'role', '',
        'email', 'pr599-strict-hook-validation@invalid.example',
        'phone', '',
        'app_metadata', jsonb_build_object('provider','email','providers',jsonb_build_array('email')),
        'user_metadata', '{}'::jsonb,
        'identities', '[]'::jsonb,
        'created_at', '0001-01-01T00:00:00Z',
        'updated_at', '0001-01-01T00:00:00Z',
        'is_anonymous', false
      )
    )
  );

  IF coalesce(v_hook_result #>> '{error,message}', '') <> 'signup intent is required' THEN
    RAISE EXCEPTION 'validation failure: strict hook did not require signup intent: %', v_hook_result;
  END IF;

  BEGIN
    INSERT INTO auth.users (
      id, aud, role, email, encrypted_password,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, is_sso_user, is_anonymous
    ) VALUES (
      gen_random_uuid(), 'authenticated', 'authenticated',
      'pr599-strict-legacy-validation@invalid.example', '',
      '{"provider":"email","providers":["email"],"role":"buyer"}'::jsonb,
      '{"first_name":"Strict","last_name":"Validation"}'::jsonb,
      now(), now(), false, false
    );
  EXCEPTION WHEN OTHERS THEN
    IF position('public email signup cannot carry app role metadata' in SQLERRM) > 0 THEN
      v_legacy_rejected := true;
    ELSE
      RAISE;
    END IF;
  END;

  IF NOT v_legacy_rejected THEN
    RAISE EXCEPTION 'validation failure: legacy server registration was accepted in strict mode';
  END IF;

  UPDATE private.auth_signup_cutover_control
  SET allow_legacy_server_registration = true,
      updated_at = now()
  WHERE singleton = true;
END
$validation$;;
