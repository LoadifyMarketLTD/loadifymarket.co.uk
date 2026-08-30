CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_provider text;
  v_provider_subject text;
  v_intent_id uuid;
  v_intent_id_text text;
  v_intent private.signup_intents%ROWTYPE;
  v_email text;
  v_effective_role text;
  v_first_name text;
  v_last_name text;
  v_phone text;
  v_allow_legacy_server_registration boolean := false;
  v_feature_flags jsonb;
  v_buyer_registration boolean;
  v_seller_registration boolean;
BEGIN
  v_email := lower(btrim(COALESCE(NEW.email, '')));
  v_provider := lower(btrim(COALESCE(NEW.raw_app_meta_data ->> 'provider', '')));

  SELECT c.allow_legacy_server_registration
  INTO v_allow_legacy_server_registration
  FROM private.auth_signup_cutover_control AS c
  WHERE c.singleton = true;

  IF NOT FOUND THEN
    v_allow_legacy_server_registration := false;
  END IF;

  IF v_email = '' THEN
    RAISE EXCEPTION 'signup rejected: auth email is missing';
  END IF;

  IF NEW.raw_user_meta_data ? 'role' THEN
    RAISE EXCEPTION 'signup rejected: client role metadata is forbidden';
  END IF;

  IF v_provider = 'google' THEN
    v_provider_subject := btrim(COALESCE(NEW.raw_user_meta_data ->> 'sub', ''));
    IF v_provider_subject = '' THEN
      RAISE EXCEPTION 'signup rejected: verified Google subject is missing';
    END IF;

    SELECT * INTO v_intent
    FROM private.signup_intents
    WHERE auth_provider = 'google'
      AND provider_subject = v_provider_subject
      AND email = v_email
      AND consumed_at IS NULL
      AND expires_at > now()
    ORDER BY created_at DESC
    LIMIT 1
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'signup rejected: Google registration authorization not found';
    END IF;
    v_intent_id := v_intent.id;

  ELSIF v_provider = 'facebook' THEN
    RAISE EXCEPTION 'signup rejected: Facebook signup requires registration authorization';

  ELSIF v_provider = 'email' THEN
    v_intent_id_text := btrim(COALESCE(NEW.raw_user_meta_data ->> 'intent_id', ''));

    IF v_intent_id_text <> '' THEN
      BEGIN
        v_intent_id := v_intent_id_text::uuid;
      EXCEPTION WHEN invalid_text_representation THEN
        RAISE EXCEPTION 'signup rejected: invalid signup intent';
      END;

      SELECT * INTO v_intent
      FROM private.signup_intents
      WHERE id = v_intent_id
        AND auth_provider = 'email'
        AND provider_subject IS NULL
      FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'signup rejected: signup intent not found';
      END IF;

    ELSIF v_allow_legacy_server_registration
          AND NEW.raw_app_meta_data ? 'role'
          AND lower(btrim(COALESCE(NEW.raw_app_meta_data ->> 'role', ''))) IN ('buyer', 'seller')
    THEN
      v_effective_role := lower(btrim(COALESCE(NEW.raw_app_meta_data ->> 'role', '')));
      v_first_name := btrim(COALESCE(NEW.raw_user_meta_data ->> 'first_name', ''));
      v_last_name := btrim(COALESCE(NEW.raw_user_meta_data ->> 'last_name', ''));
      v_phone := NULLIF(btrim(COALESCE(NEW.raw_user_meta_data ->> 'phone', '')), '');

      IF v_first_name = '' OR v_last_name = '' THEN
        RAISE EXCEPTION 'signup rejected: legacy server registration identity is incomplete';
      END IF;
    ELSE
      IF NEW.raw_app_meta_data ? 'role' THEN
        RAISE EXCEPTION 'signup rejected: public email signup cannot carry app role metadata';
      END IF;
      RAISE EXCEPTION 'signup rejected: signup intent is required';
    END IF;

  ELSE
    RAISE EXCEPTION 'signup rejected: unsupported auth provider';
  END IF;

  IF v_intent_id IS NOT NULL THEN
    IF v_intent.consumed_at IS NOT NULL THEN
      RAISE EXCEPTION 'signup rejected: signup intent already consumed';
    END IF;
    IF v_intent.expires_at <= now() THEN
      RAISE EXCEPTION 'signup rejected: signup intent expired';
    END IF;
    IF v_intent.email IS DISTINCT FROM v_email THEN
      RAISE EXCEPTION 'signup rejected: signup intent email mismatch';
    END IF;
    IF v_intent.requested_role NOT IN ('buyer', 'seller') THEN
      RAISE EXCEPTION 'signup rejected: unsupported signup relationship';
    END IF;

    v_effective_role := v_intent.requested_role;
    v_first_name := v_intent.first_name;
    v_last_name := v_intent.last_name;
    v_phone := v_intent.phone;
  END IF;

  IF v_effective_role NOT IN ('buyer', 'seller') THEN
    RAISE EXCEPTION 'signup rejected: signup relationship could not be derived';
  END IF;

  SELECT ps.value INTO v_feature_flags
  FROM public.platform_settings AS ps
  WHERE ps.key = 'feature_flags';

  IF NOT FOUND
     OR COALESCE(jsonb_typeof(v_feature_flags), '') <> 'object'
     OR COALESCE(jsonb_typeof(v_feature_flags -> 'buyerRegistration'), '') <> 'boolean'
     OR COALESCE(jsonb_typeof(v_feature_flags -> 'sellerRegistration'), '') <> 'boolean'
  THEN
    RAISE EXCEPTION 'signup rejected: registration availability could not be verified';
  END IF;

  v_buyer_registration := (v_feature_flags ->> 'buyerRegistration')::boolean;
  v_seller_registration := (v_feature_flags ->> 'sellerRegistration')::boolean;

  IF v_effective_role = 'buyer' AND NOT v_buyer_registration THEN
    RAISE EXCEPTION 'signup rejected: buyer registration is temporarily disabled';
  END IF;
  IF v_effective_role = 'seller' AND NOT v_seller_registration THEN
    RAISE EXCEPTION 'signup rejected: seller registration is temporarily disabled';
  END IF;

  INSERT INTO public.users (id,email,"firstName","lastName",role,"isEmailVerified",phone)
  VALUES (NEW.id,v_email,v_first_name,v_last_name,v_effective_role,(NEW.email_confirmed_at IS NOT NULL),v_phone);

  IF v_intent_id IS NOT NULL AND v_intent.requested_role = 'buyer' THEN
    UPDATE public.buyer_profiles
    SET "customerType" = COALESCE(NULLIF(v_intent.customer_type, ''), "customerType"),
        "businessAddress" = COALESCE(v_intent.business_address, "businessAddress")
    WHERE "userId" = NEW.id;
    IF NOT FOUND THEN RAISE EXCEPTION 'signup rejected: Buyer profile provisioning failed'; END IF;

  ELSIF v_intent_id IS NOT NULL AND v_intent.requested_role = 'seller' THEN
    UPDATE public.seller_profiles
    SET "sellerType" = v_intent.seller_type,
        "businessName" = COALESCE(NULLIF(v_intent.company_name, ''), "businessName"),
        "businessAddress" = COALESCE(v_intent.business_address, "businessAddress"),
        "contactPhone" = COALESCE(NULLIF(v_intent.phone, ''), "contactPhone"),
        "sellerStatus" = 'draft',
        "isApproved" = false
    WHERE "userId" = NEW.id;
    IF NOT FOUND THEN RAISE EXCEPTION 'signup rejected: Seller profile provisioning failed'; END IF;

    UPDATE public.seller_stores
    SET "storeName" = COALESCE(NULLIF(v_intent.store_name, ''), "storeName"),
        "isActive" = false
    WHERE "userId" = NEW.id;
    IF NOT FOUND THEN RAISE EXCEPTION 'signup rejected: Seller store provisioning failed'; END IF;
  END IF;

  IF v_intent_id IS NOT NULL THEN
    UPDATE private.signup_intents
    SET consumed_at = now()
    WHERE id = v_intent_id AND consumed_at IS NULL;
    IF NOT FOUND THEN RAISE EXCEPTION 'signup rejected: signup intent replay detected'; END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_auth_user() IS
  'Fail-closed Auth provisioning with a private blue/green overlap control. Final state is intent-only email signup; Google is always provider-bound; fresh Facebook remains fail-closed.';

REVOKE ALL ON FUNCTION public.handle_new_auth_user() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_auth_user();

DO $$
BEGIN
  IF has_function_privilege('anon','public.handle_new_auth_user()','EXECUTE')
     OR has_function_privilege('authenticated','public.handle_new_auth_user()','EXECUTE') THEN
    RAISE EXCEPTION '677 auth signup security failure: client can execute Auth provisioning helper';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'auth.users'::regclass
      AND tgname = 'on_auth_user_created'
      AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION '677 auth signup trigger missing';
  END IF;
END
$$;;
