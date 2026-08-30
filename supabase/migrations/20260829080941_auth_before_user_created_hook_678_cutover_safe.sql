create or replace function public.before_user_created_validate_signup_intent(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user jsonb;
  v_app_metadata jsonb;
  v_user_metadata jsonb;
  v_email text;
  v_provider text;
  v_provider_subject text;
  v_intent_id_text text;
  v_intent_id uuid;
  v_legacy_role text;
  v_allow_legacy_server_registration boolean := false;
  v_intent private.signup_intents%rowtype;
  v_feature_flags jsonb;
  v_buyer_registration boolean;
  v_seller_registration boolean;
begin
  if event is null or jsonb_typeof(event) <> 'object' or jsonb_typeof(event->'user') <> 'object' then
    return jsonb_build_object('error',jsonb_build_object('http_code',400,'message','invalid signup request'));
  end if;

  v_user := event->'user';
  v_app_metadata := coalesce(v_user->'app_metadata', '{}'::jsonb);
  v_user_metadata := coalesce(v_user->'user_metadata', '{}'::jsonb);

  if jsonb_typeof(v_app_metadata) <> 'object' or jsonb_typeof(v_user_metadata) <> 'object' then
    return jsonb_build_object('error',jsonb_build_object('http_code',400,'message','invalid signup metadata'));
  end if;

  v_email := lower(trim(coalesce(v_user->>'email', '')));
  v_provider := lower(trim(coalesce(v_app_metadata->>'provider', '')));

  select c.allow_legacy_server_registration into v_allow_legacy_server_registration
  from private.auth_signup_cutover_control as c where c.singleton = true;
  if not found then v_allow_legacy_server_registration := false; end if;

  if v_email = '' then
    return jsonb_build_object('error',jsonb_build_object('http_code',400,'message','signup email is required'));
  end if;

  select ps.value into v_feature_flags
  from public.platform_settings as ps where ps.key = 'feature_flags';

  if not found
     or coalesce(jsonb_typeof(v_feature_flags), '') <> 'object'
     or coalesce(jsonb_typeof(v_feature_flags->'buyerRegistration'), '') <> 'boolean'
     or coalesce(jsonb_typeof(v_feature_flags->'sellerRegistration'), '') <> 'boolean' then
    return jsonb_build_object('error',jsonb_build_object('http_code',503,'message','registration availability could not be verified'));
  end if;

  v_buyer_registration := (v_feature_flags->>'buyerRegistration')::boolean;
  v_seller_registration := (v_feature_flags->>'sellerRegistration')::boolean;

  if v_user_metadata ? 'role' then
    return jsonb_build_object('error',jsonb_build_object('http_code',403,'message','client role metadata is forbidden'));
  end if;

  if v_app_metadata ? 'role'
     and not (
       v_allow_legacy_server_registration
       and v_provider = 'email'
       and trim(coalesce(v_user_metadata->>'intent_id', '')) = ''
       and lower(trim(coalesce(v_app_metadata->>'role', ''))) in ('buyer', 'seller')
     ) then
    return jsonb_build_object('error',jsonb_build_object('http_code',403,'message','client role metadata is forbidden'));
  end if;

  if v_provider = 'google' then
    v_provider_subject := btrim(coalesce(v_user_metadata->>'sub', ''));
    if v_provider_subject = '' then
      return jsonb_build_object('error',jsonb_build_object('http_code',403,'message','verified Google subject is missing'));
    end if;

    select si.* into v_intent
    from private.signup_intents as si
    where si.auth_provider = 'google'
      and si.provider_subject = v_provider_subject
      and lower(trim(si.email)) = v_email
      and si.consumed_at is null
      and si.expires_at > now()
    order by si.created_at desc limit 1;

    if not found then
      return jsonb_build_object('error',jsonb_build_object('http_code',403,'message','Google registration authorization not found'));
    end if;
    v_intent_id := v_intent.id;

  elsif v_provider = 'facebook' then
    return jsonb_build_object('error',jsonb_build_object('http_code',403,'message','Facebook signup requires registration authorization'));

  elsif v_provider = 'email' then
    v_intent_id_text := trim(coalesce(v_user_metadata->>'intent_id', ''));

    if v_intent_id_text = '' then
      if v_allow_legacy_server_registration
         and v_app_metadata ? 'role'
         and lower(trim(coalesce(v_app_metadata->>'role', ''))) in ('buyer', 'seller') then
        v_legacy_role := lower(trim(coalesce(v_app_metadata->>'role', '')));
        if v_legacy_role = 'buyer' and not v_buyer_registration then
          return jsonb_build_object('error',jsonb_build_object('http_code',403,'message','buyer registration is temporarily disabled'));
        end if;
        if v_legacy_role = 'seller' and not v_seller_registration then
          return jsonb_build_object('error',jsonb_build_object('http_code',403,'message','seller registration is temporarily disabled'));
        end if;
        return '{}'::jsonb;
      end if;
      return jsonb_build_object('error',jsonb_build_object('http_code',400,'message','signup intent is required'));
    end if;

    if v_intent_id_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
      return jsonb_build_object('error',jsonb_build_object('http_code',400,'message','signup intent is required'));
    end if;

    v_intent_id := v_intent_id_text::uuid;
    select si.* into v_intent
    from private.signup_intents as si
    where si.id = v_intent_id and si.auth_provider = 'email' and si.provider_subject is null;

    if not found then
      return jsonb_build_object('error',jsonb_build_object('http_code',400,'message','signup intent not found'));
    end if;
  else
    return jsonb_build_object('error',jsonb_build_object('http_code',403,'message','unsupported auth provider'));
  end if;

  if v_intent.consumed_at is not null then
    return jsonb_build_object('error',jsonb_build_object('http_code',409,'message','signup intent already consumed'));
  end if;
  if v_intent.expires_at <= now() then
    return jsonb_build_object('error',jsonb_build_object('http_code',400,'message','signup intent expired'));
  end if;
  if lower(trim(v_intent.email)) <> v_email then
    return jsonb_build_object('error',jsonb_build_object('http_code',403,'message','signup intent email mismatch'));
  end if;
  if v_intent.requested_role not in ('buyer','seller') then
    return jsonb_build_object('error',jsonb_build_object('http_code',403,'message','unsupported signup role'));
  end if;
  if v_intent.requested_role = 'buyer' and not v_buyer_registration then
    return jsonb_build_object('error',jsonb_build_object('http_code',403,'message','buyer registration is temporarily disabled'));
  end if;
  if v_intent.requested_role = 'seller' and not v_seller_registration then
    return jsonb_build_object('error',jsonb_build_object('http_code',403,'message','seller registration is temporarily disabled'));
  end if;
  if v_intent.requested_role = 'seller' and v_intent.seller_type not in ('individual','sole_trader','company') then
    return jsonb_build_object('error',jsonb_build_object('http_code',400,'message','seller signup intent is incomplete'));
  end if;
  if v_intent.requested_role = 'buyer' and v_intent.seller_type is not null then
    return jsonb_build_object('error',jsonb_build_object('http_code',400,'message','buyer signup intent is invalid'));
  end if;

  return '{}'::jsonb;
end;
$function$;

revoke all on function public.before_user_created_validate_signup_intent(jsonb)
  from public, anon, authenticated, service_role;
grant usage on schema public to supabase_auth_admin;
grant execute on function public.before_user_created_validate_signup_intent(jsonb)
  to supabase_auth_admin;

do $assertions$
begin
  if has_function_privilege('anon','public.before_user_created_validate_signup_intent(jsonb)','EXECUTE') then
    raise exception 'anon must not execute before_user_created_validate_signup_intent';
  end if;
  if has_function_privilege('authenticated','public.before_user_created_validate_signup_intent(jsonb)','EXECUTE') then
    raise exception 'authenticated must not execute before_user_created_validate_signup_intent';
  end if;
  if has_function_privilege('service_role','public.before_user_created_validate_signup_intent(jsonb)','EXECUTE') then
    raise exception 'service_role must not execute before_user_created_validate_signup_intent';
  end if;
  if not has_function_privilege('supabase_auth_admin','public.before_user_created_validate_signup_intent(jsonb)','EXECUTE') then
    raise exception 'supabase_auth_admin must execute before_user_created_validate_signup_intent';
  end if;
  if not has_schema_privilege('supabase_auth_admin','public','USAGE') then
    raise exception 'supabase_auth_admin must have USAGE on public schema for Auth hook dispatch';
  end if;
  if has_schema_privilege('anon','private','USAGE') or has_schema_privilege('authenticated','private','USAGE') then
    raise exception 'private schema must remain inaccessible to public clients';
  end if;
end;
$assertions$;;
