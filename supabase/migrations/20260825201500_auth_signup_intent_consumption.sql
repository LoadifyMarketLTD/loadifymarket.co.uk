-- 677_auth_signup_intent_consumption.sql
-- Fail-closed Auth identity provisioning.
--
-- EMAIL/PASSWORD PUBLIC SIGNUP
--   Requires a valid server-owned signup intent.
--   Buyer/Seller relationship is derived only from private.signup_intents.
--
-- OAUTH
--   Google/Facebook first-time identities are provisioned Buyer-only.
--   OAuth can never self-provision Seller or Admin.
--
-- UNKNOWN PROVIDERS
--   Fail closed.
--
-- Client-controlled role metadata is never authorization.

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_provider text;
  v_intent_id uuid;
  v_intent private.signup_intents%ROWTYPE;
  v_email text;
  v_first_name text;
  v_last_name text;
BEGIN
  v_email := lower(btrim(COALESCE(NEW.email, '')));
  v_provider := lower(
    btrim(
      COALESCE(
        NEW.raw_app_meta_data ->> 'provider',
        ''
      )
    )
  );

  IF v_email = '' THEN
    RAISE EXCEPTION
      'signup rejected: auth email is missing';
  END IF;

  -- No public identity may choose its authorization role through metadata.
  IF NEW.raw_user_meta_data ? 'role' THEN
    RAISE EXCEPTION
      'signup rejected: client role metadata is forbidden';
  END IF;

  -- -------------------------------------------------------------------------
  -- OAuth identity creation.
  --
  -- Google/Facebook identities are Buyer-only. Seller activation, if desired
  -- later, must pass through the canonical authenticated Seller activation
  -- boundary rather than OAuth metadata.
  -- -------------------------------------------------------------------------
  IF v_provider IN ('google', 'facebook') THEN

    v_first_name := NULLIF(
      btrim(
        COALESCE(
          NEW.raw_user_meta_data ->> 'given_name',
          NEW.raw_user_meta_data ->> 'first_name',
          ''
        )
      ),
      ''
    );

    v_last_name := NULLIF(
      btrim(
        COALESCE(
          NEW.raw_user_meta_data ->> 'family_name',
          NEW.raw_user_meta_data ->> 'last_name',
          ''
        )
      ),
      ''
    );

    INSERT INTO public.users (
      id,
      email,
      "firstName",
      "lastName",
      role,
      "isEmailVerified"
    )
    VALUES (
      NEW.id,
      v_email,
      v_first_name,
      v_last_name,
      'buyer',
      (NEW.email_confirmed_at IS NOT NULL)
    );

    RETURN NEW;
  END IF;

  -- -------------------------------------------------------------------------
  -- Public email/password signup.
  -- -------------------------------------------------------------------------
  IF v_provider <> 'email' THEN
    RAISE EXCEPTION
      'signup rejected: unsupported auth provider';
  END IF;

  -- app_metadata role is also forbidden on public email signup.
  IF NEW.raw_app_meta_data ? 'role' THEN
    RAISE EXCEPTION
      'signup rejected: public email signup cannot carry app role metadata';
  END IF;

  BEGIN
    v_intent_id :=
      NULLIF(
        NEW.raw_user_meta_data ->> 'intent_id',
        ''
      )::uuid;
  EXCEPTION
    WHEN invalid_text_representation THEN
      RAISE EXCEPTION
        'signup rejected: invalid signup intent';
  END;

  IF v_intent_id IS NULL THEN
    RAISE EXCEPTION
      'signup rejected: signup intent is required';
  END IF;

  SELECT *
  INTO v_intent
  FROM private.signup_intents
  WHERE id = v_intent_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'signup rejected: signup intent not found';
  END IF;

  IF v_intent.consumed_at IS NOT NULL THEN
    RAISE EXCEPTION
      'signup rejected: signup intent already consumed';
  END IF;

  IF v_intent.expires_at <= now() THEN
    RAISE EXCEPTION
      'signup rejected: signup intent expired';
  END IF;

  IF v_intent.email IS DISTINCT FROM v_email THEN
    RAISE EXCEPTION
      'signup rejected: signup intent email mismatch';
  END IF;

  IF v_intent.requested_role NOT IN ('buyer', 'seller') THEN
    RAISE EXCEPTION
      'signup rejected: unsupported signup relationship';
  END IF;

  INSERT INTO public.users (
    id,
    email,
    "firstName",
    "lastName",
    role,
    "isEmailVerified",
    phone
  )
  VALUES (
    NEW.id,
    v_email,
    v_intent.first_name,
    v_intent.last_name,
    v_intent.requested_role,
    (NEW.email_confirmed_at IS NOT NULL),
    v_intent.phone
  );

  -- public.users AFTER INSERT provisioning is synchronous, so the canonical
  -- buyer/seller profile rows exist before execution continues here.

  IF v_intent.requested_role = 'buyer' THEN

    UPDATE public.buyer_profiles
    SET
      "customerType" = COALESCE(
        NULLIF(v_intent.customer_type, ''),
        "customerType"
      ),
      "businessAddress" = COALESCE(
        v_intent.business_address,
        "businessAddress"
      )
    WHERE "userId" = NEW.id;

    IF NOT FOUND THEN
      RAISE EXCEPTION
        'signup rejected: Buyer profile provisioning failed';
    END IF;

  ELSIF v_intent.requested_role = 'seller' THEN

    UPDATE public.seller_profiles
    SET
      "sellerType" = v_intent.seller_type,
      "businessName" = COALESCE(
        NULLIF(v_intent.company_name, ''),
        "businessName"
      ),
      "businessAddress" = COALESCE(
        v_intent.business_address,
        "businessAddress"
      ),
      "contactPhone" = COALESCE(
        NULLIF(v_intent.phone, ''),
        "contactPhone"
      ),
      "sellerStatus" = 'draft',
      "isApproved" = false
    WHERE "userId" = NEW.id;

    IF NOT FOUND THEN
      RAISE EXCEPTION
        'signup rejected: Seller profile provisioning failed';
    END IF;

    UPDATE public.seller_stores
    SET
      "storeName" = COALESCE(
        NULLIF(v_intent.store_name, ''),
        "storeName"
      ),
      "isActive" = false
    WHERE "userId" = NEW.id;

    IF NOT FOUND THEN
      RAISE EXCEPTION
        'signup rejected: Seller store provisioning failed';
    END IF;
  END IF;

  UPDATE private.signup_intents
  SET consumed_at = now()
  WHERE id = v_intent_id
    AND consumed_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'signup rejected: signup intent replay detected';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_auth_user() IS
  'Fail-closed Auth provisioning: email signup requires a valid single-use private intent; Google/Facebook provision Buyer-only; client role metadata is never authorization.';

REVOKE ALL ON FUNCTION public.handle_new_auth_user()
FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created
ON auth.users;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_auth_user();

DO $$
BEGIN
  IF has_function_privilege(
       'anon',
       'public.handle_new_auth_user()',
       'EXECUTE'
     )
     OR has_function_privilege(
       'authenticated',
       'public.handle_new_auth_user()',
       'EXECUTE'
     )
  THEN
    RAISE EXCEPTION
      '677 auth signup security failure: client can execute Auth provisioning helper';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgrelid = 'auth.users'::regclass
      AND tgname = 'on_auth_user_created'
      AND NOT tgisinternal
  )
  THEN
    RAISE EXCEPTION
      '677 auth signup trigger missing';
  END IF;
END
$$;
