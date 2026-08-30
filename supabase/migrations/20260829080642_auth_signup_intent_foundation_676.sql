-- 676_signup_intent_auth_foundation.sql
-- Loadify Market — fail-closed public signup intent foundation.

CREATE SCHEMA IF NOT EXISTS private;

CREATE TABLE IF NOT EXISTS private.signup_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  auth_provider text NOT NULL DEFAULT 'email'
    CHECK (auth_provider IN ('email', 'google', 'facebook')),
  provider_subject text NULL,
  requested_role text NOT NULL
    CHECK (requested_role IN ('buyer', 'seller')),
  first_name text NOT NULL,
  last_name text NOT NULL,
  seller_type text NULL
    CHECK (seller_type IS NULL OR seller_type IN ('individual', 'sole_trader', 'company')),
  store_name text NULL,
  phone text NULL,
  company_name text NULL,
  vat_number text NULL,
  customer_type text NULL,
  business_address jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'),
  consumed_at timestamptz NULL,
  CONSTRAINT signup_intents_email_normalized CHECK (email = lower(btrim(email))),
  CONSTRAINT signup_intents_expiry_after_creation CHECK (expires_at > created_at),
  CONSTRAINT signup_intents_seller_type_contract CHECK (
    (requested_role = 'seller' AND seller_type IS NOT NULL)
    OR (requested_role = 'buyer' AND seller_type IS NULL)
  ),
  CONSTRAINT signup_intents_provider_subject_contract CHECK (
    (auth_provider = 'email' AND provider_subject IS NULL)
    OR (auth_provider IN ('google', 'facebook') AND length(btrim(provider_subject)) BETWEEN 1 AND 255)
  )
);

CREATE INDEX IF NOT EXISTS idx_signup_intents_email_created
  ON private.signup_intents (email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_signup_intents_social_identity
  ON private.signup_intents (auth_provider, provider_subject, email, created_at DESC)
  WHERE consumed_at IS NULL AND provider_subject IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_signup_intents_pending_expiry
  ON private.signup_intents (expires_at) WHERE consumed_at IS NULL;

ALTER TABLE private.signup_intents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.signup_intents FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE private.signup_intents TO service_role;

CREATE OR REPLACE FUNCTION public.create_signup_intent(
  p_email text,
  p_requested_role text,
  p_first_name text,
  p_last_name text,
  p_seller_type text DEFAULT NULL,
  p_store_name text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_company_name text DEFAULT NULL,
  p_vat_number text DEFAULT NULL,
  p_customer_type text DEFAULT NULL,
  p_business_address jsonb DEFAULT NULL,
  p_expires_at timestamptz DEFAULT NULL
)
RETURNS TABLE (id uuid, expires_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_email text;
  v_expires_at timestamptz;
BEGIN
  v_email := lower(btrim(p_email));
  v_expires_at := COALESCE(p_expires_at, now() + interval '15 minutes');
  IF v_email IS NULL OR v_email = '' THEN RAISE EXCEPTION 'invalid signup intent email'; END IF;
  IF p_requested_role NOT IN ('buyer', 'seller') THEN RAISE EXCEPTION 'invalid signup intent role'; END IF;
  IF btrim(COALESCE(p_first_name, '')) = '' OR btrim(COALESCE(p_last_name, '')) = '' THEN RAISE EXCEPTION 'invalid signup intent identity'; END IF;
  IF p_requested_role = 'seller' AND p_seller_type NOT IN ('individual', 'sole_trader', 'company') THEN RAISE EXCEPTION 'invalid seller type'; END IF;
  IF p_requested_role = 'buyer' AND p_seller_type IS NOT NULL THEN RAISE EXCEPTION 'buyer intent cannot carry seller type'; END IF;
  IF v_expires_at <= now() THEN RAISE EXCEPTION 'signup intent expiry must be in the future'; END IF;

  RETURN QUERY
  INSERT INTO private.signup_intents AS si (
    email, auth_provider, provider_subject, requested_role, first_name, last_name,
    seller_type, store_name, phone, company_name, vat_number, customer_type,
    business_address, expires_at
  ) VALUES (
    v_email, 'email', NULL, p_requested_role, btrim(p_first_name), btrim(p_last_name),
    p_seller_type, NULLIF(btrim(p_store_name), ''), NULLIF(btrim(p_phone), ''),
    NULLIF(btrim(p_company_name), ''), NULLIF(btrim(p_vat_number), ''),
    p_customer_type, p_business_address, v_expires_at
  ) RETURNING si.id, si.expires_at;
END;
$$;

REVOKE ALL ON FUNCTION public.create_signup_intent(text,text,text,text,text,text,text,text,text,text,jsonb,timestamptz)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_signup_intent(text,text,text,text,text,text,text,text,text,text,jsonb,timestamptz)
TO service_role;

CREATE OR REPLACE FUNCTION public.create_social_signup_intent(
  p_auth_provider text,
  p_provider_subject text,
  p_email text,
  p_requested_role text,
  p_first_name text,
  p_last_name text,
  p_seller_type text DEFAULT NULL,
  p_expires_at timestamptz DEFAULT NULL
)
RETURNS TABLE (id uuid, expires_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_provider text;
  v_subject text;
  v_email text;
  v_expires_at timestamptz;
BEGIN
  v_provider := lower(btrim(COALESCE(p_auth_provider, '')));
  v_subject := btrim(COALESCE(p_provider_subject, ''));
  v_email := lower(btrim(COALESCE(p_email, '')));
  v_expires_at := COALESCE(p_expires_at, now() + interval '15 minutes');
  IF v_provider NOT IN ('google', 'facebook') THEN RAISE EXCEPTION 'invalid social signup provider'; END IF;
  IF v_subject = '' OR length(v_subject) > 255 THEN RAISE EXCEPTION 'invalid social provider subject'; END IF;
  IF v_email = '' THEN RAISE EXCEPTION 'invalid social signup email'; END IF;
  IF p_requested_role NOT IN ('buyer', 'seller') THEN RAISE EXCEPTION 'invalid signup intent role'; END IF;
  IF btrim(COALESCE(p_first_name, '')) = '' OR btrim(COALESCE(p_last_name, '')) = '' THEN RAISE EXCEPTION 'invalid signup intent identity'; END IF;
  IF p_requested_role = 'seller' AND p_seller_type NOT IN ('individual', 'sole_trader', 'company') THEN RAISE EXCEPTION 'invalid seller type'; END IF;
  IF p_requested_role = 'buyer' AND p_seller_type IS NOT NULL THEN RAISE EXCEPTION 'buyer intent cannot carry seller type'; END IF;
  IF v_expires_at <= now() THEN RAISE EXCEPTION 'signup intent expiry must be in the future'; END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_provider || ':' || v_subject, 0));
  UPDATE private.signup_intents
  SET consumed_at = now()
  WHERE auth_provider = v_provider AND provider_subject = v_subject AND consumed_at IS NULL;

  RETURN QUERY
  INSERT INTO private.signup_intents AS si (
    email, auth_provider, provider_subject, requested_role, first_name, last_name,
    seller_type, expires_at
  ) VALUES (
    v_email, v_provider, v_subject, p_requested_role, btrim(p_first_name),
    btrim(p_last_name), p_seller_type, v_expires_at
  ) RETURNING si.id, si.expires_at;
END;
$$;

REVOKE ALL ON FUNCTION public.create_social_signup_intent(text,text,text,text,text,text,text,timestamptz)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_social_signup_intent(text,text,text,text,text,text,text,timestamptz)
TO service_role;

CREATE OR REPLACE FUNCTION private.sync_public_email_verified_from_auth()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
    UPDATE public.users SET "isEmailVerified" = true
    WHERE id = NEW.id AND "isEmailVerified" IS DISTINCT FROM true;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.sync_public_email_verified_from_auth() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.sync_public_email_verified_from_auth() TO service_role;
DROP TRIGGER IF EXISTS trg_sync_public_email_verified_from_auth ON auth.users;
CREATE TRIGGER trg_sync_public_email_verified_from_auth
AFTER UPDATE OF email_confirmed_at ON auth.users
FOR EACH ROW
WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
EXECUTE FUNCTION private.sync_public_email_verified_from_auth();

DO $$
BEGIN
  IF has_table_privilege('anon', 'private.signup_intents', 'SELECT')
     OR has_table_privilege('authenticated', 'private.signup_intents', 'SELECT')
     OR has_table_privilege('anon', 'private.signup_intents', 'INSERT')
     OR has_table_privilege('authenticated', 'private.signup_intents', 'INSERT')
     OR has_table_privilege('anon', 'private.signup_intents', 'UPDATE')
     OR has_table_privilege('authenticated', 'private.signup_intents', 'UPDATE') THEN
    RAISE EXCEPTION '676 signup intent security failure: client role has direct table access';
  END IF;
  IF has_function_privilege('anon','public.create_signup_intent(text,text,text,text,text,text,text,text,text,text,jsonb,timestamptz)','EXECUTE')
     OR has_function_privilege('authenticated','public.create_signup_intent(text,text,text,text,text,text,text,text,text,text,jsonb,timestamptz)','EXECUTE') THEN
    RAISE EXCEPTION '676 signup intent RPC security failure: client role can execute RPC';
  END IF;
  IF NOT has_function_privilege('service_role','public.create_signup_intent(text,text,text,text,text,text,text,text,text,text,jsonb,timestamptz)','EXECUTE') THEN
    RAISE EXCEPTION '676 signup intent RPC security failure: service role cannot execute RPC';
  END IF;
  IF has_function_privilege('anon','public.create_social_signup_intent(text,text,text,text,text,text,text,timestamptz)','EXECUTE')
     OR has_function_privilege('authenticated','public.create_social_signup_intent(text,text,text,text,text,text,text,timestamptz)','EXECUTE') THEN
    RAISE EXCEPTION '676 social signup intent security failure: client role can execute RPC';
  END IF;
  IF NOT has_function_privilege('service_role','public.create_social_signup_intent(text,text,text,text,text,text,text,timestamptz)','EXECUTE') THEN
    RAISE EXCEPTION '676 social signup intent RPC security failure: service role cannot execute RPC';
  END IF;
  IF has_function_privilege('anon','private.sync_public_email_verified_from_auth()','EXECUTE')
     OR has_function_privilege('authenticated','private.sync_public_email_verified_from_auth()','EXECUTE') THEN
    RAISE EXCEPTION '676 email verification sync failure: trigger helper exposed to client';
  END IF;
END
$$;;
