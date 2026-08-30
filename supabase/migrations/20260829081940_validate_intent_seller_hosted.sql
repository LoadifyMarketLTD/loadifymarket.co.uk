DO $probe$
DECLARE
  v_user uuid := gen_random_uuid();
  v_intent uuid := gen_random_uuid();
  v_suffix text := replace(gen_random_uuid()::text,'-','');
  v_email text := 'intent-seller-'||v_suffix||'@example.invalid';
BEGIN
  INSERT INTO private.signup_intents(
    id,email,auth_provider,requested_role,first_name,last_name,seller_type,store_name,company_name,phone,business_address,expires_at
  ) VALUES(
    v_intent,v_email,'email','seller','Intent','Seller','company','Probe Store','Probe Seller Ltd','07000000000',jsonb_build_object('city','Blackburn'),now()+interval '10 minutes'
  );

  INSERT INTO auth.users(id,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,is_sso_user,is_anonymous)
  VALUES(v_user,v_email,jsonb_build_object('provider','email'),jsonb_build_object('intent_id',v_intent::text),now(),now(),false,false);

  IF NOT EXISTS(SELECT 1 FROM public.users WHERE id=v_user AND role='seller') THEN RAISE EXCEPTION 'intent Seller role failed'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.account_capabilities WHERE user_id=v_user AND capability='buyer' AND revoked_at IS NULL)
     OR NOT EXISTS(SELECT 1 FROM public.account_capabilities WHERE user_id=v_user AND capability='seller' AND revoked_at IS NULL) THEN
    RAISE EXCEPTION 'intent Seller lacks Buyer+Seller capabilities';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.seller_profiles WHERE "userId"=v_user AND "sellerType"='company' AND "businessName"='Probe Seller Ltd' AND "contactPhone"='07000000000' AND "businessAddress"->>'city'='Blackburn' AND "sellerStatus"='draft' AND "isApproved"=false) THEN
    RAISE EXCEPTION 'intent Seller profile projection failed';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.seller_stores WHERE "userId"=v_user AND "storeName"='Probe Store' AND "isActive"=false) THEN RAISE EXCEPTION 'intent Seller store projection failed'; END IF;
  IF NOT EXISTS(SELECT 1 FROM private.signup_intents WHERE id=v_intent AND consumed_at IS NOT NULL) THEN RAISE EXCEPTION 'Seller intent not consumed'; END IF;

  DELETE FROM public.account_capabilities WHERE user_id=v_user;
  DELETE FROM public.seller_stores WHERE "userId"=v_user;
  DELETE FROM public.seller_profiles WHERE "userId"=v_user;
  DELETE FROM public.buyer_profiles WHERE "userId"=v_user;
  DELETE FROM public.users WHERE id=v_user;
  DELETE FROM auth.users WHERE id=v_user;
  DELETE FROM private.signup_intents WHERE id=v_intent;
END
$probe$;;
