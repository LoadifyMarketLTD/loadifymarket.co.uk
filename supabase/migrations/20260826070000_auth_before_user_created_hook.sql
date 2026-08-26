-- 678_auth_before_user_created_hook.sql
--
-- Pre-creation validation for public Auth signup.
--
-- This function is intended for Supabase Auth's official
-- "Before User Created" Postgres hook.
--
-- IMPORTANT:
--   * This migration CREATES the hook function and permissions.
--   * It does NOT activate/configure the hosted Auth hook.
--   * Email signup intents are validated here but NOT consumed here.
--   * Consumption remains atomic in handle_new_auth_user() migration 677.
--   * OAuth Google/Facebook account creation remains Buyer-only downstream.
--   * Client-supplied role metadata is forbidden.

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
  v_intent_id_text text;
  v_intent_id uuid;

  v_intent private.signup_intents%rowtype;
  v_feature_flags jsonb;
  v_buyer_registration boolean;
  v_seller_registration boolean;
begin
  if event is null
     or jsonb_typeof(event) <> 'object'
     or jsonb_typeof(event->'user') <> 'object' then
    return jsonb_build_object(
      'error',
      jsonb_build_object(
        'http_code', 400,
        'message', 'invalid signup request'
      )
    );
  end if;

  v_user := event->'user';
  v_app_metadata := coalesce(v_user->'app_metadata', '{}'::jsonb);
  v_user_metadata := coalesce(v_user->'user_metadata', '{}'::jsonb);

  if jsonb_typeof(v_app_metadata) <> 'object'
     or jsonb_typeof(v_user_metadata) <> 'object' then
    return jsonb_build_object(
      'error',
      jsonb_build_object(
        'http_code', 400,
        'message', 'invalid signup metadata'
      )
    );
  end if;

  v_email := lower(trim(coalesce(v_user->>'email', '')));
  v_provider := lower(trim(coalesce(v_app_metadata->>'provider', '')));

  if v_email = '' then
    return jsonb_build_object(
      'error',
      jsonb_build_object(
        'http_code', 400,
        'message', 'signup email is required'
      )
    );
  end if;

  select ps.value
  into v_feature_flags
  from public.platform_settings as ps
  where ps.key = 'feature_flags';

  if not found
     or jsonb_typeof(v_feature_flags) <> 'object'
     or jsonb_typeof(v_feature_flags->'buyerRegistration') <> 'boolean'
     or jsonb_typeof(v_feature_flags->'sellerRegistration') <> 'boolean' then
    return jsonb_build_object(
      'error',
      jsonb_build_object(
        'http_code', 503,
        'message', 'registration availability could not be verified'
      )
    );
  end if;

  v_buyer_registration :=
    (v_feature_flags->>'buyerRegistration')::boolean;

  v_seller_registration :=
    (v_feature_flags->>'sellerRegistration')::boolean;

  -- Role selection is server-governed. Neither user_metadata nor
  -- app_metadata may be used by a public client to authorize Buyer,
  -- Seller or Admin access.
  if v_user_metadata ? 'role'
     or v_app_metadata ? 'role' then
    return jsonb_build_object(
      'error',
      jsonb_build_object(
        'http_code', 403,
        'message', 'client role metadata is forbidden'
      )
    );
  end if;

  -- Fresh social identities supported by Loadify remain Buyer-only.
  -- Seller access is added later through the canonical activation path.
  if v_provider in ('google', 'facebook') then
    if not v_buyer_registration then
      return jsonb_build_object(
        'error',
        jsonb_build_object(
          'http_code', 403,
          'message', 'buyer registration is temporarily disabled'
        )
      );
    end if;

    return '{}'::jsonb;
  end if;

  -- Public email/password signup must be backed by a short-lived
  -- server-created signup intent.
  if v_provider <> 'email' then
    return jsonb_build_object(
      'error',
      jsonb_build_object(
        'http_code', 403,
        'message', 'unsupported auth provider'
      )
    );
  end if;

  v_intent_id_text := trim(coalesce(v_user_metadata->>'intent_id', ''));

  if v_intent_id_text = ''
     or v_intent_id_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    return jsonb_build_object(
      'error',
      jsonb_build_object(
        'http_code', 400,
        'message', 'signup intent is required'
      )
    );
  end if;

  v_intent_id := v_intent_id_text::uuid;

  select si.*
  into v_intent
  from private.signup_intents as si
  where si.id = v_intent_id;

  if not found then
    return jsonb_build_object(
      'error',
      jsonb_build_object(
        'http_code', 400,
        'message', 'signup intent not found'
      )
    );
  end if;

  if v_intent.consumed_at is not null then
    return jsonb_build_object(
      'error',
      jsonb_build_object(
        'http_code', 409,
        'message', 'signup intent already consumed'
      )
    );
  end if;

  if v_intent.expires_at <= now() then
    return jsonb_build_object(
      'error',
      jsonb_build_object(
        'http_code', 400,
        'message', 'signup intent expired'
      )
    );
  end if;

  if lower(trim(v_intent.email)) <> v_email then
    return jsonb_build_object(
      'error',
      jsonb_build_object(
        'http_code', 403,
        'message', 'signup intent email mismatch'
      )
    );
  end if;

  if v_intent.requested_role not in ('buyer', 'seller') then
    return jsonb_build_object(
      'error',
      jsonb_build_object(
        'http_code', 403,
        'message', 'unsupported signup role'
      )
    );
  end if;

  if v_intent.requested_role = 'buyer'
     and not v_buyer_registration then
    return jsonb_build_object(
      'error',
      jsonb_build_object(
        'http_code', 403,
        'message', 'buyer registration is temporarily disabled'
      )
    );
  end if;

  if v_intent.requested_role = 'seller'
     and not v_seller_registration then
    return jsonb_build_object(
      'error',
      jsonb_build_object(
        'http_code', 403,
        'message', 'seller registration is temporarily disabled'
      )
    );
  end if;

  if v_intent.requested_role = 'seller'
     and v_intent.seller_type not in ('individual', 'sole_trader', 'company') then
    return jsonb_build_object(
      'error',
      jsonb_build_object(
        'http_code', 400,
        'message', 'seller signup intent is incomplete'
      )
    );
  end if;

  if v_intent.requested_role = 'buyer'
     and v_intent.seller_type is not null then
    return jsonb_build_object(
      'error',
      jsonb_build_object(
        'http_code', 400,
        'message', 'buyer signup intent is invalid'
      )
    );
  end if;

  -- Validation only.
  -- DO NOT mark consumed_at here. The AFTER INSERT provisioning trigger
  -- owns atomic intent consumption in the auth.users insert transaction.
  return '{}'::jsonb;
end;
$function$;

revoke all
  on function public.before_user_created_validate_signup_intent(jsonb)
  from public, anon, authenticated, service_role;

grant execute
  on function public.before_user_created_validate_signup_intent(jsonb)
  to supabase_auth_admin;

do $assertions$
begin
  if has_function_privilege(
       'anon',
       'public.before_user_created_validate_signup_intent(jsonb)',
       'EXECUTE'
     ) then
    raise exception
      'anon must not execute before_user_created_validate_signup_intent';
  end if;

  if has_function_privilege(
       'authenticated',
       'public.before_user_created_validate_signup_intent(jsonb)',
       'EXECUTE'
     ) then
    raise exception
      'authenticated must not execute before_user_created_validate_signup_intent';
  end if;

  if has_function_privilege(
       'service_role',
       'public.before_user_created_validate_signup_intent(jsonb)',
       'EXECUTE'
     ) then
    raise exception
      'service_role must not execute before_user_created_validate_signup_intent';
  end if;

  if not has_function_privilege(
       'supabase_auth_admin',
       'public.before_user_created_validate_signup_intent(jsonb)',
       'EXECUTE'
     ) then
    raise exception
      'supabase_auth_admin must execute before_user_created_validate_signup_intent';
  end if;

  if has_schema_privilege('anon', 'private', 'USAGE')
     or has_schema_privilege('authenticated', 'private', 'USAGE') then
    raise exception
      'private schema must remain inaccessible to public clients';
  end if;
end;
$assertions$;
