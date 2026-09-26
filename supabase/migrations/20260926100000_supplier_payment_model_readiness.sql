-- Supplier marketplace payment-model technical readiness.
--
-- Evidence-backed from Stripe Connect behaviour:
-- - direct charge: connected supplier account is charge account / merchant of record;
-- - indirect charge with on_behalf_of: connected supplier can be merchant of record,
--   while the platform charge balance bears refund/dispute exposure;
-- - indirect on_behalf_of additionally requires transfer-recipient capability.
--
-- This function does not choose a model or enable checkout.

CREATE OR REPLACE FUNCTION public.server_supplier_payment_model_readiness_v1(
  p_supplier_id uuid,
  p_market_code text,
  p_model text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_market text:=upper(BTRIM(COALESCE(p_market_code,'')));
  v_model text:=lower(BTRIM(COALESCE(p_model,'')));
  v_supplier private.supplier_foundation_suppliers%ROWTYPE;
  v_stripe jsonb:='{}'::jsonb;
  v_technical_ready boolean:=false;
  v_reason text;
  v_charge_account text;
  v_refund_balance text;
  v_dispute_balance text;
  v_platform_loss_exposure boolean;
BEGIN
  IF v_market !~ '^[A-Z]{2}$' THEN
    RETURN jsonb_build_object(
      'eligible',false,
      'reason','invalid_market',
      'marketCode',v_market,
      'model',v_model,
      'interfaceVersion',1
    );
  END IF;

  IF v_model NOT IN ('stripe_connect_direct_charge','stripe_connect_indirect_obo') THEN
    RETURN jsonb_build_object(
      'eligible',false,
      'reason','unsupported_supplier_payment_model',
      'marketCode',v_market,
      'model',v_model,
      'interfaceVersion',1
    );
  END IF;

  SELECT * INTO v_supplier
  FROM private.supplier_foundation_suppliers
  WHERE id=p_supplier_id
    AND lifecycle_status='approved';

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'eligible',false,
      'reason','approved_supplier_not_found',
      'supplierId',p_supplier_id,
      'marketCode',v_market,
      'model',v_model,
      'interfaceVersion',1
    );
  END IF;

  v_stripe:=public.server_supplier_stripe_account_readiness_v1(
    p_supplier_id,
    COALESCE(NULLIF(v_supplier.business_country,''),NULLIF(v_supplier.origin_country,''))
  );

  IF v_model='stripe_connect_direct_charge' THEN
    v_technical_ready:=COALESCE((v_stripe->>'directChargeReady')::boolean,false);
    v_charge_account:='connected_supplier';
    v_refund_balance:='connected_supplier';
    v_dispute_balance:='connected_supplier';
    v_platform_loss_exposure:=false;
    v_reason:=CASE
      WHEN v_technical_ready THEN 'direct_charge_technical_capabilities_ready'
      ELSE 'direct_charge_supplier_capability_incomplete'
    END;
  ELSE
    v_technical_ready:=
      COALESCE((v_stripe->>'directChargeReady')::boolean,false)
      AND COALESCE((v_stripe->>'transferRecipientReady')::boolean,false);
    v_charge_account:='platform';
    v_refund_balance:='platform';
    v_dispute_balance:='platform';
    v_platform_loss_exposure:=true;
    v_reason:=CASE
      WHEN v_technical_ready THEN 'indirect_obo_technical_capabilities_ready'
      ELSE 'indirect_obo_supplier_capability_incomplete'
    END;
  END IF;
  RETURN jsonb_build_object(
    'eligible',v_technical_ready,
    'reason',v_reason,
    'supplierId',v_supplier.id,
    'supplierName',COALESCE(NULLIF(BTRIM(v_supplier.legal_name),''),v_supplier.display_name),
    'marketCode',v_market,
    'model',v_model,
    'supplierIsMerchantOfRecord',true,
    'chargeAccount',v_charge_account,
    'refundBalance',v_refund_balance,
    'disputeBalance',v_dispute_balance,
    'platformLossExposure',v_platform_loss_exposure,
    'supplierStripeReadiness',v_stripe,
    'commercialModelSelected',false,
    'checkoutEnabled',false,
    'crossBorderRouteAuthoritative',false,
    'interfaceVersion',1
  );
END;
$$;

REVOKE ALL ON FUNCTION public.server_supplier_payment_model_readiness_v1(uuid,text,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_supplier_payment_model_readiness_v1(uuid,text,text)
  TO service_role;

COMMENT ON FUNCTION public.server_supplier_payment_model_readiness_v1(uuid,text,text) IS
  'Evidence-backed technical readiness for candidate supplier Stripe charge models. It never selects a model, enables checkout, or changes commercial controls.';
