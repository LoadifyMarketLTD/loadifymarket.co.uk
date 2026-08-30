-- 668_supplier_controlled_pilot_cohort_evidence_closure.sql
-- Phase O Branch Guard closure.
-- Adds an explicit buyer cohort boundary, requires real Phase N simulator evidence,
-- fixes reconciliation state casing, and makes return/refund/recovery acceptance conditional
-- on a real return rather than forcing artificial customer financial side effects.
-- No pilot is created or activated by this migration. Global Supplier Commerce remains OFF.

ALTER TABLE private.supplier_pilot_programs
  ALTER COLUMN minimum_product_count SET DEFAULT 1;

CREATE TABLE IF NOT EXISTS private.supplier_pilot_cohort_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pilot_id uuid NOT NULL REFERENCES private.supplier_pilot_programs(id) ON DELETE RESTRICT,
  buyer_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  evidence jsonb NOT NULL,
  added_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  added_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplier_pilot_cohort_evidence_check CHECK (
    jsonb_typeof(evidence)='object' AND evidence<>'{}'::jsonb
  ),
  UNIQUE(pilot_id,buyer_id)
);
CREATE INDEX IF NOT EXISTS supplier_pilot_cohort_lookup_idx
  ON private.supplier_pilot_cohort_members(pilot_id,buyer_id);
REVOKE ALL ON TABLE private.supplier_pilot_cohort_members FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION private.guard_supplier_pilot_cohort_history_v1()
RETURNS trigger LANGUAGE plpgsql SET search_path TO '' AS $$
BEGIN
  RAISE EXCEPTION 'controlled pilot cohort membership is append-only';
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_supplier_pilot_cohort_immutable_v1 ON private.supplier_pilot_cohort_members;
CREATE TRIGGER trg_guard_supplier_pilot_cohort_immutable_v1
BEFORE UPDATE OR DELETE ON private.supplier_pilot_cohort_members
FOR EACH ROW EXECUTE FUNCTION private.guard_supplier_pilot_cohort_history_v1();

ALTER TABLE private.supplier_pilot_evidence
  DROP CONSTRAINT IF EXISTS supplier_pilot_evidence_type_check;
ALTER TABLE private.supplier_pilot_evidence
  ADD CONSTRAINT supplier_pilot_evidence_type_check CHECK (
    evidence_type IN (
      'buyer_communication','kill_switch_test','operator_escalation','incident_review','pilot_note',
      'rollback_recovery_test','incident_path_test','release_snapshot','duplicate_side_effect_review'
    )
  );
ALTER TABLE private.supplier_pilot_evidence
  ADD CONSTRAINT supplier_pilot_release_snapshot_shape_check CHECK (
    evidence_type<>'release_snapshot' OR (
      evidence ? 'mainSha'
      AND evidence ? 'migrationHead'
      AND evidence ? 'controlState'
      AND evidence ? 'pilotControlVersion'
      AND COALESCE(evidence->>'mainSha','') ~ '^[0-9a-f]{40}$'
      AND NULLIF(BTRIM(evidence->>'migrationHead'),'') IS NOT NULL
      AND jsonb_typeof(evidence->'controlState')='object'
      AND COALESCE((evidence->>'pilotControlVersion')::integer,0)>0
    )
  );

CREATE OR REPLACE FUNCTION public.server_admin_add_supplier_pilot_cohort_member_v1(
  p_actor_id uuid,p_pilot_id uuid,p_buyer_id uuid,p_evidence jsonb
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE
  v_pilot private.supplier_pilot_programs%ROWTYPE;
  v_existing private.supplier_pilot_cohort_members%ROWTYPE;
  v_id uuid;
BEGIN
  PERFORM private.require_active_admin_v1(p_actor_id);
  SELECT * INTO v_pilot FROM private.supplier_pilot_programs WHERE id=p_pilot_id FOR UPDATE;
  IF NOT FOUND OR v_pilot.status NOT IN ('draft','preparing') THEN
    RAISE EXCEPTION 'pilot cohort is mutable only before activation';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.users u WHERE u.id=p_buyer_id) THEN
    RAISE EXCEPTION 'pilot cohort buyer must exist';
  END IF;
  IF jsonb_typeof(COALESCE(p_evidence,'{}'::jsonb))<>'object' OR COALESCE(p_evidence,'{}'::jsonb)='{}'::jsonb THEN
    RAISE EXCEPTION 'pilot cohort membership evidence required';
  END IF;

  SELECT * INTO v_existing FROM private.supplier_pilot_cohort_members
   WHERE pilot_id=p_pilot_id AND buyer_id=p_buyer_id;
  IF FOUND THEN
    IF v_existing.evidence IS DISTINCT FROM p_evidence THEN
      RAISE EXCEPTION 'pilot cohort membership idempotency collision';
    END IF;
    RETURN v_existing.id;
  END IF;

  INSERT INTO private.supplier_pilot_cohort_members(pilot_id,buyer_id,evidence,added_by)
  VALUES(p_pilot_id,p_buyer_id,p_evidence,p_actor_id)
  RETURNING id INTO v_id;
  INSERT INTO private.supplier_pilot_audit(pilot_id,actor_id,action,new_status,evidence)
  VALUES(p_pilot_id,p_actor_id,'add_cohort_member',v_pilot.status,
    jsonb_build_object('buyerId',p_buyer_id,'membershipEvidence',p_evidence));
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.server_admin_add_supplier_pilot_cohort_member_v1(uuid,uuid,uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.server_admin_add_supplier_pilot_cohort_member_v1(uuid,uuid,uuid,jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.server_admin_add_supplier_pilot_offer_v1(
  p_actor_id uuid,p_pilot_id uuid,p_supplier_offer_id uuid,p_external_variant_ref text,p_selection_evidence jsonb
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE
  v_pilot private.supplier_pilot_programs%ROWTYPE;
  v_offer private.supplier_offers%ROWTYPE;
  v_existing private.supplier_pilot_offers%ROWTYPE;
  v_id uuid;
  v_count integer;
  v_variant text:=BTRIM(COALESCE(p_external_variant_ref,''));
BEGIN
  PERFORM private.require_active_admin_v1(p_actor_id);
  SELECT * INTO v_pilot FROM private.supplier_pilot_programs WHERE id=p_pilot_id FOR UPDATE;
  IF NOT FOUND OR v_pilot.status NOT IN ('draft','preparing') THEN
    RAISE EXCEPTION 'pilot offer set is mutable only before activation';
  END IF;
  SELECT * INTO v_offer FROM private.supplier_offers
   WHERE id=p_supplier_offer_id AND supplier_id=v_pilot.supplier_id AND territory='GB' AND status='approved';
  IF NOT FOUND THEN RAISE EXCEPTION 'approved GB supplier offer for pilot supplier required'; END IF;
  IF NOT EXISTS(SELECT 1 FROM private.canonical_products p WHERE p.id=v_offer.canonical_product_id AND p.status='active') THEN
    RAISE EXCEPTION 'active canonical product required';
  END IF;
  IF jsonb_typeof(COALESCE(p_selection_evidence,'{}'::jsonb))<>'object' OR COALESCE(p_selection_evidence,'{}'::jsonb)='{}'::jsonb THEN
    RAISE EXCEPTION 'low-risk product selection evidence required';
  END IF;

  SELECT * INTO v_existing FROM private.supplier_pilot_offers
   WHERE pilot_id=p_pilot_id AND supplier_offer_id=p_supplier_offer_id AND external_variant_ref=v_variant;
  IF FOUND THEN
    IF v_existing.selection_evidence IS DISTINCT FROM p_selection_evidence THEN
      RAISE EXCEPTION 'pilot offer idempotency collision';
    END IF;
    RETURN v_existing.id;
  END IF;

  SELECT count(*) INTO v_count FROM private.supplier_pilot_offers WHERE pilot_id=p_pilot_id;
  IF v_count>=v_pilot.maximum_product_count THEN RAISE EXCEPTION 'pilot product ceiling reached'; END IF;
  INSERT INTO private.supplier_pilot_offers(
    pilot_id,supplier_offer_id,external_variant_ref,selection_evidence,approved_by
  ) VALUES(
    p_pilot_id,p_supplier_offer_id,v_variant,p_selection_evidence,p_actor_id
  ) RETURNING id INTO v_id;
  INSERT INTO private.supplier_pilot_audit(pilot_id,actor_id,action,new_status,evidence)
  VALUES(p_pilot_id,p_actor_id,'add_offer',v_pilot.status,
    jsonb_build_object('supplierOfferId',p_supplier_offer_id,'variantRef',v_variant));
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.server_admin_add_supplier_pilot_offer_v1(uuid,uuid,uuid,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.server_admin_add_supplier_pilot_offer_v1(uuid,uuid,uuid,text,jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.server_supplier_pilot_activation_readiness_v1(p_pilot_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE
  v_pilot private.supplier_pilot_programs%ROWTYPE;
  v_core jsonb;
  v_control private.supplier_commerce_controls%ROWTYPE;
  v_cohort_count integer:=0;
  v_other_global_enabled integer:=0;
  v_failures jsonb:='[]'::jsonb;
BEGIN
  SELECT * INTO v_pilot FROM private.supplier_pilot_programs WHERE id=p_pilot_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ready',false,'reason','pilot_not_found','interfaceVersion',1); END IF;

  v_core:=public.server_supplier_pilot_readiness_v1(p_pilot_id);
  IF COALESCE((v_core->>'ready')::boolean,false) IS DISTINCT FROM true THEN
    v_failures:=v_failures||jsonb_build_array(jsonb_build_object('check','core_readiness','detail',v_core));
  END IF;

  IF NOT EXISTS(
    SELECT 1 FROM private.supplier_simulator_validation_runs r
     WHERE r.status='passed' AND v_pilot.simulator_evidence_ref IN (r.id::text,r.run_key)
  ) THEN
    v_failures:=v_failures||jsonb_build_array(jsonb_build_object(
      'check','real_simulator_evidence','reason','passed_phase_n_simulator_run_not_found',
      'simulatorEvidenceRef',v_pilot.simulator_evidence_ref
    ));
  END IF;

  SELECT count(*)::integer INTO v_cohort_count
    FROM private.supplier_pilot_cohort_members m WHERE m.pilot_id=v_pilot.id;
  IF v_cohort_count=0 THEN
    v_failures:=v_failures||jsonb_build_array(jsonb_build_object(
      'check','pilot_cohort','reason','explicit_buyer_cohort_missing'
    ));
  END IF;

  SELECT * INTO v_control FROM private.supplier_commerce_controls
   WHERE operation='pilot' AND scope_type='global' AND scope_ref IS NULL LIMIT 1;
  IF NOT FOUND OR v_control.enabled IS DISTINCT FROM true THEN
    v_failures:=v_failures||jsonb_build_array(jsonb_build_object(
      'check','pilot_master_control','reason','pilot_master_disabled'
    ));
  END IF;

  SELECT count(*)::integer INTO v_other_global_enabled
    FROM private.supplier_commerce_controls c
   WHERE c.scope_type='global' AND c.scope_ref IS NULL
     AND c.operation<>'pilot' AND c.enabled=true;
  IF v_other_global_enabled>0 THEN
    v_failures:=v_failures||jsonb_build_array(jsonb_build_object(
      'check','global_activation_guard','reason','non_pilot_global_supplier_commerce_control_enabled',
      'enabledCount',v_other_global_enabled
    ));
  END IF;

  RETURN jsonb_build_object(
    'ready',jsonb_array_length(v_failures)=0,
    'reason',CASE WHEN jsonb_array_length(v_failures)=0 THEN 'controlled_pilot_activation_ready' ELSE 'controlled_pilot_activation_not_ready' END,
    'pilotId',v_pilot.id,'cohortMemberCount',v_cohort_count,'coreReadiness',v_core,
    'failures',v_failures,'simulatorPassIsNotPilotPass',true,'interfaceVersion',1
  );
END;
$$;
REVOKE ALL ON FUNCTION public.server_supplier_pilot_activation_readiness_v1(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.server_supplier_pilot_activation_readiness_v1(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.server_admin_activate_supplier_pilot_v1(p_actor_id uuid,p_pilot_id uuid,p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE v_pilot private.supplier_pilot_programs%ROWTYPE; v_readiness jsonb;
BEGIN
  PERFORM private.require_active_admin_v1(p_actor_id);
  IF NULLIF(BTRIM(p_reason),'') IS NULL THEN RAISE EXCEPTION 'pilot activation reason required'; END IF;
  SELECT * INTO v_pilot FROM private.supplier_pilot_programs WHERE id=p_pilot_id FOR UPDATE;
  IF NOT FOUND OR v_pilot.status<>'preparing' THEN RAISE EXCEPTION 'pilot must be preparing before activation'; END IF;
  v_readiness:=public.server_supplier_pilot_activation_readiness_v1(v_pilot.id);
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

CREATE OR REPLACE FUNCTION private.guard_supplier_pilot_cohort_reservation_v1()
RETURNS trigger LANGUAGE plpgsql SET search_path TO '' AS $$
DECLARE
  v_pilot_id uuid;
  v_buyer_id uuid;
BEGIN
  SELECT p.id INTO v_pilot_id
    FROM private.supplier_pilot_programs p
    JOIN private.supplier_pilot_offers po ON po.pilot_id=p.id
   WHERE p.status='active' AND po.supplier_offer_id=NEW.supplier_offer_id
   ORDER BY p.activated_at DESC LIMIT 1;
  IF NOT FOUND THEN RETURN NEW; END IF;

  SELECT o."buyerId" INTO v_buyer_id FROM public.orders o WHERE o.id=NEW.order_id;
  IF v_buyer_id IS NULL OR NOT EXISTS(
    SELECT 1 FROM private.supplier_pilot_cohort_members m
     WHERE m.pilot_id=v_pilot_id AND m.buyer_id=v_buyer_id
  ) THEN
    RAISE EXCEPTION 'controlled pilot buyer outside explicit cohort';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_supplier_pilot_cohort_reservation_v1 ON private.supplier_stock_reservations;
CREATE TRIGGER trg_guard_supplier_pilot_cohort_reservation_v1
BEFORE INSERT ON private.supplier_stock_reservations
FOR EACH ROW EXECUTE FUNCTION private.guard_supplier_pilot_cohort_reservation_v1();

CREATE OR REPLACE FUNCTION public.server_supplier_pilot_acceptance_v1(p_pilot_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE
  v_pilot private.supplier_pilot_programs%ROWTYPE;
  v_orders integer:=0; v_acks integer:=0; v_delivered integer:=0; v_tracking integer:=0;
  v_returns integer:=0; v_refunds integer:=0; v_recoveries integer:=0; v_return_incomplete integer:=0;
  v_reconciled integer:=0; v_outside_cohort integer:=0;
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

  SELECT count(DISTINCT h.order_id)::integer INTO v_outside_cohort
    FROM private.supplier_order_handshakes h
    JOIN private.supplier_pilot_offers po ON po.pilot_id=v_pilot.id AND po.supplier_offer_id=h.supplier_offer_id
    JOIN public.orders o ON o.id=h.order_id
   WHERE h.created_at>=v_pilot.activated_at
     AND NOT EXISTS(
       SELECT 1 FROM private.supplier_pilot_cohort_members m
        WHERE m.pilot_id=v_pilot.id AND m.buyer_id=o."buyerId"
     );

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

  SELECT count(*)::integer INTO v_returns
    FROM private.supplier_return_cases r
    JOIN private.supplier_pilot_offers po ON po.pilot_id=v_pilot.id AND po.supplier_offer_id=r.supplier_offer_id
   WHERE r.supplier_id=v_pilot.supplier_id AND r.requested_at>=v_pilot.activated_at;

  SELECT count(DISTINCT e.return_case_id)::integer INTO v_refunds
    FROM private.supplier_customer_refund_evidence e
    JOIN private.supplier_return_cases r ON r.id=e.return_case_id
    JOIN private.supplier_pilot_offers po ON po.pilot_id=v_pilot.id AND po.supplier_offer_id=r.supplier_offer_id
   WHERE e.state='succeeded' AND e.occurred_at>=v_pilot.activated_at;

  SELECT count(DISTINCT e.return_case_id)::integer INTO v_recoveries
    FROM private.supplier_recovery_evidence e
    JOIN private.supplier_return_cases r ON r.id=e.return_case_id
    JOIN private.supplier_pilot_offers po ON po.pilot_id=v_pilot.id AND po.supplier_offer_id=r.supplier_offer_id
   WHERE e.supplier_id=v_pilot.supplier_id AND e.state='recovered' AND e.occurred_at>=v_pilot.activated_at;

  SELECT count(*)::integer INTO v_return_incomplete
    FROM private.supplier_return_cases r
    JOIN private.supplier_pilot_offers po ON po.pilot_id=v_pilot.id AND po.supplier_offer_id=r.supplier_offer_id
   WHERE r.supplier_id=v_pilot.supplier_id AND r.requested_at>=v_pilot.activated_at
     AND r.state<>'cancelled'
     AND (r.state<>'closed' OR r.customer_refund_state<>'succeeded' OR r.supplier_recovery_state NOT IN ('recovered','unrecoverable'));

  SELECT count(DISTINCT h.order_id)::integer INTO v_reconciled
    FROM private.supplier_order_handshakes h
    JOIN private.supplier_pilot_offers po ON po.pilot_id=v_pilot.id AND po.supplier_offer_id=h.supplier_offer_id
   WHERE h.created_at>=v_pilot.activated_at
     AND EXISTS(
       SELECT 1 FROM private.supplier_financial_reconciliations f
        WHERE f.order_id=h.order_id AND f.state='RECONCILED' AND COALESCE(abs(f.unrecovered_loss),0)=0
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
  IF v_outside_cohort>0 THEN v_failures:=v_failures||jsonb_build_array(jsonb_build_object('check','pilot_cohort','outsideCohortOrders',v_outside_cohort)); END IF;
  IF v_over_value>0 THEN v_failures:=v_failures||jsonb_build_array(jsonb_build_object('check','order_value_limit','violations',v_over_value,'maximumOrderValueMinor',v_pilot.maximum_order_value_minor)); END IF;
  IF v_ack_rate<v_ack_min THEN v_failures:=v_failures||jsonb_build_array(jsonb_build_object('check','acknowledgement_rate','actualPct',v_ack_rate,'minimumPct',v_ack_min)); END IF;
  IF v_duplicate_submit>v_duplicate_max THEN v_failures:=v_failures||jsonb_build_array(jsonb_build_object('check','duplicate_side_effects','duplicateSubmitExceptions',v_duplicate_submit,'maximum',v_duplicate_max)); END IF;
  IF v_oversell>v_oversell_max THEN v_failures:=v_failures||jsonb_build_array(jsonb_build_object('check','oversell','stockDisappearedExceptions',v_oversell,'maximum',v_oversell_max)); END IF;
  IF v_delivered=0 THEN v_failures:=v_failures||jsonb_build_array(jsonb_build_object('check','delivery','reason','no_delivered_pilot_order')); END IF;
  IF v_tracking=0 THEN v_failures:=v_failures||jsonb_build_array(jsonb_build_object('check','tracking','reason','no_real_tracking_event')); END IF;
  IF v_returns>0 AND v_return_incomplete>0 THEN
    v_failures:=v_failures||jsonb_build_array(jsonb_build_object('check','return_refund_recovery','returns',v_returns,'refundCases',v_refunds,'recoveryCases',v_recoveries,'incompleteReturnCases',v_return_incomplete));
  END IF;
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
  IF NOT EXISTS(SELECT 1 FROM private.supplier_pilot_evidence e WHERE e.pilot_id=v_pilot.id AND e.evidence_type='rollback_recovery_test') THEN
    v_failures:=v_failures||jsonb_build_array(jsonb_build_object('check','rollback_recovery','reason','evidence_missing'));
  END IF;
  IF NOT EXISTS(SELECT 1 FROM private.supplier_pilot_evidence e WHERE e.pilot_id=v_pilot.id AND e.evidence_type='incident_path_test') THEN
    v_failures:=v_failures||jsonb_build_array(jsonb_build_object('check','incident_path','reason','evidence_missing'));
  END IF;
  IF NOT EXISTS(SELECT 1 FROM private.supplier_pilot_evidence e WHERE e.pilot_id=v_pilot.id AND e.evidence_type='release_snapshot') THEN
    v_failures:=v_failures||jsonb_build_array(jsonb_build_object('check','release_snapshot','reason','exact_release_evidence_missing'));
  END IF;
  IF NOT EXISTS(SELECT 1 FROM private.supplier_pilot_evidence e WHERE e.pilot_id=v_pilot.id AND e.evidence_type='duplicate_side_effect_review') THEN
    v_failures:=v_failures||jsonb_build_array(jsonb_build_object('check','duplicate_side_effect_review','reason','evidence_missing'));
  END IF;
  IF NOT EXISTS(
    SELECT 1 FROM private.supplier_commerce_control_audit a
     WHERE a.operation='pilot' AND a.scope_type='global' AND a.new_enabled=false AND a.created_at>=v_pilot.activated_at
  ) THEN
    v_failures:=v_failures||jsonb_build_array(jsonb_build_object('check','kill_switch_control_audit','reason','real_disable_transition_missing'));
  END IF;

  RETURN jsonb_build_object(
    'passed',jsonb_array_length(v_failures)=0,
    'reason',CASE WHEN jsonb_array_length(v_failures)=0 THEN 'controlled_pilot_pass' ELSE 'controlled_pilot_evidence_incomplete' END,
    'pilotId',v_pilot.id,'orders',v_orders,'acknowledgedOrders',v_acks,'acknowledgementRatePct',v_ack_rate,
    'deliveredOrders',v_delivered,'trackingEvents',v_tracking,'returnCases',v_returns,'refundCases',v_refunds,
    'recoveryCases',v_recoveries,'incompleteReturnCases',v_return_incomplete,'reconciledOrders',v_reconciled,
    'outsideCohortOrders',v_outside_cohort,'orderValueViolations',v_over_value,'duplicateSubmitExceptions',v_duplicate_submit,
    'oversellExceptions',v_oversell,'openCriticalIncidents',v_critical,'failures',v_failures,
    'simulatorPassIsNotPilotPass',true,'interfaceVersion',1
  );
END;
$$;
REVOKE ALL ON FUNCTION public.server_supplier_pilot_acceptance_v1(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.server_supplier_pilot_acceptance_v1(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.server_admin_supplier_pilot_status_v1(p_actor_id uuid,p_pilot_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE
  v_pilot private.supplier_pilot_programs%ROWTYPE;
  v_control private.supplier_commerce_controls%ROWTYPE;
  v_readiness jsonb;
  v_acceptance jsonb;
  v_cohort_count integer:=0;
BEGIN
  PERFORM private.require_active_admin_v1(p_actor_id);
  IF p_pilot_id IS NULL THEN SELECT * INTO v_pilot FROM private.supplier_pilot_programs ORDER BY created_at DESC LIMIT 1;
  ELSE SELECT * INTO v_pilot FROM private.supplier_pilot_programs WHERE id=p_pilot_id; END IF;
  SELECT * INTO v_control FROM private.supplier_commerce_controls WHERE operation='pilot' AND scope_type='global' AND scope_ref IS NULL LIMIT 1;
  IF v_pilot.id IS NULL THEN
    RETURN jsonb_build_object('exists',false,'pilotControlEnabled',COALESCE(v_control.enabled,false),'globalSupplierCommerceEnabled',false,'interfaceVersion',1);
  END IF;
  SELECT count(*)::integer INTO v_cohort_count FROM private.supplier_pilot_cohort_members WHERE pilot_id=v_pilot.id;
  v_readiness:=public.server_supplier_pilot_activation_readiness_v1(v_pilot.id);
  v_acceptance:=CASE WHEN v_pilot.activated_at IS NULL THEN jsonb_build_object('passed',false,'reason','pilot_not_activated','interfaceVersion',1) ELSE public.server_supplier_pilot_acceptance_v1(v_pilot.id) END;
  RETURN jsonb_build_object(
    'exists',true,'pilotId',v_pilot.id,'pilotKey',v_pilot.pilot_key,'status',v_pilot.status,
    'supplierId',v_pilot.supplier_id,'providerKey',v_pilot.provider_key,'cohort',v_pilot.cohort_key,
    'cohortMemberCount',v_cohort_count,'territory',v_pilot.territory,'pilotControlEnabled',COALESCE(v_control.enabled,false),
    'globalSupplierCommerceEnabled',(SELECT COALESCE(enabled,false) FROM private.supplier_commerce_controls WHERE operation='*' AND scope_type='global' AND scope_ref IS NULL LIMIT 1),
    'readiness',v_readiness,'acceptance',v_acceptance,'simulatorPassIsNotPilotPass',true,'interfaceVersion',1
  );
END;
$$;
REVOKE ALL ON FUNCTION public.server_admin_supplier_pilot_status_v1(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.server_admin_supplier_pilot_status_v1(uuid,uuid) TO service_role;

COMMENT ON TABLE private.supplier_pilot_cohort_members IS 'Phase O explicit buyer cohort allowlist. Membership is append-only and enforced before supplier reservation.';
COMMENT ON FUNCTION public.server_supplier_pilot_activation_readiness_v1(uuid) IS 'Phase O activation gate combining core supplier/offer readiness with passed simulator evidence, explicit buyer cohort, pilot master control and global-off proof.';
COMMENT ON FUNCTION private.guard_supplier_pilot_cohort_reservation_v1() IS 'Hard Phase O order boundary: active-pilot supplier reservations require the canonical order buyer to be in the explicit pilot cohort.';
COMMENT ON FUNCTION public.server_supplier_pilot_acceptance_v1(uuid) IS 'Phase O no-fake-pass gate. Requires real pilot orders, cohort containment, tracking/delivery, conditional return/refund/recovery closure, uppercase canonical financial reconciliation, kill-switch/recovery/incident/release evidence and no relevant critical failures.';;
