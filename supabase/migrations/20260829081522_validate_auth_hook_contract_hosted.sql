DO $probe$
DECLARE
  v_intent uuid := gen_random_uuid();
  v_suffix text := replace(gen_random_uuid()::text,'-','');
  v_result jsonb;
BEGIN
  v_result := public.before_user_created_validate_signup_intent(jsonb_build_object('user',jsonb_build_object(
    'email','legacy-hook-'||v_suffix||'@example.invalid',
    'app_metadata',jsonb_build_object('provider','email','role','buyer'),
    'user_metadata',jsonb_build_object('first_name','Legacy','last_name','Probe')
  )));
  IF v_result <> '{}'::jsonb THEN RAISE EXCEPTION 'legacy overlap hook rejected: %',v_result; END IF;

  v_result := public.before_user_created_validate_signup_intent(jsonb_build_object('user',jsonb_build_object(
    'email','no-intent-'||v_suffix||'@example.invalid','app_metadata',jsonb_build_object('provider','email'),'user_metadata','{}'::jsonb
  )));
  IF v_result #>> '{error,message}' <> 'signup intent is required' THEN RAISE EXCEPTION 'email no-intent not rejected: %',v_result; END IF;

  v_result := public.before_user_created_validate_signup_intent(jsonb_build_object('user',jsonb_build_object(
    'email','google-'||v_suffix||'@example.invalid','app_metadata',jsonb_build_object('provider','google'),'user_metadata',jsonb_build_object('sub','missing-google-sub')
  )));
  IF v_result #>> '{error,message}' <> 'Google registration authorization not found' THEN RAISE EXCEPTION 'Google no-auth not rejected: %',v_result; END IF;

  v_result := public.before_user_created_validate_signup_intent(jsonb_build_object('user',jsonb_build_object(
    'email','facebook-'||v_suffix||'@example.invalid','app_metadata',jsonb_build_object('provider','facebook'),'user_metadata',jsonb_build_object('sub','fb-sub')
  )));
  IF v_result #>> '{error,message}' <> 'Facebook signup requires registration authorization' THEN RAISE EXCEPTION 'Facebook fresh signup not rejected: %',v_result; END IF;

  INSERT INTO private.signup_intents(id,email,auth_provider,requested_role,first_name,last_name,expires_at)
  VALUES(v_intent,'valid-'||v_suffix||'@example.invalid','email','buyer','Valid','Probe',now()+interval '10 minutes');

  v_result := public.before_user_created_validate_signup_intent(jsonb_build_object('user',jsonb_build_object(
    'email','valid-'||v_suffix||'@example.invalid','app_metadata',jsonb_build_object('provider','email'),'user_metadata',jsonb_build_object('intent_id',v_intent::text)
  )));
  IF v_result <> '{}'::jsonb THEN RAISE EXCEPTION 'valid Buyer intent rejected: %',v_result; END IF;
  DELETE FROM private.signup_intents WHERE id=v_intent;
END
$probe$;;
