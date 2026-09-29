-- Verified manual supplier order acceptance for controlled Phase O pilots.
-- This records operator evidence only. It never calls a supplier provider and never performs payment mutations.

CREATE OR REPLACE FUNCTION public.server_record_manual_supplier_order_acceptance_v1(
  p_actor_id uuid,
  p_handshake_id uuid,
  p_external_supplier_order_ref text,
  p_evidence jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_h private.supplier_order_handshakes%ROWTYPE;
  v_offer private.supplier_offers%ROWTYPE;
  v_actor public.users%ROWTYPE;
  v_external text:=NULLIF(BTRIM(COALESCE(p_external_supplier_order_ref,'')),'');
  v_previous text;
BEGIN
  SELECT * INTO v_actor FROM public.users WHERE id=p_actor_id;
  IF NOT FOUND OR v_actor.role<>'admin' OR v_actor."isActive" IS DISTINCT FROM true THEN
    RETURN jsonb_build_object('ok',false,'reason','active_admin_required','interfaceVersion',1);
  END IF;
  IF v_external IS NULL THEN
    RETURN jsonb_build_object('ok',false,'reason','external_supplier_order_ref_required','interfaceVersion',1);
  END IF;
  IF p_evidence IS NULL OR jsonb_typeof(p_evidence)<>'object' OR p_evidence='{}'::jsonb THEN
    RETURN jsonb_build_object('ok',false,'reason','manual_supplier_order_evidence_required','interfaceVersion',1);
  END IF;

  SELECT * INTO v_h FROM private.supplier_order_handshakes WHERE id=p_handshake_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'reason','handshake_not_found','interfaceVersion',1); END IF;
  IF v_h.provider_key<>'direct_supplier' THEN
    RETURN jsonb_build_object('ok',false,'reason','manual_acceptance_requires_direct_supplier','interfaceVersion',1);
  END IF;
  IF v_h.state IN ('accepted','reconciled') THEN
    IF v_h.external_supplier_order_ref IS DISTINCT FROM v_external THEN
      RAISE EXCEPTION 'manual supplier order reference cannot change';
    END IF;
    RETURN jsonb_build_object('ok',true,'reason','manual_supplier_order_already_accepted','handshakeId',v_h.id,'externalSupplierOrderRef',v_external,'interfaceVersion',1);
  END IF;
  IF v_h.state NOT IN ('prepared','pending','reconciliation_required') THEN
    RETURN jsonb_build_object('ok',false,'reason','manual_supplier_order_state_not_acceptable','state',v_h.state,'interfaceVersion',1);
  END IF;

  SELECT * INTO v_offer FROM private.supplier_offers WHERE id=v_h.supplier_offer_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'reason','supplier_offer_not_found','interfaceVersion',1); END IF;

  IF NOT EXISTS (
    SELECT 1 FROM private.supplier_integration_profiles p
    WHERE p.supplier_id=v_h.supplier_id
      AND p.territory=v_offer.territory
      AND p.capability='order_submission'
      AND p.status='verified'
      AND p.execution_mode='manual_only'
      AND p.transport IN ('email','manual_portal','manual_file')
      AND NULLIF(BTRIM(p.contract_ref),'') IS NOT NULL
  ) OR NOT EXISTS (
    SELECT 1 FROM private.supplier_integration_profiles p
    WHERE p.supplier_id=v_h.supplier_id
      AND p.territory=v_offer.territory
      AND p.capability='acknowledgement'
      AND p.status='verified'
      AND p.execution_mode='manual_only'
      AND p.transport IN ('email','manual_portal','manual_file')
      AND NULLIF(BTRIM(p.contract_ref),'') IS NOT NULL
  ) THEN
    RETURN jsonb_build_object('ok',false,'reason','verified_manual_order_and_ack_bindings_required','interfaceVersion',1);
  END IF;

  IF v_h.external_supplier_order_ref IS NOT NULL AND v_h.external_supplier_order_ref<>v_external THEN
    RAISE EXCEPTION 'external supplier order reference cannot change';
  END IF;

  v_previous:=v_h.state;
  UPDATE private.supplier_order_handshakes SET
    state='accepted',
    acknowledgement_state='accepted',
    recovery_state='reconcile',
    external_supplier_order_ref=COALESCE(external_supplier_order_ref,v_external),
    acknowledged_at=COALESCE(acknowledged_at,now()),
    last_checked_at=now(),
    updated_at=now()
  WHERE id=v_h.id
  RETURNING * INTO v_h;

  UPDATE private.supplier_fulfilment_legs
    SET status='supplier_accepted',updated_at=now()
    WHERE id=v_h.fulfilment_leg_id;
  UPDATE private.supplier_order_orchestrations
    SET state='supplier_accepted',updated_at=now()
    WHERE id=v_h.orchestration_id;
  UPDATE private.supplier_stock_reservations
    SET status='consumed',consumed_at=COALESCE(consumed_at,now())
    WHERE id=v_h.reservation_id AND status='active';

  INSERT INTO private.supplier_order_handshake_events(
    handshake_id,event_key,event,previous_state,new_state,result_class,external_supplier_order_ref,recovery_state,reason,metadata
  ) VALUES(
    v_h.id,'manual-accept:'||v_h.id::text,'manual_review',v_previous,'accepted','SUCCESS',v_external,'reconcile',
    'manual_supplier_order_acceptance_recorded',
    jsonb_build_object('actorId',p_actor_id,'evidence',p_evidence,'providerMutationPerformed',false)
  ) ON CONFLICT(event_key) DO NOTHING;

  RETURN jsonb_build_object(
    'ok',true,'reason','manual_supplier_order_acceptance_recorded','handshakeId',v_h.id,
    'orderId',v_h.order_id,'externalSupplierOrderRef',v_external,'state','accepted',
    'providerMutationPerformed',false,'paymentMutationPerformed',false,'interfaceVersion',1
  );
END;
$$;

REVOKE ALL ON FUNCTION public.server_record_manual_supplier_order_acceptance_v1(uuid,uuid,text,jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_record_manual_supplier_order_acceptance_v1(uuid,uuid,text,jsonb)
  TO service_role;

COMMENT ON FUNCTION public.server_record_manual_supplier_order_acceptance_v1(uuid,uuid,text,jsonb) IS
  'Phase O manual Direct Supplier order acceptance. Requires active admin plus verified manual order/ack bindings and immutable evidence. Performs no provider or payment mutation.';
