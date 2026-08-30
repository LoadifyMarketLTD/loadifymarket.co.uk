ALTER TABLE private.signup_intents
  DROP CONSTRAINT IF EXISTS signup_intents_customer_type_contract;

ALTER TABLE private.signup_intents
  ADD CONSTRAINT signup_intents_customer_type_contract
  CHECK (
    (requested_role = 'seller' AND customer_type IS NULL)
    OR
    (
      requested_role = 'buyer'
      AND (
        customer_type IS NULL
        OR customer_type IN (
          'individual','sole_trader','limited_company','partnership','charity','other'
        )
      )
    )
  );

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
  IF p_requested_role NOT IN ('buyer','seller') THEN RAISE EXCEPTION 'invalid signup intent role'; END IF;
  IF btrim(COALESCE(p_first_name,'')) = '' OR btrim(COALESCE(p_last_name,'')) = '' THEN RAISE EXCEPTION 'invalid signup intent identity'; END IF;
  IF p_requested_role='seller' AND p_seller_type NOT IN ('individual','sole_trader','company') THEN RAISE EXCEPTION 'invalid seller type'; END IF;
  IF p_requested_role='buyer' AND p_seller_type IS NOT NULL THEN RAISE EXCEPTION 'buyer intent cannot carry seller type'; END IF;
  IF p_requested_role='seller' AND p_customer_type IS NOT NULL THEN RAISE EXCEPTION 'seller intent cannot carry buyer account type'; END IF;
  IF p_requested_role='buyer' AND p_customer_type IS NOT NULL
     AND p_customer_type NOT IN ('individual','sole_trader','limited_company','partnership','charity','other') THEN
    RAISE EXCEPTION 'invalid buyer account type';
  END IF;
  IF v_expires_at <= now() THEN RAISE EXCEPTION 'signup intent expiry must be in the future'; END IF;

  RETURN QUERY
  INSERT INTO private.signup_intents AS si (
    email,auth_provider,provider_subject,requested_role,first_name,last_name,
    seller_type,store_name,phone,company_name,vat_number,customer_type,business_address,expires_at
  ) VALUES (
    v_email,'email',NULL,p_requested_role,btrim(p_first_name),btrim(p_last_name),
    p_seller_type,NULLIF(btrim(p_store_name),''),NULLIF(btrim(p_phone),''),
    NULLIF(btrim(p_company_name),''),NULLIF(btrim(p_vat_number),''),p_customer_type,p_business_address,v_expires_at
  ) RETURNING si.id,si.expires_at;
END;
$$;

REVOKE ALL ON FUNCTION public.create_signup_intent(text,text,text,text,text,text,text,text,text,text,jsonb,timestamptz)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_signup_intent(text,text,text,text,text,text,text,text,text,text,jsonb,timestamptz)
  TO service_role;;
