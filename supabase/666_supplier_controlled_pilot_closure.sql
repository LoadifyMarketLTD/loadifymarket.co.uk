-- 666_supplier_controlled_pilot_closure.sql
-- Phase O Branch Guard closure.
-- Corrects pilot scope derivation for canonical runtime callers and adds hard
-- order-volume/value + no-fake-pass acceptance guards. Supplier Commerce global
-- remains OFF; this migration does not create or activate a pilot.

ALTER TABLE private.supplier_pilot_programs
  ADD CONSTRAINT supplier_pilot_threshold_value_check CHECK (
    COALESCE((acceptance_thresholds->>'acknowledgementRateMinPct')::numeric,-1) BETWEEN 0 AND 100
    AND COALESCE((acceptance_thresholds->>'oversellMax')::integer,-1) >= 0
  );

CREATE OR REPLACE FUNCTION private.supplier_pilot_control_decision_v1(
  p_operation text,p_scope jsonb
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE
  v_operation text:=lower(BTRIM(COALESCE(p_operation,'')));
  v_supplier_ref text:=NULLIF(BTRIM(p_scope->>'supplierRef'),'');
  v_provider_ref text:=NULLIF(BTRIM(p_scope->>'providerRef'),'');
  v_offer_ref text:=NULLIF(BTRIM(p_scope->>'offerRef'),'');
  v_product_ref text:=NULLIF(BTRIM(p_scope->>'productRef'),'');
  v_territory text:=NULLIF(upper(BTRIM(p_scope->>'territory')),'');
  v_cohort text:=NULLIF(BTRIM(p_scope->>'cohort'),'');
  v_pilot private.supplier_pilot_programs%ROWTYPE;
  v_supplier private.supplier_foundation_suppliers%ROWTYPE;
  v_offer private.supplier_offers%ROWTYPE;
  v_pilot_control private.supplier_commerce_controls%ROWTYPE;
  v_blocker private.supplier_commerce_controls%ROWTYPE;
BEGIN
  SELECT * INTO v_pilot_control FROM private.supplier_commerce_controls
   WHERE operation='pilot' AND scope_type='global' AND scope_ref IS NULL LIMIT 1;
  IF NOT FOUND OR v_pilot_control.enabled IS DISTINCT FROM true THEN
    RETURN jsonb_build_object('enabled',false,'reason','pilot_master_disabled','interfaceVersion',1);
  END IF;

  -- Canonical runtime callers do not all carry the same identity envelope.
  -- Reservation, tracking and return paths carry an approved offer identity,
  -- so derive the supplier only from the exact allowlisted offer when present.
  IF v_offer_ref IS NOT NULL THEN
    SELECT p.* INTO v_pilot
      FROM private.supplier_pilot_programs p
      JOIN private.supplier_foundation_suppliers s ON s.id=p.supplier_id
      JOIN private.supplier_pilot_offers po ON po.pilot_id=p.id
      JOIN private.supplier_offers o ON o.id=po.supplier_offer_id
     WHERE p.status IN ('preparing','active')
       AND v_offer_ref IN (o.id::text,o.offer_key)
       AND o.supplier_id=p.supplier_id
       AND o.territory=p.territory
       AND o.status='approved'
       AND (v_supplier_ref IS NULL OR v_supplier_ref IN (p.supplier_id::text,s.supplier_key))
       AND (v_provider_ref IS NULL OR v_provider_ref=p.provider_key)
       AND (v_cohort IS NULL OR v_cohort=p.cohort_key)
       AND (v_territory IS NULL OR v_territory=p.territory)
     ORDER BY p.created_at DESC LIMIT 1;
  ELSE
    IF v_supplier_ref IS NULL THEN
      RETURN jsonb_build_object('enabled',false,'reason','pilot_supplier_or_offer_scope_required','interfaceVersion',1);
    END IF;
    SELECT p.* INTO v_pilot
      FROM private.supplier_pilot_programs p
      JOIN private.supplier_foundation_suppliers s ON s.id=p.supplier_id
     WHERE p.status IN ('preparing','active')
       AND v_supplier_ref IN (p.supplier_id::text,s.supplier_key)
       AND (v_provider_ref IS NULL OR v_provider_ref=p.provider_key)
       AND (v_cohort IS NULL OR v_cohort=p.cohort_key)
       AND (v_territory IS NULL OR v_territory=p.territory)
     ORDER BY p.created_at DESC LIMIT 1;
  END IF;

  IF v_pilot.id IS NULL THEN
    RETURN jsonb_build_object('enabled',false,'reason','pilot_scope_not_allowlisted','interfaceVersion',1);
  END IF;
  SELECT * INTO v_supplier
    FROM private.supplier_foundation_suppliers
   WHERE id=v_pilot.supplier_id;
  IF v_offer_ref IS NOT NULL THEN
    SELECT o.* INTO v_offer
      FROM private.supplier_pilot_offers po
      JOIN private.supplier_offers o ON o.id=po.supplier_offer_id
     WHERE po.pilot_id=v_pilot.id
       AND v_offer_ref IN (o.id::text,o.offer_key)
       AND o.supplier_id=v_pilot.supplier_id
       AND o.territory=v_pilot.territory
       AND o.status='approved'
     LIMIT 1;
  END IF;

  IF v_pilot.status='preparing' AND v_operation NOT IN ('import','stock_sync','price_sync') THEN
    RETURN jsonb_build_object('enabled',false,'reason','pilot_not_active','pilotId',v_pilot.id,'interfaceVersion',1);
  END IF;

  IF v_operation<>'import' AND v_offer.id IS NULL THEN
    RETURN jsonb_build_object('enabled',false,'reason','pilot_offer_scope_required','pilotId',v_pilot.id,'interfaceVersion',1);
  END IF;
  IF v_offer.id IS NOT NULL AND v_product_ref IS NOT NULL AND v_product_ref<>v_offer.canonical_product_id::text THEN
    RETURN jsonb_build_object('enabled',false,'reason','pilot_product_scope_mismatch','pilotId',v_pilot.id,'interfaceVersion',1);
  END IF;

  SELECT * INTO v_blocker FROM private.supplier_commerce_controls c
   WHERE c.enabled=false AND c.operation IN ('*',v_operation)
     AND (
       (c.scope_type='supplier' AND c.scope_ref IN (v_pilot.supplier_id::text,v_supplier.supplier_key))
       OR (c.scope_type='provider' AND c.scope_ref=v_pilot.provider_key)
       OR (c.scope_type='territory' AND c.scope_ref=v_pilot.territory)
       OR (c.scope_type='cohort' AND c.scope_ref=v_pilot.cohort_key)
       OR (v_offer.id IS NOT NULL AND c.scope_type='offer' AND c.scope_ref IN (v_offer.id::text,v_offer.offer_key))
       OR (v_offer.id IS NOT NULL AND c.scope_type='product' AND c.scope_ref=v_offer.canonical_product_id::text)
     )
   ORDER BY c.updated_at DESC LIMIT 1;
  IF FOUND THEN
    RETURN jsonb_build_object('enabled',false,'reason','scoped_kill_switch','pilotId',v_pilot.id,
      'scopeType',v_blocker.scope_type,'scopeRef',v_blocker.scope_ref,
      'controlVersion',v_blocker.version,'interfaceVersion',1);
  END IF;

  RETURN jsonb_build_object(
    'enabled',true,
    'reason',CASE WHEN v_pilot.status='preparing' THEN 'controlled_pilot_preparation_enabled' ELSE 'controlled_pilot_enabled' END,
    'operation',v_operation,'pilotId',v_pilot.id,'cohort',v_pilot.cohort_key,
    'interfaceVersion',1,'controlVersion',v_pilot_control.version
  );
END;
$$;
REVOKE ALL ON FUNCTION private.supplier_pilot_control_decision_v1(text,jsonb) FROM PUBLIC,anon,authenticated,service_role;

-- Enforce the pilot order ceiling before a supplier reservation can become part
-- of the payment/submission path. Multiple items in the same canonical order do
-- not consume multiple order slots.
CREATE OR REPLACE FUNCTION private.guard_supplier_pilot_reservation_limits_v1()
RETURNS trigger LANGUAGE plpgsql SET search_path TO '' AS $$
DECLARE
  v_pilot private.supplier_pilot_programs%ROWTYPE;
  v_order public.orders%ROWTYPE;
  v_existing_order_count integer:=0;
  v_order_already_seen boolean:=false;
BEGIN
  SELECT p.* INTO v_pilot
    FROM private.supplier_pilot_programs p
    JOIN private.supplier_pilot_offers po ON po.pilot_id=p.id
   WHERE p.status='active' AND po.supplier_offer_id=NEW.supplier_offer_id
   ORDER BY p.activated_at DESC LIMIT 1;
  IF NOT FOUND THEN RETURN NEW; END IF;

  SELECT * INTO v_order FROM public.orders WHERE id=NEW.order_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'controlled pilot canonical order required'; END IF;
  IF COALESCE(round(v_order.total*100)::bigint,0)>v_pilot.maximum_order_value_minor THEN
    RAISE EXCEPTION 'controlled pilot order value ceiling exceeded';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM private.supplier_stock_reservations r
    JOIN private.supplier_pilot_offers po ON po.pilot_id=v_pilot.id AND po.supplier_offer_id=r.supplier_offer_id
    WHERE r.order_id=NEW.order_id AND r.created_at>=v_pilot.activated_at
  ) INTO v_order_already_seen;

  IF NOT v_order_already_seen THEN
    SELECT count(DISTINCT r.order_id)::integer INTO v_existing_order_count
      FROM private.supplier_stock_reservations r
      JOIN private.supplier_pilot_offers po ON po.pilot_id=v_pilot.id AND po.supplier_offer_id=r.supplier_offer_id
     WHERE r.created_at>=v_pilot.activated_at;
    IF v_existing_order_count>=v_pilot.maximum_order_count THEN
      RAISE EXCEPTION 'controlled pilot order volume ceiling reached';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_supplier_pilot_reservation_limits_v1 ON private.supplier_stock_reservations;
CREATE TRIGGER trg_guard_supplier_pilot_reservation_limits_v1
BEFORE INSERT ON private.supplier_stock_reservations
FOR EACH ROW EXECUTE FUNCTION private.guard_supplier_pilot_reservation_limits_v1();

-- Preserve the first real activation timestamp across a kill-switch pause/restart
-- so acceptance evidence cannot be erased by restarting the same pilot.
CREATE OR REPLACE FUNCTION public.server_admin_activate_supplier_pilot_v1(p_actor_id uuid,p_pilot_id uuid,p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE v_pilot private.supplier_pilot_programs%ROWTYPE; v_readiness jsonb;
BEGIN
  PERFORM private.require_active_admin_v1(p_actor_id);
  IF NULLIF(BTRIM(p_reason),'') IS NULL THEN RAISE EXCEPTION 'pilot activation reason required'; END IF;
  SELECT * INTO v_pilot FROM private.supplier_pilot_programs WHERE id=p_pilot_id FOR UPDATE;
  IF NOT FOUND OR v_pilot.status<>'preparing' THEN RAISE EXCEPTION 'pilot must be preparing before activation'; END IF;
  v_readiness:=public.server_supplier_pilot_readiness_v1(v_pilot.id);
  IF COALESCE((v_readiness->>'ready')::boolean,false) IS DISTINCT FROM true THEN
    RETURN jsonb_build_object('ok',false,'reason','pilot_readiness_failed','readiness',v_readiness,'interfaceVersion',1);
  END IF;
  UPDATE private.supplier_pilot_programs
     SET status='active',activated_by=COALESCE(activated_by,p_actor_id),activated_at=COALESCE(activated_at,now()),updated_at=now()
   WHERE id=v_pilot.id;
  PERFORM private.set_supplier_pilot_master_control_v1(p_actor_id,true,'Phase O active controlled pilot: '||BTRIM(p_reason));
  INSERT INTO private.supplier_pilot_audit(pilot_id,actor_id,action,previous_status,new_status,evidence)
  VALUES(v_pilot.id,p_actor_id,'activate','preparing','active',jsonb_build_object('reason',BTRIM(p_reason),'readiness',v_readiness));
  RETURN jsonb_build_object('ok',true,'pilotId',v_pilot.id,'status','active','globalSupplierCommerceEnabled',false,
    'readiness',v_readiness,'interfaceVersion',1);
END;
$$;
REVOKE ALL ON FUNCTION public.server_admin_activate_supplier_pilot_v1(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.server_admin_activate_supplier_pilot_v1(uuid,uuid,text) TO service_role;

CREATE OR REPLACE FUNCTION public.server_supplier_pilot_acceptance_v1(p_pilot_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE
  v_pilot private.supplier_pilot_programs%ROWTYPE;
  v_orders integer:=0; v_acks integer:=0; v_delivered integer:=0; v_tracking integer:=0;
  v_returns integer:=0; v_refunds integer:=0; v_recoveries integer:=0; v_reconciled integer:=0;
  v_over_value integer:=0; v_duplicate_submit integer:=0; v_oversell integer:=0; v_critical integer:=0;
  v_ack_rate numeric:=0; v_ack_min numeric:=0; v_duplicate_max integer:=0; v_oversell_max integer:=0;
  v_financial_max integer:=0; v_critical_max integer:=0; v_failures jsonb:='[]'::jsonb;
BEGIN
  SELECT * INTO v_pilot FROM private.supplier_pilot_programs WHERE id=p_pilot_id;
  IF NOT FOUND OR v_pilot.activated_at IS NULL THEN
    RETURN jsonb_build_object('passed',false,'reason','pilot_not_activated','interfaceVersion',1);
  END IF;

  v_ack_min:=(v_pilot.acceptance_thresholds->>'acknowledgementRateMinPct')::numeric;
  v_duplicate_max:=(v_pilot.acceptance_thresholds->>'duplicateSideEffectsMax')::integer;
  v_oversell_max:=(v_pilot.acceptance_thresholds->>'oversellMax')::integer;
  v_financial_max:=(v_pilot.acceptance_thresholds->>'unreconciledFinancialExceptionsMax')::integer;
  v_critical_max:=(v_pilot.acceptance_thresholds->>'criticalIncidentMax')::integer;

  SELECT count(DISTINCT h.order_id),
         count(DISTINCT h.order_id) FILTER(WHERE h.state='reconciled' AND h.acknowledgement_state='accepted')
    INTO v_orders,v_acks
    FROM private.supplier_order_handshakes h
    JOIN private.supplier_pilot_offers po ON po.pilot_id=v_pilot.id AND po.supplier_offer_id=h.supplier_offer_id
   WHERE h.supplier_id=v_pilot.supplier_id AND h.provider_key=v_pilot.provider_key AND h.created_at>=v_pilot.activated_at;
  IF v_orders>0 THEN v_ack_rate:=round((v_acks::numeric/v_orders::numeric)*100,3); END IF;

  SELECT count(DISTINCT h.order_id)::integer INTO v_over_value
    FROM private.supplier_order_handshakes h
    JOIN private.supplier_pilot_offers po ON po.pilot_id=v_pilot.id AND po.supplier_offer_id=h.supplier_offer_id
    JOIN public.orders o ON o.id=h.order_id
   WHERE h.created_at>=v_pilot.activated_at AND round(o.total*100)::bigint>v_pilot.maximum_order_value_minor;

  SELECT count(DISTINCT s.order_id)::integer INTO v_delivered
    FROM private.supplier_leg_shipments s
    JOIN private.supplier_order_handshakes h ON h.id=s.handshake_id
    JOIN private.supplier_pilot_offers po ON po.pilot_id=v_pilot.id AND po.supplier_offer_id=h.supplier_offer_id
   WHERE s.supplier_id=v_pilot.supplier_id AND s.provider_key=v_pilot.provider_key
     AND s.canonical_status='delivered' AND s.created_at>=v_pilot.activated_at;

  SELECT count(*)::integer INTO v_tracking
    FROM private.supplier_tracking_events e
    JOIN private.supplier_leg_shipments s ON s.id=e.shipment_id
    JOIN private.supplier_order_handshakes h ON h.id=s.handshake_id
    JOIN private.supplier_pilot_offers po ON po.pilot_id=v_pilot.id AND po.supplier_offer_id=h.supplier_offer_id
   WHERE e.occurred_at>=v_pilot.activated_at;

  SELECT count(DISTINCT r.order_id)::integer INTO v_returns
    FROM private.supplier_return_cases r
    JOIN private.supplier_pilot_offers po ON po.pilot_id=v_pilot.id AND po.supplier_offer_id=r.supplier_offer_id
   WHERE r.supplier_id=v_pilot.supplier_id AND r.requested_at>=v_pilot.activated_at;

  SELECT count(DISTINCT e.order_id)::integer INTO v_refunds
    FROM private.supplier_customer_refund_evidence e
    JOIN private.supplier_return_cases r ON r.id=e.return_case_id
    JOIN private.supplier_pilot_offers po ON po.pilot_id=v_pilot.id AND po.supplier_offer_id=r.supplier_offer_id
   WHERE e.state IN ('partial','succeeded') AND e.occurred_at>=v_pilot.activated_at;

  SELECT count(DISTINCT e.order_id)::integer INTO v_recoveries
    FROM private.supplier_recovery_evidence e
   WHERE e.supplier_id=v_pilot.supplier_id AND e.state IN ('partial','recovered') AND e.occurred_at>=v_pilot.activated_at
     AND EXISTS(
       SELECT 1 FROM private.supplier_order_handshakes h
       JOIN private.supplier_pilot_offers po ON po.pilot_id=v_pilot.id AND po.supplier_offer_id=h.supplier_offer_id
       WHERE h.order_id=e.order_id AND h.supplier_id=v_pilot.supplier_id
     );

  SELECT count(DISTINCT h.order_id)::integer INTO v_reconciled
    FROM private.supplier_order_handshakes h
    JOIN private.supplier_pilot_offers po ON po.pilot_id=v_pilot.id AND po.supplier_offer_id=h.supplier_offer_id
   WHERE h.created_at>=v_pilot.activated_at
     AND EXISTS(
       SELECT 1 FROM private.supplier_financial_reconciliations f
        WHERE f.order_id=h.order_id AND f.state='reconciled' AND COALESCE(abs(f.unrecovered_loss),0)=0
     );

  SELECT count(*)::integer INTO v_duplicate_submit
    FROM private.supplier_order_exceptions x
   WHERE x.exception_type='duplicate_submit' AND x.opened_at>=v_pilot.activated_at
     AND EXISTS(
       SELECT 1 FROM private.supplier_order_handshakes h
       JOIN private.supplier_pilot_offers po ON po.pilot_id=v_pilot.id AND po.supplier_offer_id=h.supplier_offer_id
       WHERE h.order_id=x.order_id
     );

  SELECT count(*)::integer INTO v_oversell
    FROM private.supplier_order_exceptions x
   WHERE x.exception_type='stock_disappeared' AND x.opened_at>=v_pilot.activated_at
     AND EXISTS(
       SELECT 1 FROM private.supplier_order_handshakes h
       JOIN private.supplier_pilot_offers po ON po.pilot_id=v_pilot.id AND po.supplier_offer_id=h.supplier_offer_id
       WHERE h.order_id=x.order_id
     );

  SELECT count(*)::integer INTO v_critical
    FROM private.supplier_commerce_incidents i
   WHERE i.severity='critical' AND i.status NOT IN ('resolved','closed')
     AND i.supplier_ref IN (
       v_pilot.supplier_id::text,
       (SELECT supplier_key FROM private.supplier_foundation_suppliers WHERE id=v_pilot.supplier_id)
     );

  IF v_orders=0 THEN v_failures:=v_failures||jsonb_build_array(jsonb_build_object('check','real_orders','reason','no_real_pilot_orders')); END IF;
  IF v_orders>v_pilot.maximum_order_count THEN v_failures:=v_failures||jsonb_build_array(jsonb_build_object('check','order_volume_limit','orders',v_orders,'maximum',v_pilot.maximum_order_count)); END IF;
  IF v_over_value>0 THEN v_failures:=v_failures||jsonb_build_array(jsonb_build_object('check','order_value_limit','violations',v_over_value,'maximumOrderValueMinor',v_pilot.maximum_order_value_minor)); END IF;
  IF v_ack_rate<v_ack_min THEN v_failures:=v_failures||jsonb_build_array(jsonb_build_object('check','acknowledgement_rate','actualPct',v_ack_rate,'minimumPct',v_ack_min)); END IF;
  IF v_duplicate_submit>v_duplicate_max THEN v_failures:=v_failures||jsonb_build_array(jsonb_build_object('check','duplicate_side_effects','duplicateSubmitExceptions',v_duplicate_submit,'maximum',v_duplicate_max)); END IF;
  IF v_oversell>v_oversell_max THEN v_failures:=v_failures||jsonb_build_array(jsonb_build_object('check','oversell','stockDisappearedExceptions',v_oversell,'maximum',v_oversell_max)); END IF;
  IF v_delivered=0 THEN v_failures:=v_failures||jsonb_build_array(jsonb_build_object('check','delivery','reason','no_delivered_pilot_order')); END IF;
  IF v_tracking=0 THEN v_failures:=v_failures||jsonb_build_array(jsonb_build_object('check','tracking','reason','no_real_tracking_event')); END IF;
  IF v_returns=0 OR v_refunds=0 OR v_recoveries=0 THEN v_failures:=v_failures||jsonb_build_array(jsonb_build_object('check','return_refund_recovery','returns',v_returns,'refunds',v_refunds,'recoveries',v_recoveries)); END IF;
  IF (v_orders-v_reconciled)>v_financial_max THEN v_failures:=v_failures||jsonb_build_array(jsonb_build_object('check','financial_reconciliation','reconciledOrders',v_reconciled,'pilotOrders',v_orders,'maximumUnreconciled',v_financial_max)); END IF;
  IF v_critical>v_critical_max THEN v_failures:=v_failures||jsonb_build_array(jsonb_build_object('check','critical_incidents','open',v_critical,'maximum',v_critical_max)); END IF;

  IF NOT EXISTS(SELECT 1 FROM private.supplier_pilot_evidence e WHERE e.pilot_id=v_pilot.id AND e.evidence_type='buyer_communication') THEN
    v_failures:=v_failures||jsonb_build_array(jsonb_build_object('check','buyer_communication','reason','evidence_missing'));
  END IF;
  IF NOT EXISTS(SELECT 1 FROM private.supplier_pilot_evidence e WHERE e.pilot_id=v_pilot.id AND e.evidence_type='operator_escalation') THEN
    v_failures:=v_failures||jsonb_build_array(jsonb_build_object('check','operator_escalation','reason','evidence_missing'));
  END IF;
  IF NOT EXISTS(SELECT 1 FROM private.supplier_pilot_evidence e WHERE e.pilot_id=v_pilot.id AND e.evidence_type='kill_switch_test') THEN
    v_failures:=v_failures||jsonb_build_array(jsonb_build_object('check','kill_switch_test','reason','evidence_missing'));
  END IF;
  IF NOT EXISTS(
    SELECT 1 FROM private.supplier_commerce_control_audit a
     WHERE a.operation='pilot' AND a.scope_type='global' AND a.new_enabled=false AND a.created_at>=v_pilot.activated_at
  ) THEN v_failures:=v_failures||jsonb_build_array(jsonb_build_object('check','kill_switch_control_audit','reason','real_disable_transition_missing')); END IF;

  RETURN jsonb_build_object(
    'passed',jsonb_array_length(v_failures)=0,
    'reason',CASE WHEN jsonb_array_length(v_failures)=0 THEN 'controlled_pilot_pass' ELSE 'controlled_pilot_evidence_incomplete' END,
    'pilotId',v_pilot.id,'orders',v_orders,'acknowledgedOrders',v_acks,'acknowledgementRatePct',v_ack_rate,
    'deliveredOrders',v_delivered,'trackingEvents',v_tracking,'returnOrders',v_returns,'refundOrders',v_refunds,
    'recoveryOrders',v_recoveries,'reconciledOrders',v_reconciled,'orderValueViolations',v_over_value,
    'duplicateSubmitExceptions',v_duplicate_submit,'oversellExceptions',v_oversell,'openCriticalIncidents',v_critical,
    'failures',v_failures,'simulatorPassIsNotPilotPass',true,'interfaceVersion',1
  );
END;
$$;
REVOKE ALL ON FUNCTION public.server_supplier_pilot_acceptance_v1(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.server_supplier_pilot_acceptance_v1(uuid) TO service_role;

COMMENT ON FUNCTION private.guard_supplier_pilot_reservation_limits_v1() IS 'Phase O hard pre-payment-path reservation ceiling for the active controlled pilot.';
COMMENT ON FUNCTION private.supplier_pilot_control_decision_v1(text,jsonb) IS 'Phase O fail-closed scoped control gate. Exact allowlisted offer identity may derive the supplier for canonical callers that do not carry supplierRef.';
