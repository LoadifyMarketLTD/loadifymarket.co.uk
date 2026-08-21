-- 646_supplier_exception_engine.sql
-- Phase K exception engine: open/advance/resolve operational exceptions with complete ownership/impact truth.
-- Returns/refunds/recovery money movement remains Phase L.

CREATE OR REPLACE FUNCTION public.server_open_supplier_order_exception_v1(
  p_order_id uuid,
  p_orchestration_id uuid,
  p_fulfilment_leg_id uuid,
  p_handshake_id uuid,
  p_shipment_id uuid,
  p_exception_key text,
  p_exception_type text,
  p_owner_type text,
  p_next_action text,
  p_customer_impact text,
  p_financial_impact text,
  p_source_event_id uuid,
  p_metadata jsonb
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE
  v_e private.supplier_order_exceptions%ROWTYPE;
BEGIN
  IF NULLIF(BTRIM(p_exception_key),'') IS NULL OR NULLIF(BTRIM(p_next_action),'') IS NULL
     OR NULLIF(BTRIM(p_customer_impact),'') IS NULL OR NULLIF(BTRIM(p_financial_impact),'') IS NULL THEN
    RAISE EXCEPTION 'exception key, next action and customer/financial impact are required';
  END IF;
  IF p_exception_type NOT IN (
    'supplier_timeout','accepted_response_lost','duplicate_submit','duplicate_acknowledgement','stock_disappeared','price_changed',
    'api_unavailable','partial_fulfilment','partial_shipment','delayed_dispatch','no_tracking','lost_shipment',
    'supplier_cancellation','buyer_cancellation','supplier_suspended_mid_order','tracking_exception','failed_delivery'
  ) THEN RAISE EXCEPTION 'invalid supplier order exception type'; END IF;
  IF p_owner_type NOT IN ('loadify_ops','supplier','carrier','customer','finance','risk') THEN RAISE EXCEPTION 'invalid exception owner'; END IF;

  INSERT INTO private.supplier_order_exceptions(
    order_id,orchestration_id,fulfilment_leg_id,handshake_id,shipment_id,exception_key,exception_type,state,owner_type,
    next_action,customer_impact,financial_impact,source_event_id,metadata
  ) VALUES(
    p_order_id,p_orchestration_id,p_fulfilment_leg_id,p_handshake_id,p_shipment_id,BTRIM(p_exception_key),p_exception_type,
    'open',p_owner_type,BTRIM(p_next_action),BTRIM(p_customer_impact),BTRIM(p_financial_impact),p_source_event_id,COALESCE(p_metadata,'{}'::jsonb)
  ) ON CONFLICT(exception_key) DO NOTHING;
  SELECT * INTO v_e FROM private.supplier_order_exceptions WHERE exception_key=BTRIM(p_exception_key) FOR UPDATE;

  INSERT INTO private.supplier_order_exception_events(exception_id,event_key,new_state,owner_type,next_action,reason,metadata)
  VALUES(v_e.id,'opened:'||v_e.id::text,'open',v_e.owner_type,v_e.next_action,'exception_opened',v_e.metadata)
  ON CONFLICT(event_key) DO NOTHING;

  RETURN jsonb_build_object('ok',true,'exceptionId',v_e.id,'state',v_e.state,'owner',v_e.owner_type,'interfaceVersion',1);
END;
$$;
REVOKE ALL ON FUNCTION public.server_open_supplier_order_exception_v1(uuid,uuid,uuid,uuid,uuid,text,text,text,text,text,text,uuid,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_open_supplier_order_exception_v1(uuid,uuid,uuid,uuid,uuid,text,text,text,text,text,text,uuid,jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.server_transition_supplier_order_exception_v1(
  p_actor_id uuid,
  p_exception_id uuid,
  p_state text,
  p_owner_type text,
  p_next_action text,
  p_reason text,
  p_resolution text,
  p_metadata jsonb
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE
  v_e private.supplier_order_exceptions%ROWTYPE;
  v_previous text;
  v_actor_active boolean;
  v_actor_role text;
BEGIN
  SELECT u."isActive",u.role INTO v_actor_active,v_actor_role FROM public.users u WHERE u.id=p_actor_id;
  IF v_actor_active IS DISTINCT FROM true OR v_actor_role<>'admin' THEN
    RAISE EXCEPTION 'active admin authority is required' USING ERRCODE='42501';
  END IF;
  IF p_state NOT IN ('open','investigating','waiting_supplier','waiting_carrier','waiting_customer','resolved','closed') THEN
    RAISE EXCEPTION 'invalid exception state';
  END IF;
  IF p_owner_type NOT IN ('loadify_ops','supplier','carrier','customer','finance','risk') THEN RAISE EXCEPTION 'invalid exception owner'; END IF;
  IF NULLIF(BTRIM(p_next_action),'') IS NULL OR NULLIF(BTRIM(p_reason),'') IS NULL THEN RAISE EXCEPTION 'next action and reason are required'; END IF;
  IF p_state IN ('resolved','closed') AND NULLIF(BTRIM(p_resolution),'') IS NULL THEN RAISE EXCEPTION 'terminal exception requires resolution'; END IF;

  SELECT * INTO v_e FROM private.supplier_order_exceptions WHERE id=p_exception_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'reason','exception_not_found','interfaceVersion',1); END IF;
  IF v_e.state='closed' AND p_state<>'closed' THEN RAISE EXCEPTION 'closed exception cannot regress'; END IF;
  v_previous:=v_e.state;

  UPDATE private.supplier_order_exceptions SET
    state=p_state,owner_type=p_owner_type,next_action=BTRIM(p_next_action),
    resolution=CASE WHEN p_state IN ('resolved','closed') THEN BTRIM(p_resolution) ELSE NULL END,
    resolved_at=CASE WHEN p_state IN ('resolved','closed') THEN COALESCE(resolved_at,now()) ELSE NULL END,
    metadata=COALESCE(p_metadata,metadata),updated_at=now()
  WHERE id=v_e.id RETURNING * INTO v_e;

  INSERT INTO private.supplier_order_exception_events(
    exception_id,event_key,previous_state,new_state,owner_type,next_action,reason,actor_id,metadata
  ) VALUES(
    v_e.id,'transition:'||v_e.id::text||':'||extract(epoch from clock_timestamp())::bigint::text,v_previous,v_e.state,v_e.owner_type,
    v_e.next_action,BTRIM(p_reason),p_actor_id,COALESCE(p_metadata,'{}'::jsonb)
  );
  RETURN jsonb_build_object('ok',true,'exceptionId',v_e.id,'state',v_e.state,'owner',v_e.owner_type,'interfaceVersion',1);
END;
$$;
REVOKE ALL ON FUNCTION public.server_transition_supplier_order_exception_v1(uuid,uuid,text,text,text,text,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_transition_supplier_order_exception_v1(uuid,uuid,text,text,text,text,text,jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.server_detect_supplier_tracking_exceptions_v1(
  p_now timestamptz DEFAULT now(),
  p_no_tracking_after_minutes integer DEFAULT 120,
  p_dispatch_delay_minutes integer DEFAULT 60
)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE v_count integer:=0; v_inserted integer:=0;
BEGIN
  IF p_no_tracking_after_minutes<15 OR p_dispatch_delay_minutes<15 THEN RAISE EXCEPTION 'tracking exception thresholds must be at least 15 minutes'; END IF;

  INSERT INTO private.supplier_order_exceptions(
    order_id,orchestration_id,fulfilment_leg_id,handshake_id,shipment_id,exception_key,exception_type,state,owner_type,
    next_action,customer_impact,financial_impact,metadata
  )
  SELECT h.order_id,h.orchestration_id,h.fulfilment_leg_id,h.id,s.id,
    'no-tracking:'||h.id::text,'no_tracking','open','supplier','obtain trustworthy carrier tracking evidence',
    'buyer cannot see shipment progress','delivery promise at risk',jsonb_build_object('detectedAt',p_now)
  FROM private.supplier_order_handshakes h
  LEFT JOIN private.supplier_leg_shipments s ON s.handshake_id=h.id
  WHERE h.state='reconciled' AND h.acknowledgement_state='accepted'
    AND COALESCE(s.tracking_ref,'')=''
    AND h.reconciled_at + make_interval(mins=>p_no_tracking_after_minutes)<=p_now
  ON CONFLICT(exception_key) DO NOTHING;
  GET DIAGNOSTICS v_inserted=ROW_COUNT; v_count:=v_count+v_inserted;

  INSERT INTO private.supplier_order_exceptions(
    order_id,orchestration_id,fulfilment_leg_id,handshake_id,shipment_id,exception_key,exception_type,state,owner_type,
    next_action,customer_impact,financial_impact,source_event_id,metadata
  )
  SELECT s.order_id,s.orchestration_id,s.fulfilment_leg_id,s.handshake_id,s.id,
    'tracking-exception:'||e.id::text,
    CASE WHEN e.canonical_status='failed_delivery' THEN 'failed_delivery' ELSE 'tracking_exception' END,
    'open','carrier','investigate carrier exception and update buyer-facing delivery expectation',
    'delivery may be delayed or unsuccessful','additional fulfilment/support cost may arise',e.id,jsonb_build_object('detectedAt',p_now)
  FROM private.supplier_tracking_events e JOIN private.supplier_leg_shipments s ON s.id=e.shipment_id
  WHERE e.canonical_status IN ('exception','failed_delivery')
  ON CONFLICT(exception_key) DO NOTHING;
  GET DIAGNOSTICS v_inserted=ROW_COUNT; v_count:=v_count+v_inserted;

  INSERT INTO private.supplier_order_exceptions(
    order_id,orchestration_id,fulfilment_leg_id,handshake_id,shipment_id,exception_key,exception_type,state,owner_type,
    next_action,customer_impact,financial_impact,metadata
  )
  SELECT s.order_id,s.orchestration_id,s.fulfilment_leg_id,s.handshake_id,s.id,
    'delayed-dispatch:'||s.id::text,'delayed_dispatch','open','supplier','confirm dispatch or provide corrective fulfilment plan',
    'dispatch is later than expected','potential support/refund exposure',jsonb_build_object('detectedAt',p_now,'dispatchDueAt',s.dispatch_due_at)
  FROM private.supplier_leg_shipments s
  WHERE s.dispatch_due_at IS NOT NULL AND s.dispatched_at IS NULL
    AND s.dispatch_due_at + make_interval(mins=>p_dispatch_delay_minutes)<=p_now
  ON CONFLICT(exception_key) DO NOTHING;
  GET DIAGNOSTICS v_inserted=ROW_COUNT; v_count:=v_count+v_inserted;

  RETURN v_count;
END;
$$;
REVOKE ALL ON FUNCTION public.server_detect_supplier_tracking_exceptions_v1(timestamptz,integer,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_detect_supplier_tracking_exceptions_v1(timestamptz,integer,integer) TO service_role;

CREATE OR REPLACE FUNCTION public.server_admin_supplier_tracking_status_v1(p_actor_id uuid,p_order_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.users u WHERE u.id=p_actor_id AND u.role='admin' AND u."isActive"=true) THEN
    RAISE EXCEPTION 'active admin authority is required' USING ERRCODE='42501';
  END IF;
  RETURN jsonb_build_object(
    'shipments',(SELECT COALESCE(jsonb_agg(to_jsonb(s) ORDER BY s.updated_at DESC),'[]'::jsonb) FROM private.supplier_leg_shipments s WHERE p_order_id IS NULL OR s.order_id=p_order_id),
    'exceptions',(SELECT COALESCE(jsonb_agg(to_jsonb(e) ORDER BY e.updated_at DESC),'[]'::jsonb) FROM private.supplier_order_exceptions e WHERE p_order_id IS NULL OR e.order_id=p_order_id),
    'interfaceVersion',1
  );
END;
$$;
REVOKE ALL ON FUNCTION public.server_admin_supplier_tracking_status_v1(uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_admin_supplier_tracking_status_v1(uuid,uuid) TO service_role;

COMMENT ON FUNCTION public.server_detect_supplier_tracking_exceptions_v1(timestamptz,integer,integer) IS 'Phase K operational detector only. It opens no-tracking, delayed-dispatch and tracking/failure exceptions; return/refund/recovery execution remains Phase L.';
