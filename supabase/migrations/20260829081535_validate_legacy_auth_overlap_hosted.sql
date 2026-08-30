DO $probe$
DECLARE
  v_buyer uuid := gen_random_uuid();
  v_seller uuid := gen_random_uuid();
  v_suffix text := replace(gen_random_uuid()::text,'-','');
BEGIN
  INSERT INTO auth.users(id,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,is_sso_user,is_anonymous)
  VALUES(v_buyer,'legacy-buyer-'||v_suffix||'@example.invalid',jsonb_build_object('provider','email','role','buyer'),jsonb_build_object('first_name','Legacy','last_name','Buyer'),now(),now(),false,false);

  IF NOT EXISTS(SELECT 1 FROM public.users WHERE id=v_buyer AND role='buyer') THEN RAISE EXCEPTION 'legacy Buyer failed'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.account_capabilities WHERE user_id=v_buyer AND capability='buyer' AND revoked_at IS NULL) THEN RAISE EXCEPTION 'legacy Buyer capability missing'; END IF;
  IF EXISTS(SELECT 1 FROM public.account_capabilities WHERE user_id=v_buyer AND capability='seller' AND revoked_at IS NULL) THEN RAISE EXCEPTION 'legacy Buyer gained Seller capability'; END IF;

  UPDATE auth.users SET email_confirmed_at=now() WHERE id=v_buyer;
  IF NOT EXISTS(SELECT 1 FROM public.users WHERE id=v_buyer AND "isEmailVerified"=true) THEN RAISE EXCEPTION 'email verification projection failed'; END IF;

  INSERT INTO auth.users(id,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,is_sso_user,is_anonymous)
  VALUES(v_seller,'legacy-seller-'||v_suffix||'@example.invalid',jsonb_build_object('provider','email','role','seller'),jsonb_build_object('first_name','Legacy','last_name','Seller'),now(),now(),false,false);

  IF NOT EXISTS(SELECT 1 FROM public.users WHERE id=v_seller AND role='seller') THEN RAISE EXCEPTION 'legacy Seller failed'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.account_capabilities WHERE user_id=v_seller AND capability='buyer' AND revoked_at IS NULL)
     OR NOT EXISTS(SELECT 1 FROM public.account_capabilities WHERE user_id=v_seller AND capability='seller' AND revoked_at IS NULL) THEN
    RAISE EXCEPTION 'Seller lacks Buyer+Seller capabilities';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.seller_profiles WHERE "userId"=v_seller AND "sellerStatus"='draft' AND "isApproved"=false) THEN RAISE EXCEPTION 'Seller draft profile failed'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.seller_stores WHERE "userId"=v_seller AND "isActive"=false) THEN RAISE EXCEPTION 'Seller inactive store failed'; END IF;

  DELETE FROM public.account_capabilities WHERE user_id IN(v_buyer,v_seller);
  DELETE FROM public.seller_stores WHERE "userId" IN(v_buyer,v_seller);
  DELETE FROM public.seller_profiles WHERE "userId" IN(v_buyer,v_seller);
  DELETE FROM public.buyer_profiles WHERE "userId" IN(v_buyer,v_seller);
  DELETE FROM public.users WHERE id IN(v_buyer,v_seller);
  DELETE FROM auth.users WHERE id IN(v_buyer,v_seller);
END
$probe$;;
