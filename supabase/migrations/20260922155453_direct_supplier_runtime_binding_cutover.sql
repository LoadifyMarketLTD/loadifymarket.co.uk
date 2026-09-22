-- Cut Direct Supplier canonical runtime gates over to verified Universal Supplier Integration Kit bindings.
-- Non-direct providers retain legacy supplier_adapter_registrations checks.
-- This migration does not activate commerce, create orders, expose secrets, or enable controls.

CREATE OR REPLACE FUNCTION public.server_prepare_supplier_order_handshake_v1(
  p_order_id uuid,
  p_fulfilment_leg_id uuid,
  p_idempotency_key text,
  p_correlation_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_orch private.supplier_order_orchestrations%ROWTYPE;
  v_leg private.supplier_fulfilment_legs%ROWTYPE;
  v_offer private.supplier_offers%ROWTYPE;
  v_supplier private.supplier_foundation_suppliers%ROWTYPE;
  v_adapter private.supplier_adapter_registrations%ROWTYPE;
  v_res private.supplier_stock_reservations%ROWTYPE;
  v_payment public.payment_sessions%ROWTYPE;
  v_payment_evidence private.supplier_payment_evidence_snapshots%ROWTYPE;
  v_handshake private.supplier_order_handshakes%ROWTYPE;
  v_control jsonb;
  v_sync jsonb;
  v_quantity integer;
  v_destination_country text;
  v_fingerprint text;
  v_provider_key text;
  v_adapter_version text;
BEGIN
  IF NULLIF(BTRIM(p_idempotency_key),'') IS NULL OR p_correlation_id IS NULL THEN
    RETURN jsonb_build_object('eligible',false,'reason','idempotency_and_correlation_required','interfaceVersion',2);
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id=p_order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('eligible',false,'reason','order_not_found','interfaceVersion',2); END IF;
  IF v_order.status NOT IN ('paid','packed','shipped','delivered')
     OR NULLIF(BTRIM(v_order."stripePaymentIntentId"),'') IS NULL THEN
    RETURN jsonb_build_object('eligible',false,'reason','canonical_payment_not_proven','interfaceVersion',2);
  END IF;

  SELECT * INTO v_orch FROM private.supplier_order_orchestrations WHERE order_id=p_order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('eligible',false,'reason','order_orchestration_missing','interfaceVersion',2); END IF;

  SELECT * INTO v_leg
  FROM private.supplier_fulfilment_legs
  WHERE id=p_fulfilment_leg_id AND orchestration_id=v_orch.id
  FOR UPDATE;
  IF NOT FOUND OR v_leg.fulfiller_type<>'supplier'
     OR v_leg.commercial_mode<>'loadify_supplier_fulfilled'
     OR v_leg.supplier_offer_id IS NULL THEN
    RETURN jsonb_build_object('eligible',false,'reason','supplier_fulfilment_leg_not_ready','interfaceVersion',2);
  END IF;
  IF v_leg.status NOT IN ('reserved','supplier_submitting','supplier_pending','reconciliation_required') THEN
    RETURN jsonb_build_object('eligible',false,'reason','supplier_fulfilment_leg_state_invalid','state',v_leg.status,'interfaceVersion',2);
  END IF;

  SELECT * INTO v_offer FROM private.supplier_offers WHERE id=v_leg.supplier_offer_id AND status='approved';
  IF NOT FOUND THEN RETURN jsonb_build_object('eligible',false,'reason','supplier_offer_not_ready','interfaceVersion',2); END IF;

  SELECT * INTO v_supplier
  FROM private.supplier_foundation_suppliers
  WHERE id=v_offer.supplier_id AND lifecycle_status='approved';
  IF NOT FOUND THEN RETURN jsonb_build_object('eligible',false,'reason','supplier_not_approved','interfaceVersion',2); END IF;

  v_control:=public.server_supplier_commerce_control_decision_v1(
    'supplier_order',
    jsonb_build_object(
      'supplierRef',v_supplier.supplier_key,
      'offerRef',v_offer.offer_key,
      'productRef',v_offer.canonical_product_id::text,
      'territory',v_offer.territory
    )
  );
  IF COALESCE((v_control->>'enabled')::boolean,false) IS DISTINCT FROM true THEN
    RETURN jsonb_build_object('eligible',false,'reason','supplier_order_control_disabled','control',v_control,'interfaceVersion',2);
  END IF;

  SELECT * INTO v_res
  FROM private.supplier_stock_reservations
  WHERE orchestration_id=v_orch.id
    AND supplier_offer_id=v_offer.id
    AND status='active'
    AND expires_at>now()
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('eligible',false,'reason','active_supplier_reservation_missing','interfaceVersion',2); END IF;

  SELECT COALESCE(SUM(i.quantity),0)::integer INTO v_quantity
  FROM private.supplier_fulfilment_leg_items i
  WHERE i.leg_id=v_leg.id;
  IF v_quantity<=0 OR v_quantity<>v_res.quantity THEN
    RETURN jsonb_build_object('eligible',false,'reason','reservation_quantity_mismatch','interfaceVersion',2);
  END IF;

  SELECT * INTO v_payment
  FROM public.payment_sessions ps
  WHERE ps."orderId"=v_order.id
    AND ps.status='completed'
    AND ps."stripePaymentIntent"=v_order."stripePaymentIntentId"
  ORDER BY ps."updatedAt" DESC
  LIMIT 1;
  IF NOT FOUND OR v_payment.amount<>v_order.total OR upper(BTRIM(v_payment.currency))<>'GBP' THEN
    RETURN jsonb_build_object('eligible',false,'reason','canonical_payment_evidence_mismatch','interfaceVersion',2);
  END IF;

  v_sync:=public.server_supplier_stock_price_decision_v1(
    v_offer.id,v_offer.canonical_product_id,'loadify_supplier_fulfilled',v_offer.territory,v_res.external_variant_ref
  );
  IF COALESCE((v_sync->>'eligible')::boolean,false) IS DISTINCT FROM true THEN
    RETURN jsonb_build_object('eligible',false,'reason','supplier_stock_price_recheck_failed','sync',v_sync,'interfaceVersion',2);
  END IF;
  IF (v_sync->>'pricingSnapshotId')::uuid IS DISTINCT FROM v_res.pricing_snapshot_id THEN
    RETURN jsonb_build_object('eligible',false,'reason','supplier_price_changed_since_reservation','sync',v_sync,'interfaceVersion',2);
  END IF;
  IF v_sync->>'sellableQuantity' IS NULL OR (v_sync->>'sellableQuantity')::integer < v_quantity THEN
    RETURN jsonb_build_object('eligible',false,'reason','supplier_stock_changed_since_reservation','sync',v_sync,'interfaceVersion',2);
  END IF;

  IF v_offer.provider_key='direct_supplier' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM private.supplier_integration_profiles p
      WHERE p.supplier_id=v_supplier.id
        AND p.territory=v_offer.territory
        AND p.capability='order_submission'
        AND p.status='verified'
        AND p.execution_mode='automated_write'
        AND p.transport IN ('http_rest','graphql')
        AND NULLIF(BTRIM(p.config_ref),'') IS NOT NULL
        AND NULLIF(BTRIM(p.contract_ref),'') IS NOT NULL
    ) OR NOT EXISTS (
      SELECT 1
      FROM private.supplier_integration_profiles p
      WHERE p.supplier_id=v_supplier.id
        AND p.territory=v_offer.territory
        AND p.capability='acknowledgement'
        AND p.status='verified'
        AND p.execution_mode IN ('automated_read','automated_write')
        AND p.transport IN ('http_rest','graphql','webhook')
        AND (
          p.transport='webhook'
          OR NULLIF(BTRIM(p.config_ref),'') IS NOT NULL
        )
        AND NULLIF(BTRIM(p.contract_ref),'') IS NOT NULL
    ) THEN
      RETURN jsonb_build_object('eligible',false,'reason','direct_supplier_order_binding_not_ready','interfaceVersion',2);
    END IF;
    v_provider_key:='direct_supplier';
    v_adapter_version:='1.0.0';
  ELSE
    SELECT * INTO v_adapter
    FROM private.supplier_adapter_registrations a
    WHERE a.supplier_id=v_supplier.id
      AND a.status='active'
      AND a.interface_version=1
      AND a.capabilities @> ARRAY['order_submission','acknowledgement']::text[]
    ORDER BY a.verified_at DESC
    LIMIT 1;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('eligible',false,'reason','supplier_order_adapter_not_ready','interfaceVersion',2);
    END IF;
    v_provider_key:=v_adapter.provider_key;
    v_adapter_version:=v_adapter.adapter_version;
  END IF;

  INSERT INTO private.supplier_payment_evidence_snapshots(
    order_id,payment_session_id,payment_intent_ref,payment_status,order_status,amount,currency
  ) VALUES(
    v_order.id,v_payment.id,v_order."stripePaymentIntentId",v_payment.status,v_order.status,v_payment.amount,upper(v_payment.currency)
  )
  ON CONFLICT(order_id) DO NOTHING;

  SELECT * INTO v_payment_evidence
  FROM private.supplier_payment_evidence_snapshots
  WHERE order_id=v_order.id;
  IF v_payment_evidence.payment_intent_ref<>v_order."stripePaymentIntentId"
     OR v_payment_evidence.amount<>v_payment.amount THEN
    RAISE EXCEPTION 'payment evidence identity mismatch for order';
  END IF;

  v_destination_country:=upper(BTRIM(COALESCE(
    v_order."shippingAddress"->>'countryCode',
    v_order."shippingAddress"->>'country',
    'GB'
  )));
  IF v_destination_country='' THEN v_destination_country:='GB'; END IF;

  v_fingerprint:=md5(concat_ws(
    '|',v_order.id::text,v_leg.id::text,v_res.id::text,v_payment_evidence.id::text,
    v_offer.id::text,v_offer.external_offer_ref,v_quantity::text,v_destination_country
  ));

  SELECT * INTO v_handshake
  FROM private.supplier_order_handshakes
  WHERE fulfilment_leg_id=v_leg.id
  FOR UPDATE;

  IF FOUND THEN
    IF v_handshake.idempotency_key<>BTRIM(p_idempotency_key)
       OR v_handshake.request_fingerprint<>v_fingerprint THEN
      RAISE EXCEPTION 'supplier order handshake idempotency collision with different request';
    END IF;
    IF v_handshake.provider_key<>v_provider_key OR v_handshake.adapter_version<>v_adapter_version THEN
      RAISE EXCEPTION 'supplier order handshake runtime binding cannot change';
    END IF;
  ELSE
    INSERT INTO private.supplier_order_handshakes(
      order_id,orchestration_id,fulfilment_leg_id,reservation_id,payment_evidence_id,
      supplier_offer_id,supplier_id,provider_key,adapter_version,idempotency_key,
      correlation_id,request_fingerprint
    ) VALUES(
      v_order.id,v_orch.id,v_leg.id,v_res.id,v_payment_evidence.id,
      v_offer.id,v_supplier.id,v_provider_key,v_adapter_version,BTRIM(p_idempotency_key),
      p_correlation_id,v_fingerprint
    )
    RETURNING * INTO v_handshake;

    INSERT INTO private.supplier_order_handshake_events(
      handshake_id,event_key,event,new_state,reason,metadata
    ) VALUES(
      v_handshake.id,'prepared:'||v_handshake.id::text,'prepared','prepared',
      'payment_and_supplier_readiness_verified',
      jsonb_build_object(
        'paymentEvidenceId',v_payment_evidence.id,
        'reservationId',v_res.id,
        'pricingSnapshotId',v_res.pricing_snapshot_id,
        'integrationKit',v_provider_key='direct_supplier'
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'eligible',true,
    'reason','supplier_order_handshake_ready',
    'handshakeId',v_handshake.id,
    'orderId',v_order.id,
    'fulfilmentLegId',v_leg.id,
    'reservationId',v_res.id,
    'paymentEvidenceId',v_payment_evidence.id,
    'supplierKey',v_supplier.supplier_key,
    'supplierOfferId',v_offer.id,
    'externalOfferRef',v_offer.external_offer_ref,
    'providerKey',v_provider_key,
    'adapterVersion',v_adapter_version,
    'quantity',v_quantity,
    'destinationCountry',v_destination_country,
    'idempotencyKey',v_handshake.idempotency_key,
    'correlationId',v_handshake.correlation_id,
    'state',v_handshake.state,
    'externalSupplierOrderRef',v_handshake.external_supplier_order_ref,
    'interfaceVersion',2
  );
END;
$$;

REVOKE ALL ON FUNCTION public.server_prepare_supplier_order_handshake_v1(uuid,uuid,text,uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_prepare_supplier_order_handshake_v1(uuid,uuid,text,uuid)
  TO service_role;

CREATE OR REPLACE FUNCTION public.server_supplier_tracking_context_v1(
  p_handshake_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_h private.supplier_order_handshakes%ROWTYPE;
  v_s private.supplier_foundation_suppliers%ROWTYPE;
  v_offer private.supplier_offers%ROWTYPE;
  v_adapter private.supplier_adapter_registrations%ROWTYPE;
  v_provider_key text;
  v_adapter_version text;
BEGIN
  SELECT * INTO v_h FROM private.supplier_order_handshakes WHERE id=p_handshake_id;
  IF NOT FOUND OR v_h.state<>'reconciled'
     OR v_h.acknowledgement_state<>'accepted'
     OR v_h.external_supplier_order_ref IS NULL THEN
    RETURN jsonb_build_object('eligible',false,'reason','supplier_order_not_reconciled','interfaceVersion',2);
  END IF;

  SELECT * INTO v_s
  FROM private.supplier_foundation_suppliers
  WHERE id=v_h.supplier_id AND lifecycle_status='approved';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('eligible',false,'reason','supplier_not_approved','interfaceVersion',2);
  END IF;

  SELECT * INTO v_offer
  FROM private.supplier_offers
  WHERE id=v_h.supplier_offer_id AND supplier_id=v_h.supplier_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('eligible',false,'reason','supplier_offer_not_found','interfaceVersion',2);
  END IF;

  IF v_h.provider_key='direct_supplier' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM private.supplier_integration_profiles p
      WHERE p.supplier_id=v_h.supplier_id
        AND p.territory=v_offer.territory
        AND p.capability='tracking'
        AND p.status='verified'
        AND p.execution_mode IN ('automated_read','automated_write')
        AND p.transport IN ('http_rest','graphql','webhook')
        AND (
          p.transport='webhook'
          OR NULLIF(BTRIM(p.config_ref),'') IS NOT NULL
        )
    ) THEN
      RETURN jsonb_build_object('eligible',false,'reason','tracking_integration_binding_not_ready','interfaceVersion',2);
    END IF;
    v_provider_key:='direct_supplier';
    v_adapter_version:='1.0.0';
  ELSE
    SELECT * INTO v_adapter
    FROM private.supplier_adapter_registrations a
    WHERE a.supplier_id=v_h.supplier_id
      AND a.status='active'
      AND a.interface_version=1
      AND a.capabilities @> ARRAY['tracking']::text[]
    ORDER BY a.verified_at DESC
    LIMIT 1;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('eligible',false,'reason','tracking_adapter_not_ready','interfaceVersion',2);
    END IF;
    v_provider_key:=v_adapter.provider_key;
    v_adapter_version:=v_adapter.adapter_version;
  END IF;

  RETURN jsonb_build_object(
    'eligible',true,
    'reason','supplier_tracking_ready',
    'handshakeId',v_h.id,
    'orderId',v_h.order_id,
    'orchestrationId',v_h.orchestration_id,
    'fulfilmentLegId',v_h.fulfilment_leg_id,
    'supplierId',v_h.supplier_id,
    'supplierKey',v_s.supplier_key,
    'supplierOfferId',v_h.supplier_offer_id,
    'providerKey',v_provider_key,
    'adapterVersion',v_adapter_version,
    'supplierOrderRef',v_h.external_supplier_order_ref,
    'correlationId',v_h.correlation_id,
    'interfaceVersion',2
  );
END;
$$;

REVOKE ALL ON FUNCTION public.server_supplier_tracking_context_v1(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_supplier_tracking_context_v1(uuid)
  TO service_role;

CREATE OR REPLACE FUNCTION public.server_prepare_supplier_return_v1(
  p_order_id uuid,
  p_fulfilment_leg_id uuid,
  p_reason_code text,
  p_quantity integer,
  p_idempotency_key text,
  p_correlation_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_leg private.supplier_fulfilment_legs%ROWTYPE;
  v_h private.supplier_order_handshakes%ROWTYPE;
  v_ship private.supplier_leg_shipments%ROWTYPE;
  v_supplier private.supplier_foundation_suppliers%ROWTYPE;
  v_offer private.supplier_offers%ROWTYPE;
  v_adapter private.supplier_adapter_registrations%ROWTYPE;
  v_case private.supplier_return_cases%ROWTYPE;
  v_control jsonb;
  v_max_quantity integer;
  v_key text;
  v_provider_key text;
  v_adapter_version text;
BEGIN
  IF NULLIF(BTRIM(p_reason_code),'') IS NULL OR p_quantity IS NULL OR p_quantity<=0
     OR NULLIF(BTRIM(p_idempotency_key),'') IS NULL OR p_correlation_id IS NULL THEN
    RETURN jsonb_build_object('eligible',false,'reason','invalid_return_request','interfaceVersion',2);
  END IF;

  SELECT * INTO v_leg
  FROM private.supplier_fulfilment_legs
  WHERE id=p_fulfilment_leg_id
    AND commercial_mode='loadify_supplier_fulfilled'
    AND supplier_offer_id IS NOT NULL;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('eligible',false,'reason','supplier_fulfilment_leg_missing','interfaceVersion',2);
  END IF;

  SELECT * INTO v_h
  FROM private.supplier_order_handshakes o
  WHERE o.order_id=p_order_id
    AND o.fulfilment_leg_id=p_fulfilment_leg_id
    AND o.state='reconciled'
    AND o.acknowledgement_state='accepted'
    AND o.external_supplier_order_ref IS NOT NULL;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('eligible',false,'reason','supplier_order_not_reconciled','interfaceVersion',2);
  END IF;

  SELECT * INTO v_ship
  FROM private.supplier_leg_shipments
  WHERE fulfilment_leg_id=p_fulfilment_leg_id
    AND handshake_id=v_h.id;
  IF NOT FOUND OR v_ship.canonical_status NOT IN ('delivered','returned') THEN
    RETURN jsonb_build_object('eligible',false,'reason','return_requires_delivered_supplier_shipment','interfaceVersion',2);
  END IF;

  SELECT COALESCE(SUM(i.quantity),0)::integer INTO v_max_quantity
  FROM private.supplier_fulfilment_leg_items i
  WHERE i.leg_id=p_fulfilment_leg_id;
  IF p_quantity>v_max_quantity THEN
    RETURN jsonb_build_object('eligible',false,'reason','return_quantity_exceeds_leg_quantity','interfaceVersion',2);
  END IF;

  v_control:=public.server_supplier_commerce_control_decision_v1(
    'return_recovery',
    jsonb_build_object(
      'supplierRef',v_h.supplier_id::text,
      'offerRef',v_h.supplier_offer_id::text,
      'territory','GB'
    )
  );
  IF COALESCE((v_control->>'enabled')::boolean,false) IS DISTINCT FROM true THEN
    RETURN jsonb_build_object('eligible',false,'reason','return_recovery_control_disabled','control',v_control,'interfaceVersion',2);
  END IF;

  SELECT * INTO v_supplier
  FROM private.supplier_foundation_suppliers
  WHERE id=v_h.supplier_id AND lifecycle_status='approved';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('eligible',false,'reason','supplier_not_approved','interfaceVersion',2);
  END IF;

  SELECT * INTO v_offer
  FROM private.supplier_offers
  WHERE id=v_h.supplier_offer_id AND supplier_id=v_h.supplier_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('eligible',false,'reason','supplier_offer_not_found','interfaceVersion',2);
  END IF;

  IF v_h.provider_key='direct_supplier' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM private.supplier_integration_profiles p
      WHERE p.supplier_id=v_h.supplier_id
        AND p.territory=v_offer.territory
        AND p.capability='returns'
        AND p.status='verified'
        AND p.execution_mode='automated_write'
        AND p.transport IN ('http_rest','graphql')
        AND NULLIF(BTRIM(p.config_ref),'') IS NOT NULL
    ) OR NOT EXISTS (
      SELECT 1
      FROM private.supplier_integration_profiles p
      WHERE p.supplier_id=v_h.supplier_id
        AND p.territory=v_offer.territory
        AND p.capability='reimbursement'
        AND p.status='verified'
        AND p.execution_mode='automated_read'
        AND p.transport IN ('http_rest','graphql','webhook')
        AND (
          p.transport='webhook'
          OR NULLIF(BTRIM(p.config_ref),'') IS NOT NULL
        )
    ) THEN
      RETURN jsonb_build_object('eligible',false,'reason','return_recovery_integration_binding_not_ready','interfaceVersion',2);
    END IF;
    v_provider_key:='direct_supplier';
    v_adapter_version:='1.0.0';
  ELSE
    SELECT * INTO v_adapter
    FROM private.supplier_adapter_registrations a
    WHERE a.supplier_id=v_h.supplier_id
      AND a.status='active'
      AND a.interface_version=1
      AND a.provider_key=v_h.provider_key
      AND a.adapter_version=v_h.adapter_version
      AND a.capabilities @> ARRAY['returns','reimbursement']::text[]
    ORDER BY a.verified_at DESC
    LIMIT 1;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('eligible',false,'reason','return_recovery_adapter_not_ready','interfaceVersion',2);
    END IF;
    v_provider_key:=v_adapter.provider_key;
    v_adapter_version:=v_adapter.adapter_version;
  END IF;

  v_key:='supplier-return:'||p_order_id::text||':'||p_fulfilment_leg_id::text||':'||p_idempotency_key;
  SELECT * INTO v_case
  FROM private.supplier_return_cases
  WHERE idempotency_key=BTRIM(p_idempotency_key)
  FOR UPDATE;

  IF FOUND THEN
    IF v_case.order_id<>p_order_id
       OR v_case.fulfilment_leg_id<>p_fulfilment_leg_id
       OR v_case.reason_code<>BTRIM(p_reason_code)
       OR v_case.requested_quantity<>p_quantity
       OR v_case.correlation_id<>p_correlation_id THEN
      RAISE EXCEPTION 'supplier return idempotency collision with different request';
    END IF;
  ELSE
    INSERT INTO private.supplier_return_cases(
      return_key,order_id,orchestration_id,fulfilment_leg_id,handshake_id,shipment_id,
      supplier_id,supplier_offer_id,external_supplier_order_ref,reason_code,
      requested_quantity,idempotency_key,correlation_id,evidence
    ) VALUES(
      v_key,p_order_id,v_h.orchestration_id,p_fulfilment_leg_id,v_h.id,v_ship.id,
      v_h.supplier_id,v_h.supplier_offer_id,v_h.external_supplier_order_ref,
      BTRIM(p_reason_code),p_quantity,BTRIM(p_idempotency_key),p_correlation_id,
      jsonb_build_object(
        'shipmentStatus',v_ship.canonical_status,
        'createdBy','server_prepare_supplier_return_v1',
        'integrationKit',v_provider_key='direct_supplier'
      )
    )
    RETURNING * INTO v_case;

    INSERT INTO private.supplier_return_recovery_events(
      return_case_id,event_key,event_type,state,evidence
    ) VALUES(
      v_case.id,'return-requested:'||v_case.id::text,'return_requested',v_case.state,'{}'::jsonb
    )
    ON CONFLICT(event_key) DO NOTHING;
  END IF;

  RETURN jsonb_build_object(
    'eligible',true,
    'reason','supplier_return_ready',
    'returnCaseId',v_case.id,
    'orderId',v_case.order_id,
    'fulfilmentLegId',v_case.fulfilment_leg_id,
    'supplierId',v_case.supplier_id,
    'supplierKey',v_supplier.supplier_key,
    'supplierOfferId',v_case.supplier_offer_id,
    'providerKey',v_provider_key,
    'adapterVersion',v_adapter_version,
    'supplierOrderRef',v_case.external_supplier_order_ref,
    'reasonCode',v_case.reason_code,
    'quantity',v_case.requested_quantity,
    'idempotencyKey',v_case.idempotency_key,
    'correlationId',v_case.correlation_id,
    'state',v_case.state,
    'interfaceVersion',2
  );
END;
$$;

REVOKE ALL ON FUNCTION public.server_prepare_supplier_return_v1(uuid,uuid,text,integer,text,uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_prepare_supplier_return_v1(uuid,uuid,text,integer,text,uuid)
  TO service_role;

CREATE OR REPLACE FUNCTION public.server_supplier_recovery_context_v1(
  p_return_case_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_case private.supplier_return_cases%ROWTYPE;
  v_supplier private.supplier_foundation_suppliers%ROWTYPE;
  v_h private.supplier_order_handshakes%ROWTYPE;
  v_leg private.supplier_fulfilment_legs%ROWTYPE;
  v_offer private.supplier_offers%ROWTYPE;
  v_adapter private.supplier_adapter_registrations%ROWTYPE;
  v_control jsonb;
  v_provider_key text;
  v_adapter_version text;
BEGIN
  SELECT * INTO v_case
  FROM private.supplier_return_cases
  WHERE id=p_return_case_id;

  IF NOT FOUND OR v_case.state NOT IN ('authorised','in_transit','received','closed')
     OR v_case.external_return_ref IS NULL THEN
    RETURN jsonb_build_object('eligible',false,'reason','supplier_return_not_authorised','interfaceVersion',2);
  END IF;

  SELECT * INTO v_h FROM private.supplier_order_handshakes WHERE id=v_case.handshake_id;
  IF NOT FOUND OR v_h.state<>'reconciled' OR v_h.external_supplier_order_ref IS NULL THEN
    RETURN jsonb_build_object('eligible',false,'reason','supplier_order_not_reconciled','interfaceVersion',2);
  END IF;

  SELECT * INTO v_leg FROM private.supplier_fulfilment_legs WHERE id=v_case.fulfilment_leg_id;
  IF NOT FOUND OR v_leg.currency IS NULL THEN
    RETURN jsonb_build_object('eligible',false,'reason','recovery_currency_unknown','interfaceVersion',2);
  END IF;
  IF v_leg.currency<>'GBP' THEN
    RETURN jsonb_build_object(
      'eligible',false,'reason','automated_recovery_currency_not_enabled',
      'currency',v_leg.currency,'interfaceVersion',2
    );
  END IF;

  v_control:=public.server_supplier_commerce_control_decision_v1(
    'return_recovery',
    jsonb_build_object(
      'supplierRef',v_case.supplier_id::text,
      'offerRef',v_case.supplier_offer_id::text,
      'territory','GB'
    )
  );
  IF COALESCE((v_control->>'enabled')::boolean,false) IS DISTINCT FROM true THEN
    RETURN jsonb_build_object('eligible',false,'reason','return_recovery_control_disabled','control',v_control,'interfaceVersion',2);
  END IF;

  SELECT * INTO v_supplier
  FROM private.supplier_foundation_suppliers
  WHERE id=v_case.supplier_id AND lifecycle_status='approved';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('eligible',false,'reason','supplier_not_approved','interfaceVersion',2);
  END IF;

  SELECT * INTO v_offer
  FROM private.supplier_offers
  WHERE id=v_case.supplier_offer_id AND supplier_id=v_case.supplier_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('eligible',false,'reason','supplier_offer_not_found','interfaceVersion',2);
  END IF;

  IF v_h.provider_key='direct_supplier' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM private.supplier_integration_profiles p
      WHERE p.supplier_id=v_case.supplier_id
        AND p.territory=v_offer.territory
        AND p.capability='reimbursement'
        AND p.status='verified'
        AND p.execution_mode='automated_read'
        AND p.transport IN ('http_rest','graphql','webhook')
        AND (
          p.transport='webhook'
          OR NULLIF(BTRIM(p.config_ref),'') IS NOT NULL
        )
    ) THEN
      RETURN jsonb_build_object('eligible',false,'reason','reimbursement_integration_binding_not_ready','interfaceVersion',2);
    END IF;
    v_provider_key:='direct_supplier';
    v_adapter_version:='1.0.0';
  ELSE
    SELECT * INTO v_adapter
    FROM private.supplier_adapter_registrations a
    WHERE a.supplier_id=v_case.supplier_id
      AND a.status='active'
      AND a.interface_version=1
      AND a.provider_key=v_h.provider_key
      AND a.adapter_version=v_h.adapter_version
      AND a.capabilities @> ARRAY['reimbursement']::text[]
    ORDER BY a.verified_at DESC
    LIMIT 1;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('eligible',false,'reason','reimbursement_adapter_not_ready','interfaceVersion',2);
    END IF;
    v_provider_key:=v_adapter.provider_key;
    v_adapter_version:=v_adapter.adapter_version;
  END IF;

  RETURN jsonb_build_object(
    'eligible',true,
    'reason','supplier_recovery_ready',
    'returnCaseId',v_case.id,
    'orderId',v_case.order_id,
    'supplierId',v_case.supplier_id,
    'supplierKey',v_supplier.supplier_key,
    'supplierOfferId',v_case.supplier_offer_id,
    'providerKey',v_provider_key,
    'adapterVersion',v_adapter_version,
    'supplierOrderRef',v_case.external_supplier_order_ref,
    'externalReturnRef',v_case.external_return_ref,
    'currency',v_leg.currency,
    'currencyMinorUnitExponent',2,
    'correlationId',v_case.correlation_id,
    'idempotencyKey',v_case.idempotency_key,
    'interfaceVersion',2
  );
END;
$$;

REVOKE ALL ON FUNCTION public.server_supplier_recovery_context_v1(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_supplier_recovery_context_v1(uuid)
  TO service_role;
