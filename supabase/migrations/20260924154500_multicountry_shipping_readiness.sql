-- Multi-country shipping market readiness.
-- Existing methods/rates are UK/GBP. Romania must receive explicit RO/RON
-- shipping configuration before any checkout can be enabled.

ALTER TABLE public.shipping_methods
  ADD COLUMN IF NOT EXISTS "marketCodes" text[] NOT NULL DEFAULT ARRAY['GB']::text[];

ALTER TABLE public.shipping_rates
  ADD COLUMN IF NOT EXISTS "marketCode" text NOT NULL DEFAULT 'GB';

ALTER TABLE public.shipping_methods
  DROP CONSTRAINT IF EXISTS shipping_methods_market_codes_check,
  ADD CONSTRAINT shipping_methods_market_codes_check
    CHECK (
      "marketCodes" <@ ARRAY['GB','RO']::text[]
      AND cardinality("marketCodes") > 0
    );

ALTER TABLE public.shipping_rates
  DROP CONSTRAINT IF EXISTS shipping_rates_market_code_check,
  ADD CONSTRAINT shipping_rates_market_code_check
    CHECK ("marketCode" IN ('GB','RO')),
  DROP CONSTRAINT IF EXISTS shipping_rates_market_currency_check,
  ADD CONSTRAINT shipping_rates_market_currency_check
    CHECK (
      ("marketCode"='GB' AND currency='GBP')
      OR ("marketCode"='RO' AND currency='RON')
    );

CREATE INDEX IF NOT EXISTS shipping_methods_market_codes_gin_idx
  ON public.shipping_methods USING gin ("marketCodes");

CREATE INDEX IF NOT EXISTS shipping_rates_market_code_idx
  ON public.shipping_rates ("marketCode",method_id);

CREATE OR REPLACE FUNCTION public.server_shipping_market_readiness_v1(
  p_product_id uuid,
  p_market_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_market text := upper(BTRIM(COALESCE(p_market_code,'')));
  v_expected_currency text;
  v_product public.products%ROWTYPE;
  v_method_count integer := 0;
  v_rate_count integer := 0;
BEGIN
  IF v_market NOT IN ('GB','RO') THEN
    RETURN jsonb_build_object(
      'eligible',false,
      'reason','unsupported_market',
      'interfaceVersion',1
    );
  END IF;

  v_expected_currency := CASE WHEN v_market='GB' THEN 'GBP' ELSE 'RON' END;

  SELECT * INTO v_product
  FROM public.products
  WHERE id=p_product_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'eligible',false,
      'reason','product_not_found',
      'interfaceVersion',1
    );
  END IF;

  IF NOT (v_market = ANY(COALESCE(v_product."marketCodes", ARRAY['GB']::text[]))) THEN
    RETURN jsonb_build_object(
      'eligible',false,
      'reason','product_market_not_enabled',
      'market',v_market,
      'interfaceVersion',1
    );
  END IF;

  SELECT count(DISTINCT ps.method_id)
  INTO v_method_count
  FROM public.product_shipping ps
  JOIN public.shipping_methods sm ON sm.id=ps.method_id
  WHERE ps.product_id=p_product_id
    AND sm.active=true
    AND v_market=ANY(COALESCE(sm."marketCodes", ARRAY['GB']::text[]));

  IF v_method_count=0 THEN
    RETURN jsonb_build_object(
      'eligible',false,
      'reason','shipping_method_missing',
      'market',v_market,
      'interfaceVersion',1
    );
  END IF;

  SELECT count(DISTINCT sr.method_id)
  INTO v_rate_count
  FROM public.product_shipping ps
  JOIN public.shipping_methods sm ON sm.id=ps.method_id
  JOIN public.shipping_rates sr ON sr.method_id=sm.id
  WHERE ps.product_id=p_product_id
    AND sm.active=true
    AND v_market=ANY(COALESCE(sm."marketCodes", ARRAY['GB']::text[]))
    AND sr."marketCode"=v_market
    AND sr.currency=v_expected_currency;

  IF v_rate_count<v_method_count THEN
    RETURN jsonb_build_object(
      'eligible',false,
      'reason','market_shipping_rate_missing',
      'market',v_market,
      'expectedCurrency',v_expected_currency,
      'eligibleMethodCount',v_method_count,
      'ratedMethodCount',v_rate_count,
      'interfaceVersion',1
    );
  END IF;

  RETURN jsonb_build_object(
    'eligible',true,
    'reason','shipping_market_ready',
    'productId',p_product_id,
    'market',v_market,
    'currency',v_expected_currency,
    'shippingMethodCount',v_method_count,
    'interfaceVersion',1
  );
END;
$$;

REVOKE ALL ON FUNCTION public.server_shipping_market_readiness_v1(uuid,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_shipping_market_readiness_v1(uuid,text)
  TO service_role;

COMMENT ON COLUMN public.shipping_methods."marketCodes" IS
  'Markets in which this shipping method is operationally available. Legacy methods default to GB only.';
COMMENT ON COLUMN public.shipping_rates."marketCode" IS
  'Market for this shipping rate. GB requires GBP; RO requires RON.';
COMMENT ON FUNCTION public.server_shipping_market_readiness_v1(uuid,text) IS
  'Fail-closed product shipping readiness for GB/RO. Romania remains blocked until explicit RO methods and RON rates exist.';
