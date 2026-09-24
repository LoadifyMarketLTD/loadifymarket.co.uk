-- Market-aware buyer return eligibility.
-- Romania remains fail-closed until the RO/EU compliance evidence gate is ready.
-- The statutory/policy 14-day delivery boundary remains unchanged here.

CREATE OR REPLACE FUNCTION public.can_open_return(p_order_id uuid, p_seller_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_order public.orders%ROWTYPE;
  v_market text;
  v_compliance jsonb;
BEGIN
  SELECT * INTO v_order
  FROM public.orders o
  WHERE o.id=p_order_id
    AND o."buyerId"=auth.uid()
    AND o."sellerId"=p_seller_id
    AND o.status IN ('delivered','completed');

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  v_market := upper(BTRIM(COALESCE(v_order."marketCode",'GB')));
  IF v_market NOT IN ('GB','RO') THEN
    RETURN false;
  END IF;

  IF v_market='RO' THEN
    v_compliance := public.server_market_compliance_readiness_v1('RO');
    IF COALESCE((v_compliance->>'eligible')::boolean,false) IS DISTINCT FROM true THEN
      RETURN false;
    END IF;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.shipments s
    WHERE s.order_id=v_order.id
      AND lower(trim(s.status))='delivered'
      AND s.updated_at IS NOT NULL
      AND s.updated_at<=now()
      AND s.updated_at>=now()-interval '14 days'
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.can_open_return(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_open_return(uuid,uuid) TO authenticated, service_role;

COMMENT ON FUNCTION public.can_open_return(uuid,uuid) IS
  'Market-aware buyer return gate. GB preserves the current delivery-based 14-day boundary; RO additionally requires verified Romania/EU market compliance evidence.';
