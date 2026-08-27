-- 683_supplier_cancellation_runtime.sql
-- E2E remediation Stage 5C: provider-neutral supplier-order cancellation runtime.
-- No provider call is performed in SQL and the new cancellation control defaults OFF.

ALTER TABLE private.supplier_commerce_controls
  DROP CONSTRAINT IF EXISTS supplier_commerce_controls_operation_check;
ALTER TABLE private.supplier_commerce_controls
  ADD CONSTRAINT supplier_commerce_controls_operation_check CHECK (operation IN (
    '*','pilot','import','publish','checkout','reservation','supplier_order','cancellation',
    'tracking_ingest','return_recovery','stock_sync','price_sync'
  ));

INSERT INTO private.supplier_commerce_controls(operation,scope_type,scope_ref,enabled,reason)
VALUES('cancellation','global',NULL,false,'Stage 5C safe default: supplier cancellation disabled')
ON CONFLICT(operation,scope_type,scope_ref_key) DO NOTHING;

-- Extend the canonical decision in-place so cancellation participates in the same
-- global/scoped/pilot kill-switch semantics rather than creating a parallel switch.
CREATE OR REPLACE FUNCTION public.server_supplier_commerce_control_decision_v1(
  p_operation text,p_scope jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE
  v_operation text:=lower(BTRIM(COALESCE(p_operation,'')));
  v_global private.supplier_commerce_controls%ROWTYPE;
  v_operation_control private.supplier_commerce_controls%ROWTYPE;
  v_scope_type text; v_scope_ref text; v_scope_key text;
  v_blocker private.supplier_commerce_controls%ROWTYPE;
  v_pilot jsonb;
BEGIN
  IF v_operation NOT IN ('import','publish','checkout','reservation','supplier_order','cancellation','tracking_ingest','return_recovery','stock_sync','price_sync') THEN
    RETURN jsonb_build_object('enabled',false,'reason','unknown_operation','interfaceVersion',1);
  END IF;
  IF p_scope IS NULL OR jsonb_typeof(p_scope) IS DISTINCT FROM 'object' THEN
    RETURN jsonb_build_object('enabled',false,'reason','invalid_scope','interfaceVersion',1);
  END IF;

  SELECT * INTO v_global FROM private.supplier_commerce_controls
   WHERE operation='*' AND scope_type='global' AND scope_ref IS NULL LIMIT 1;
  SELECT * INTO v_operation_control FROM private.supplier_commerce_controls
   WHERE operation=v_operation AND scope_type='global' AND scope_ref IS NULL LIMIT 1;

  IF v_global.id IS NOT NULL AND v_global.enabled=true
     AND v_operation_control.id IS NOT NULL AND v_operation_control.enabled=true THEN
    FOREACH v_scope_type IN ARRAY ARRAY['provider','supplier','offer','product','category','territory','cohort']::text[] LOOP
      v_scope_key:=CASE v_scope_type WHEN 'provider' THEN 'providerRef' WHEN 'supplier' THEN 'supplierRef'
        WHEN 'offer' THEN 'offerRef' WHEN 'product' THEN 'productRef' WHEN 'category' THEN 'categoryRef'
        WHEN 'territory' THEN 'territory' WHEN 'cohort' THEN 'cohort' END;
      v_scope_ref:=NULLIF(BTRIM(p_scope->>v_scope_key),'');
      IF v_scope_ref IS NOT NULL THEN
        SELECT * INTO v_blocker FROM private.supplier_commerce_controls
         WHERE operation IN ('*',v_operation) AND scope_type=v_scope_type AND scope_ref=v_scope_ref AND enabled=false
         ORDER BY CASE WHEN operation=v_operation THEN 0 ELSE 1 END LIMIT 1;
        IF FOUND THEN RETURN jsonb_build_object('enabled',false,'reason','scoped_kill_switch','operation',v_operation,
          'scopeType',v_scope_type,'scopeRef',v_scope_ref,'interfaceVersion',1,'controlVersion',v_blocker.version); END IF;
      END IF;
    END LOOP;
    RETURN jsonb_build_object('enabled',true,'reason','enabled','operation',v_operation,'interfaceVersion',1,
      'controlVersion',GREATEST(v_global.version,v_operation_control.version));
  END IF;

  v_pilot:=private.supplier_pilot_control_decision_v1(v_operation,p_scope);
  IF COALESCE((v_pilot->>'enabled')::boolean,false)=true THEN RETURN v_pilot; END IF;
  IF v_global.id IS NULL OR v_global.enabled IS DISTINCT FROM true THEN
    RETURN jsonb_build_object('enabled',false,'reason','supplier_commerce_global_disabled','operation',v_operation,
      'pilotReason',v_pilot->>'reason','interfaceVersion',1,'controlVersion',COALESCE(v_global.version,0));
  END IF;
  RETURN jsonb_build_object('enabled',false,'reason','operation_disabled','operation',v_operation,
    'pilotReason',v_pilot->>'reason','interfaceVersion',1,'controlVersion',COALESCE(v_operation_control.version,0));
END;
$$;
REVOKE ALL ON FUNCTION public.server_supplier_commerce_control_decision_v1(text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.server_supplier_commerce_control_decision_v1(text,jsonb) TO service_role;

CREATE TABLE IF NOT EXISTS private.supplier_order_cancellations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  handshake_id uuid NOT NULL UNIQUE REFERENCES private.supplier_order_handshakes(id) ON DELETE RESTRICT,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  orchestration_id uuid NOT NULL REFERENCES private.supplier_order_orchestrations(id) ON DELETE RESTRICT,
  fulfilment_leg_id uuid NOT NULL REFERENCES private.supplier_fulfilment_legs(id) ON DELETE RESTRICT,
  supplier_offer_id uuid NOT NULL REFERENCES private.supplier_offers(id) ON DELETE RESTRICT,
  supplier_id uuid NOT NULL REFERENCES private.supplier_foundation_suppliers(id) ON DELETE RESTRICT,
  provider_key text NOT NULL,
  adapter_version text NOT NULL,
  external_supplier_order_ref text NOT NULL,
  cancellation_key text NOT NULL UNIQUE,
  correlation_id uuid NOT NULL,
  request_fingerprint text NOT NULL,
  state text NOT NULL DEFAULT 'prepared',
  attempts integer NOT NULL DEFAULT 0 CHECK(attempts>=0),
  last_error_class text,
  last_error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplier_order_cancellation_state_check CHECK (
    state IN ('prepared','submitting','retryable_failure','rejected','unknown','reconciliation_required','cancelled','manual_review')
  ),
  CONSTRAINT supplier_order_cancellation_identity_check CHECK (
    NULLIF(BTRIM(provider_key),'') IS NOT NULL AND NULLIF(BTRIM(adapter_version),'') IS NOT NULL
    AND NULLIF(BTRIM(external_supplier_order_ref),'') IS NOT NULL AND NULLIF(BTRIM(cancellation_key),'') IS NOT NULL
    AND request_fingerprint ~ '^[0-9a-f]{32}$'
  )
);
CREATE INDEX IF NOT EXISTS supplier_order_cancellation_order_idx
  ON private.supplier_order_cancellations(order_id,state,updated_at DESC);

CREATE TABLE IF NOT EXISTS private.supplier_order_cancellation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cancellation_id uuid NOT NULL REFERENCES private.supplier_order_cancellations(id) ON DELETE RESTRICT,
  event_key text NOT NULL UNIQUE,
  event text NOT NULL,
  previous_state text,
  new_state text,
  result_class text,
  error_class text,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplier_order_cancellation_event_check CHECK (event IN ('prepared','started','result','reconciliation','manual_review')),
  CONSTRAINT supplier_order_cancellation_event_reason_check CHECK (NULLIF(BTRIM(reason),'') IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS supplier_order_cancellation_event_idx
  ON private.supplier_order_cancellation_events(cancellation_id,created_at);
REVOKE ALL ON TABLE private.supplier_order_cancellations FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON TABLE private.supplier_order_cancellation_events FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION private.guard_supplier_order_cancellation_identity_v1()
RETURNS trigger LANGUAGE plpgsql SET search_path TO '' AS $$
BEGIN
  IF TG_OP='UPDATE' AND (
    NEW.handshake_id IS DISTINCT FROM OLD.handshake_id OR NEW.order_id IS DISTINCT FROM OLD.order_id
    OR NEW.orchestration_id IS DISTINCT FROM OLD.orchestration_id OR NEW.fulfilment_leg_id IS DISTINCT FROM OLD.fulfilment_leg_id
    OR NEW.supplier_offer_id IS DISTINCT FROM OLD.supplier_offer_id OR NEW.supplier_id IS DISTINCT FROM OLD.supplier_id
    OR NEW.provider_key IS DISTINCT FROM OLD.provider_key OR NEW.adapter_version IS DISTINCT FROM OLD.adapter_version
    OR NEW.external_supplier_order_ref IS DISTINCT FROM OLD.external_supplier_order_ref
    OR NEW.cancellation_key IS DISTINCT FROM OLD.cancellation_key OR NEW.correlation_id IS DISTINCT FROM OLD.correlation_id
    OR NEW.request_fingerprint IS DISTINCT FROM OLD.request_fingerprint OR NEW.created_at IS DISTINCT FROM OLD.created_at
  ) THEN RAISE EXCEPTION 'supplier cancellation identity is immutable'; END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_supplier_order_cancellation_identity_v1 ON private.supplier_order_cancellations;
CREATE TRIGGER trg_guard_supplier_order_cancellation_identity_v1
BEFORE UPDATE ON private.supplier_order_cancellations
FOR EACH ROW EXECUTE FUNCTION private.guard_supplier_order_cancellation_identity_v1();

CREATE OR REPLACE FUNCTION private.guard_supplier_order_cancellation_event_immutable_v1()
RETURNS trigger LANGUAGE plpgsql SET search_path TO '' AS $$ BEGIN
  RAISE EXCEPTION 'supplier cancellation events are append-only';
END; $$;
DROP TRIGGER IF EXISTS trg_guard_supplier_order_cancellation_event_immutable_v1 ON private.supplier_order_cancellation_events;
CREATE TRIGGER trg_guard_supplier_order_cancellation_event_immutable_v1
BEFORE UPDATE OR DELETE ON private.supplier_order_cancellation_events
FOR EACH ROW EXECUTE FUNCTION private.guard_supplier_order_cancellation_event_immutable_v1();

CREATE OR REPLACE FUNCTION public.server_prepare_supplier_order_cancellation_v1(
  p_handshake_id uuid,p_cancellation_key text,p_correlation_id uuid
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE
  v_h private.supplier_order_handshakes%ROWTYPE; v_order public.orders%ROWTYPE;
  v_leg private.supplier_fulfilment_legs%ROWTYPE; v_offer private.supplier_offers%ROWTYPE;
  v_supplier private.supplier_foundation_suppliers%ROWTYPE; v_adapter private.supplier_adapter_registrations%ROWTYPE;
  v_existing private.supplier_order_cancellations%ROWTYPE; v_saved private.supplier_order_cancellations%ROWTYPE;
  v_control jsonb; v_key text:=BTRIM(COALESCE(p_cancellation_key,'')); v_fingerprint text;
BEGIN
  IF p_handshake_id IS NULL OR v_key='' OR p_correlation_id IS NULL THEN
    RETURN jsonb_build_object('eligible',false,'reason','cancellation_identity_required','interfaceVersion',1); END IF;
  SELECT * INTO v_h FROM private.supplier_order_handshakes WHERE id=p_handshake_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('eligible',false,'reason','supplier_handshake_not_found','interfaceVersion',1); END IF;
  IF v_h.state NOT IN ('accepted','reconciled') OR v_h.acknowledgement_state<>'accepted'
     OR NULLIF(BTRIM(v_h.external_supplier_order_ref),'') IS NULL THEN
    RETURN jsonb_build_object('eligible',false,'reason','accepted_supplier_order_required_for_cancellation','handshakeState',v_h.state,'interfaceVersion',1); END IF;
  SELECT * INTO v_order FROM public.orders WHERE id=v_h.order_id FOR UPDATE;
  IF NOT FOUND OR v_order."commercialModeSnapshot"<>'loadify_supplier_fulfilled' OR v_order.status NOT IN ('paid','packed') THEN
    RETURN jsonb_build_object('eligible',false,'reason','customer_order_not_cancellable_at_supplier','orderStatus',v_order.status,'interfaceVersion',1); END IF;
  SELECT * INTO v_leg FROM private.supplier_fulfilment_legs WHERE id=v_h.fulfilment_leg_id AND orchestration_id=v_h.orchestration_id FOR UPDATE;
  IF NOT FOUND OR v_leg.status<>'supplier_accepted' THEN
    RETURN jsonb_build_object('eligible',false,'reason','supplier_leg_not_cancellable','legStatus',v_leg.status,'interfaceVersion',1); END IF;
  SELECT * INTO v_offer FROM private.supplier_offers WHERE id=v_h.supplier_offer_id;
  SELECT * INTO v_supplier FROM private.supplier_foundation_suppliers WHERE id=v_h.supplier_id AND lifecycle_status='approved';
  IF v_offer.id IS NULL OR v_supplier.id IS NULL THEN RETURN jsonb_build_object('eligible',false,'reason','supplier_route_not_ready','interfaceVersion',1); END IF;
  v_control:=public.server_supplier_commerce_control_decision_v1('cancellation',jsonb_build_object(
    'providerRef',v_h.provider_key,'supplierRef',v_supplier.supplier_key,'offerRef',v_offer.id::text,
    'productRef',v_offer.canonical_product_id::text,'territory',v_offer.territory));
  IF COALESCE((v_control->>'enabled')::boolean,false) IS DISTINCT FROM true THEN
    RETURN jsonb_build_object('eligible',false,'reason','supplier_cancellation_control_disabled','control',v_control,'interfaceVersion',1); END IF;
  SELECT * INTO v_adapter FROM private.supplier_adapter_registrations a
   WHERE a.supplier_id=v_supplier.id AND a.provider_key=v_h.provider_key AND a.adapter_version=v_h.adapter_version
     AND a.status='active' AND a.interface_version=1 AND a.verified_at IS NOT NULL
     AND a.capabilities @> ARRAY['cancellation']::text[] LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('eligible',false,'reason','supplier_cancellation_adapter_not_ready','interfaceVersion',1); END IF;
  v_fingerprint:=md5(concat_ws('|',v_h.id::text,v_h.order_id::text,v_h.fulfilment_leg_id::text,v_h.supplier_offer_id::text,
    v_h.provider_key,v_h.adapter_version,v_h.external_supplier_order_ref));
  SELECT * INTO v_existing FROM private.supplier_order_cancellations WHERE handshake_id=v_h.id FOR UPDATE;
  IF FOUND THEN
    IF v_existing.cancellation_key<>v_key OR v_existing.correlation_id<>p_correlation_id OR v_existing.request_fingerprint<>v_fingerprint THEN
      RAISE EXCEPTION 'supplier cancellation idempotency collision'; END IF;
    RETURN jsonb_build_object('eligible',v_existing.state NOT IN ('rejected','manual_review'),'reason','supplier_cancellation_replayed',
      'cancellationId',v_existing.id,'state',v_existing.state,'providerKey',v_existing.provider_key,'adapterVersion',v_existing.adapter_version,
      'supplierKey',v_supplier.supplier_key,'territory',v_offer.territory,'externalSupplierOrderRef',v_existing.external_supplier_order_ref,
      'cancellationKey',v_existing.cancellation_key,'correlationId',v_existing.correlation_id,'interfaceVersion',1);
  END IF;
  INSERT INTO private.supplier_order_cancellations(handshake_id,order_id,orchestration_id,fulfilment_leg_id,supplier_offer_id,supplier_id,
    provider_key,adapter_version,external_supplier_order_ref,cancellation_key,correlation_id,request_fingerprint)
  VALUES(v_h.id,v_h.order_id,v_h.orchestration_id,v_h.fulfilment_leg_id,v_h.supplier_offer_id,v_h.supplier_id,
    v_h.provider_key,v_h.adapter_version,v_h.external_supplier_order_ref,v_key,p_correlation_id,v_fingerprint) RETURNING * INTO v_saved;
  INSERT INTO private.supplier_order_cancellation_events(cancellation_id,event_key,event,new_state,reason)
  VALUES(v_saved.id,'prepared:'||v_saved.id::text,'prepared','prepared','accepted_supplier_order_and_cancellation_capability_verified');
  RETURN jsonb_build_object('eligible',true,'reason','supplier_cancellation_ready','cancellationId',v_saved.id,'state',v_saved.state,
    'providerKey',v_saved.provider_key,'adapterVersion',v_saved.adapter_version,'supplierKey',v_supplier.supplier_key,'territory',v_offer.territory,
    'externalSupplierOrderRef',v_saved.external_supplier_order_ref,'cancellationKey',v_saved.cancellation_key,
    'correlationId',v_saved.correlation_id,'interfaceVersion',1);
END;
$$;
REVOKE ALL ON FUNCTION public.server_prepare_supplier_order_cancellation_v1(uuid,text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.server_prepare_supplier_order_cancellation_v1(uuid,text,uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.server_mark_supplier_order_cancellation_started_v1(
  p_cancellation_id uuid,p_cancellation_key text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE v_c private.supplier_order_cancellations%ROWTYPE; v_previous text;
BEGIN
  SELECT * INTO v_c FROM private.supplier_order_cancellations WHERE id=p_cancellation_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'reason','supplier_cancellation_not_found','interfaceVersion',1); END IF;
  IF v_c.cancellation_key<>BTRIM(COALESCE(p_cancellation_key,'')) THEN RAISE EXCEPTION 'supplier cancellation idempotency mismatch'; END IF;
  IF v_c.state='cancelled' THEN RETURN jsonb_build_object('ok',true,'reason','supplier_order_already_cancelled','state',v_c.state,'interfaceVersion',1); END IF;
  IF v_c.state IN ('unknown','reconciliation_required') THEN
    RETURN jsonb_build_object('ok',false,'reason','query_before_retry_required','state',v_c.state,'interfaceVersion',1); END IF;
  IF v_c.state IN ('rejected','manual_review') THEN
    RETURN jsonb_build_object('ok',false,'reason','supplier_cancellation_requires_manual_review','state',v_c.state,'interfaceVersion',1); END IF;
  IF v_c.state='submitting' THEN
    RETURN jsonb_build_object('ok',false,'reason','supplier_cancellation_already_in_flight','state',v_c.state,'interfaceVersion',1); END IF;
  v_previous:=v_c.state;
  UPDATE private.supplier_order_cancellations SET state='submitting',attempts=attempts+1,started_at=now(),updated_at=now()
   WHERE id=v_c.id RETURNING * INTO v_c;
  INSERT INTO private.supplier_order_cancellation_events(cancellation_id,event_key,event,previous_state,new_state,reason)
  VALUES(v_c.id,'started:'||v_c.id::text||':'||v_c.attempts::text,'started',v_previous,'submitting','provider_cancellation_started');
  RETURN jsonb_build_object('ok',true,'reason','supplier_cancellation_started','attempt',v_c.attempts,'interfaceVersion',1);
END;
$$;
REVOKE ALL ON FUNCTION public.server_mark_supplier_order_cancellation_started_v1(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.server_mark_supplier_order_cancellation_started_v1(uuid,text) TO service_role;

CREATE OR REPLACE FUNCTION public.server_record_supplier_order_cancellation_result_v1(
  p_cancellation_id uuid,p_result_class text,p_cancelled boolean,p_error_class text,p_error_message text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE
  v_c private.supplier_order_cancellations%ROWTYPE; v_result text:=upper(BTRIM(COALESCE(p_result_class,'')));
  v_previous text; v_new_state text;
BEGIN
  SELECT * INTO v_c FROM private.supplier_order_cancellations WHERE id=p_cancellation_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'reason','supplier_cancellation_not_found','interfaceVersion',1); END IF;
  IF v_c.state='cancelled' THEN RETURN jsonb_build_object('ok',true,'reason','supplier_order_already_cancelled','state','cancelled','interfaceVersion',1); END IF;
  IF v_c.state<>'submitting' THEN RETURN jsonb_build_object('ok',false,'reason','supplier_cancellation_result_without_inflight_attempt','state',v_c.state,'interfaceVersion',1); END IF;
  IF v_result NOT IN ('SUCCESS','RETRYABLE_FAILURE','RATE_LIMITED','PERMANENT_REJECTION','AUTH_CONFIGURATION_FAILURE','UNKNOWN_OUTCOME','MANUAL_REVIEW_REQUIRED') THEN
    RAISE EXCEPTION 'invalid supplier cancellation result class'; END IF;
  v_previous:=v_c.state;
  v_new_state:=CASE
    WHEN v_result='SUCCESS' AND p_cancelled=true THEN 'cancelled'
    WHEN v_result IN ('RETRYABLE_FAILURE','RATE_LIMITED') THEN 'retryable_failure'
    WHEN v_result='PERMANENT_REJECTION' THEN 'rejected'
    WHEN v_result='UNKNOWN_OUTCOME' THEN 'reconciliation_required'
    ELSE 'manual_review' END;
  UPDATE private.supplier_order_cancellations SET state=v_new_state,last_error_class=NULLIF(BTRIM(p_error_class),''),
    last_error_message=NULLIF(BTRIM(p_error_message),''),completed_at=CASE WHEN v_new_state IN ('cancelled','rejected','manual_review') THEN now() ELSE NULL END,
    updated_at=now() WHERE id=v_c.id RETURNING * INTO v_c;
  IF v_new_state='cancelled' THEN
    UPDATE private.supplier_fulfilment_legs SET status='cancelled',updated_at=now() WHERE id=v_c.fulfilment_leg_id;
    UPDATE private.supplier_order_orchestrations SET state='cancelled',updated_at=now() WHERE id=v_c.orchestration_id;
  ELSIF v_new_state='reconciliation_required' THEN
    UPDATE private.supplier_fulfilment_legs SET status='reconciliation_required',updated_at=now() WHERE id=v_c.fulfilment_leg_id;
    UPDATE private.supplier_order_orchestrations SET state='reconciliation_required',updated_at=now() WHERE id=v_c.orchestration_id;
  END IF;
  INSERT INTO private.supplier_order_cancellation_events(cancellation_id,event_key,event,previous_state,new_state,result_class,error_class,reason)
  VALUES(v_c.id,'result:'||v_c.id::text||':'||v_c.attempts::text,'result',v_previous,v_new_state,v_result,NULLIF(BTRIM(p_error_class),''),
    CASE WHEN v_new_state='cancelled' THEN 'supplier_order_cancellation_confirmed' WHEN v_new_state='reconciliation_required' THEN 'cancellation_outcome_unknown_no_blind_retry'
      ELSE 'supplier_cancellation_not_confirmed' END);
  RETURN jsonb_build_object('ok',v_new_state='cancelled','reason',CASE WHEN v_new_state='cancelled' THEN 'supplier_order_cancelled' ELSE 'supplier_order_cancellation_not_confirmed' END,
    'cancellationId',v_c.id,'state',v_new_state,'recoveryState',CASE WHEN v_new_state='reconciliation_required' THEN 'query_before_retry' WHEN v_new_state='retryable_failure' THEN 'retry_pending' WHEN v_new_state='cancelled' THEN 'resolved' ELSE 'manual_review' END,
    'interfaceVersion',1);
END;
$$;
REVOKE ALL ON FUNCTION public.server_record_supplier_order_cancellation_result_v1(uuid,text,boolean,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.server_record_supplier_order_cancellation_result_v1(uuid,text,boolean,text,text) TO service_role;

COMMENT ON TABLE private.supplier_order_cancellations IS
  'Stage 5C provider-neutral cancellation state for one already-accepted supplier order. Unknown outcomes never permit blind retry.';
COMMENT ON FUNCTION public.server_prepare_supplier_order_cancellation_v1(uuid,text,uuid) IS
  'Stage 5C prepares cancellation only for an accepted supplier order, exact adapter version/capability and enabled cancellation control.';
