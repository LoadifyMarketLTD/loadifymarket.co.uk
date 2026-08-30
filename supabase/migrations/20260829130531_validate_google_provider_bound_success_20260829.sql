do $$
declare
  v_buyer_user uuid := gen_random_uuid();
  v_seller_user uuid := gen_random_uuid();
  v_buyer_subject text := 'pr599-google-buyer-' || gen_random_uuid()::text;
  v_seller_subject text := 'pr599-google-seller-' || gen_random_uuid()::text;
  v_buyer_email text := 'pr599.google.buyer.' || replace(gen_random_uuid()::text,'-','') || '@example.invalid';
  v_seller_email text := 'pr599.google.seller.' || replace(gen_random_uuid()::text,'-','') || '@example.invalid';
  v_buyer_intent uuid;
  v_seller_intent uuid;
  v_role text;
  v_count int;
  v_consumed timestamptz;
  v_seller_status text;
  v_seller_approved boolean;
  v_store_active boolean;
begin
  select id into v_buyer_intent
  from public.create_social_signup_intent(
    'google', v_buyer_subject, v_buyer_email, 'buyer',
    'PR599', 'GoogleBuyer', null, now() + interval '15 minutes'
  );

  insert into auth.users (
    id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, is_sso_user, is_anonymous
  ) values (
    v_buyer_user, 'authenticated', 'authenticated', v_buyer_email,
    jsonb_build_object('provider','google','providers',jsonb_build_array('google')),
    jsonb_build_object('sub',v_buyer_subject,'full_name','PR599 GoogleBuyer'),
    now(), now(), false, false
  );

  select role into v_role from public.users where id=v_buyer_user;
  if v_role is distinct from 'buyer' then
    raise exception 'google buyer positive probe failed: public role=%', v_role;
  end if;

  select count(*) into v_count
  from public.account_capabilities
  where user_id=v_buyer_user and capability='buyer' and revoked_at is null;
  if v_count <> 1 then
    raise exception 'google buyer positive probe failed: active buyer capability count=%', v_count;
  end if;

  select count(*) into v_count
  from public.account_capabilities
  where user_id=v_buyer_user and capability='seller' and revoked_at is null;
  if v_count <> 0 then
    raise exception 'google buyer positive probe failed: unexpected active seller capability count=%', v_count;
  end if;

  if not exists (select 1 from public.buyer_profiles where "userId"=v_buyer_user) then
    raise exception 'google buyer positive probe failed: buyer profile missing';
  end if;

  select consumed_at into v_consumed from private.signup_intents where id=v_buyer_intent;
  if v_consumed is null then
    raise exception 'google buyer positive probe failed: intent not consumed';
  end if;

  select id into v_seller_intent
  from public.create_social_signup_intent(
    'google', v_seller_subject, v_seller_email, 'seller',
    'PR599', 'GoogleSeller', 'company', now() + interval '15 minutes'
  );

  insert into auth.users (
    id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, is_sso_user, is_anonymous
  ) values (
    v_seller_user, 'authenticated', 'authenticated', v_seller_email,
    jsonb_build_object('provider','google','providers',jsonb_build_array('google')),
    jsonb_build_object('sub',v_seller_subject,'full_name','PR599 GoogleSeller'),
    now(), now(), false, false
  );

  select role into v_role from public.users where id=v_seller_user;
  if v_role is distinct from 'seller' then
    raise exception 'google seller positive probe failed: public role=%', v_role;
  end if;

  select count(*) into v_count
  from public.account_capabilities
  where user_id=v_seller_user and capability in ('buyer','seller') and revoked_at is null;
  if v_count <> 2 then
    raise exception 'google seller positive probe failed: active buyer+seller capability count=%', v_count;
  end if;

  select "sellerStatus", "isApproved" into v_seller_status, v_seller_approved
  from public.seller_profiles where "userId"=v_seller_user;
  if v_seller_status is distinct from 'draft' or v_seller_approved is distinct from false then
    raise exception 'google seller positive probe failed: seller status/approval = %/%', v_seller_status, v_seller_approved;
  end if;

  select "isActive" into v_store_active from public.seller_stores where "userId"=v_seller_user;
  if v_store_active is distinct from false then
    raise exception 'google seller positive probe failed: store active=%', v_store_active;
  end if;

  select consumed_at into v_consumed from private.signup_intents where id=v_seller_intent;
  if v_consumed is null then
    raise exception 'google seller positive probe failed: intent not consumed';
  end if;

  delete from auth.users where id in (v_buyer_user, v_seller_user);
  delete from private.signup_intents where id in (v_buyer_intent, v_seller_intent);

  if exists (select 1 from auth.users where id in (v_buyer_user,v_seller_user))
     or exists (select 1 from public.users where id in (v_buyer_user,v_seller_user))
     or exists (select 1 from private.signup_intents where id in (v_buyer_intent,v_seller_intent)) then
    raise exception 'google positive probe cleanup failed';
  end if;
end
$$;;
