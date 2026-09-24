-- Read-only Romania checkout readiness composition.
-- This RPC can prove readiness but cannot activate checkout or create payments.

CREATE OR REPLACE FUNCTION public.server_romania_checkout_readiness_v1(
  p_product_id uuid,
  p_supplier_catalog_item_id uuid DEFAULT NULL,
  p_canonical_product_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_market jsonb;
  v_price jsonb;
  v_shipping jsonb;
  v_product jsonb;
  v_failures text[] := '{}';
BEGIN
  v_market:=public.server_market_compliance_readiness_v1('RO');
  v_price:=public.server_product_market_price_decision_v1(p_product_id,'RO');
  v_shipping:=public.server_shipping_market_readiness_v1(p_product_id,'RO');

  IF COALESCE((v_market->>'eligible')::boolean,false) IS DISTINCT FROM true THEN
    v_failures:=array_append(v_failures,'market_compliance');
  END IF;
  IF COALESCE((v_price->>'eligible')::boolean,false) IS DISTINCT FROM true THEN
    v_failures:=array_append(v_failures,'market_native_price');
  END IF;
  IF COALESCE((v_shipping->>'eligible')::boolean,false) IS DISTINCT FROM true THEN
    v_failures:=array_append(v_failures,'market_shipping');
  END IF;

  IF p_supplier_catalog_item_id IS NOT NULL OR p_canonical_product_id IS NOT NULL THEN
    IF p_supplier_catalog_item_id IS NULL OR p_canonical_product_id IS NULL THEN
      v_failures:=array_append(v_failures,'product_compliance_identity');
    ELSE
      v_product:=public.server_product_market_compliance_decision_v1(
        p_supplier_catalog_item_id,p_canonical_product_id,'RO'
      );
      IF COALESCE((v_product->>'eligible')::boolean,false) IS DISTINCT FROM true THEN
        v_failures:=array_append(v_failures,'product_compliance');
      END IF;
    END IF;
  END IF;

  -- Payment remains intentionally disabled. A future reviewed payment-readiness
  -- boundary must replace this explicit false before Romania can transact.
  v_failures:=array_append(v_failures,'payment_not_enabled');

  RETURN jsonb_build_object(
    'eligible',false,
    'market','RO',
    'currency','RON',
    'checkoutEnabled',false,
    'paymentEnabled',false,
    'failures',to_jsonb(v_failures),
    'marketCompliance',v_market,
    'marketPrice',v_price,
    'marketShipping',v_shipping,
    'productCompliance',COALESCE(v_product,'{}'::jsonb),
    'interfaceVersion',1
  );
END;
$$;

REVOKE ALL ON FUNCTION public.server_romania_checkout_readiness_v1(uuid,uuid,uuid)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.server_romania_checkout_readiness_v1(uuid,uuid,uuid)
  TO service_role;

COMMENT ON FUNCTION public.server_romania_checkout_readiness_v1(uuid,uuid,uuid) IS
  'Read-only fail-closed RO checkout readiness composition. It never activates checkout; payment remains explicitly disabled.';
