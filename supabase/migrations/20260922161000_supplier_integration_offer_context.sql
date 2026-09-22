-- Server-only Direct Supplier offer -> integration runtime context.
-- No secrets or customer data are returned.

CREATE OR REPLACE FUNCTION public.server_supplier_offer_integration_context_v1(
  p_supplier_offer_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_offer private.supplier_offers%ROWTYPE;
  v_supplier private.supplier_foundation_suppliers%ROWTYPE;
BEGIN
  IF p_supplier_offer_id IS NULL THEN
    RETURN jsonb_build_object('eligible',false,'reason','supplier_offer_id_required','interfaceVersion',1);
  END IF;

  SELECT * INTO v_offer
  FROM private.supplier_offers
  WHERE id=p_supplier_offer_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('eligible',false,'reason','supplier_offer_not_found','interfaceVersion',1);
  END IF;

  SELECT * INTO v_supplier
  FROM private.supplier_foundation_suppliers
  WHERE id=v_offer.supplier_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('eligible',false,'reason','supplier_not_found','interfaceVersion',1);
  END IF;

  RETURN jsonb_build_object(
    'eligible',true,
    'reason','supplier_offer_integration_context_ready',
    'supplierOfferId',v_offer.id,
    'supplierId',v_supplier.id,
    'supplierKey',v_supplier.supplier_key,
    'providerKey',v_offer.provider_key,
    'territory',v_offer.territory,
    'interfaceVersion',1
  );
END;
$$;

REVOKE ALL ON FUNCTION public.server_supplier_offer_integration_context_v1(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_supplier_offer_integration_context_v1(uuid)
  TO service_role;

COMMENT ON FUNCTION public.server_supplier_offer_integration_context_v1(uuid) IS
  'Server-only non-secret resolver from canonical supplier offer to Supplier Integration Kit runtime scope.';
