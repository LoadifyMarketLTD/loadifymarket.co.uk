DO $probe$
DECLARE
  v_user_default uuid := gen_random_uuid();
  v_user_company uuid := gen_random_uuid();
  v_intent_default uuid := gen_random_uuid();
  v_intent_company uuid := gen_random_uuid();
  v_suffix text := replace(gen_random_uuid()::text,'-','');
  v_email_default text := 'intent-buyer-default-'||v_suffix||'@example.invalid';
  v_email_company text := 'intent-buyer-company-'||v_suffix||'@example.invalid';
BEGIN
  INSERT INTO private.signup_intents(id,email,auth_provider,requested_role,first_name,last_name,expires_at)
  VALUES(v_intent_default,v_email_default,'email','buyer','Intent','Buyer',now()+interval '10 minutes');

  INSERT INTO auth.users(id,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,is_sso_user,is_anonymous)
  VALUES(v_user_default,v_email_default,jsonb_build_object('provider','email'),jsonb_build_object('intent_id',v_intent_default::text),now(),now(),false,false);

  IF NOT EXISTS(SELECT 1 FROM public.users WHERE id=v_user_default AND role='buyer') THEN RAISE EXCEPTION 'default Buyer role failed'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.buyer_profiles WHERE "userId"=v_user_default AND "accountType"='individual') THEN RAISE EXCEPTION 'default Buyer accountType failed'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.account_capabilities WHERE user_id=v_user_default AND capability='buyer' AND revoked_at IS NULL) THEN RAISE EXCEPTION 'default Buyer capability failed'; END IF;
  IF NOT EXISTS(SELECT 1 FROM private.signup_intents WHERE id=v_intent_default AND consumed_at IS NOT NULL) THEN RAISE EXCEPTION 'default Buyer intent not consumed'; END IF;

  INSERT INTO private.signup_intents(id,email,auth_provider,requested_role,first_name,last_name,customer_type,company_name,vat_number,business_address,expires_at)
  VALUES(v_intent_company,v_email_company,'email','buyer','Company','Buyer','limited_company','Buyer Probe Ltd','GB123456789',jsonb_build_object('city','Blackburn'),now()+interval '10 minutes');

  INSERT INTO auth.users(id,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,is_sso_user,is_anonymous)
  VALUES(v_user_company,v_email_company,jsonb_build_object('provider','email'),jsonb_build_object('intent_id',v_intent_company::text),now(),now(),false,false);

  IF NOT EXISTS(SELECT 1 FROM public.buyer_profiles WHERE "userId"=v_user_company AND "accountType"='limited_company' AND "companyName"='Buyer Probe Ltd' AND "vatNumber"='GB123456789' AND "businessAddress"->>'city'='Blackburn') THEN RAISE EXCEPTION 'company Buyer profile projection failed'; END IF;
  IF NOT EXISTS(SELECT 1 FROM private.signup_intents WHERE id=v_intent_company AND consumed_at IS NOT NULL) THEN RAISE EXCEPTION 'company Buyer intent not consumed'; END IF;

  DELETE FROM public.account_capabilities WHERE user_id IN(v_user_default,v_user_company);
  DELETE FROM public.buyer_profiles WHERE "userId" IN(v_user_default,v_user_company);
  DELETE FROM public.users WHERE id IN(v_user_default,v_user_company);
  DELETE FROM auth.users WHERE id IN(v_user_default,v_user_company);
  DELETE FROM private.signup_intents WHERE id IN(v_intent_default,v_intent_company);
END
$probe$;;
