-- 645_supplier_tracking_runtime_guards.sql
CREATE OR REPLACE FUNCTION private.guard_supplier_tracking_event_immutable_v1()
RETURNS trigger LANGUAGE plpgsql SET search_path TO '' AS $$ BEGIN RAISE EXCEPTION 'supplier tracking events are append-only'; END; $$;
DROP TRIGGER IF EXISTS trg_guard_supplier_tracking_event_immutable_v1 ON private.supplier_tracking_events;
CREATE TRIGGER trg_guard_supplier_tracking_event_immutable_v1 BEFORE UPDATE OR DELETE ON private.supplier_tracking_events FOR EACH ROW EXECUTE FUNCTION private.guard_supplier_tracking_event_immutable_v1();
CREATE OR REPLACE FUNCTION private.guard_supplier_order_exception_event_immutable_v1()
RETURNS trigger LANGUAGE plpgsql SET search_path TO '' AS $$ BEGIN RAISE EXCEPTION 'supplier order exception events are append-only'; END; $$;
DROP TRIGGER IF EXISTS trg_guard_supplier_order_exception_event_immutable_v1 ON private.supplier_order_exception_events;
CREATE TRIGGER trg_guard_supplier_order_exception_event_immutable_v1 BEFORE UPDATE OR DELETE ON private.supplier_order_exception_events FOR EACH ROW EXECUTE FUNCTION private.guard_supplier_order_exception_event_immutable_v1();
CREATE OR REPLACE FUNCTION public.server_supplier_tracking_context_v1(p_handshake_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE v_h private.supplier_order_handshakes%ROWTYPE; v_s private.supplier_foundation_suppliers%ROWTYPE; v_adapter private.supplier_adapter_registrations%ROWTYPE;
BEGIN
SELECT * INTO v_h FROM private.supplier_order_handshakes WHERE id=p_handshake_id;
IF NOT FOUND OR v_h.state<>'reconciled' OR v_h.acknowledgement_state<>'accepted' OR v_h.external_supplier_order_ref IS NULL THEN RETURN jsonb_build_object('eligible',false,'reason','supplier_order_not_reconciled','interfaceVersion',1); END IF;
SELECT * INTO v_s FROM private.supplier_foundation_suppliers WHERE id=v_h.supplier_id AND lifecycle_status='approved';
IF NOT FOUND THEN RETURN jsonb_build_object('eligible',false,'reason','supplier_not_approved','interfaceVersion',1); END IF;
SELECT * INTO v_adapter FROM private.supplier_adapter_registrations a WHERE a.supplier_id=v_h.supplier_id AND a.status='active' AND a.interface_version=1 AND a.capabilities @> ARRAY['tracking']::text[] ORDER BY a.verified_at DESC LIMIT 1;
IF NOT FOUND THEN RETURN jsonb_build_object('eligible',false,'reason','tracking_adapter_not_ready','interfaceVersion',1); END IF;
RETURN jsonb_build_object('eligible',true,'reason','supplier_tracking_ready','handshakeId',v_h.id,'orderId',v_h.order_id,'orchestrationId',v_h.orchestration_id,'fulfilmentLegId',v_h.fulfilment_leg_id,'supplierId',v_h.supplier_id,'supplierKey',v_s.supplier_key,'providerKey',v_adapter.provider_key,'adapterVersion',v_adapter.adapter_version,'supplierOrderRef',v_h.external_supplier_order_ref,'correlationId',v_h.correlation_id,'interfaceVersion',1);
END; $$;
REVOKE ALL ON FUNCTION public.server_supplier_tracking_context_v1(uuid) FROM PUBLIC, anon, authenticated; GRANT EXECUTE ON FUNCTION public.server_supplier_tracking_context_v1(uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.server_ingest_supplier_tracking_event_v1(p_handshake_id uuid,p_provider_status text,p_carrier_ref text,p_tracking_ref text,p_provider_event_ref text,p_occurred_at timestamptz,p_raw_evidence jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE v_h private.supplier_order_handshakes%ROWTYPE; v_leg private.supplier_fulfilment_legs%ROWTYPE; v_mapping private.supplier_tracking_status_mappings%ROWTYPE; v_ship private.supplier_leg_shipments%ROWTYPE; v_event private.supplier_tracking_events%ROWTYPE; v_control jsonb; v_status text; v_fingerprint text; v_progress integer; v_current_progress integer;
BEGIN
IF NULLIF(BTRIM(p_provider_status),'') IS NULL OR p_occurred_at IS NULL OR jsonb_typeof(COALESCE(p_raw_evidence,'{}'::jsonb))<>'object' THEN RAISE EXCEPTION 'valid provider status, occurred_at and object evidence are required'; END IF;
SELECT * INTO v_h FROM private.supplier_order_handshakes WHERE id=p_handshake_id FOR UPDATE;
IF NOT FOUND OR v_h.state<>'reconciled' OR v_h.acknowledgement_state<>'accepted' OR v_h.external_supplier_order_ref IS NULL THEN RETURN jsonb_build_object('ok',false,'reason','supplier_order_not_reconciled','interfaceVersion',1); END IF;
v_control:=public.server_supplier_commerce_control_decision_v1('tracking_ingest',jsonb_build_object('supplierRef',v_h.supplier_id::text,'offerRef',v_h.supplier_offer_id::text,'productRef',NULL,'territory',NULL));
IF COALESCE((v_control->>'enabled')::boolean,false) IS DISTINCT FROM true THEN RETURN jsonb_build_object('ok',false,'reason','tracking_ingest_control_disabled','control',v_control,'interfaceVersion',1); END IF;
SELECT * INTO v_mapping FROM private.supplier_tracking_status_mappings m WHERE m.provider_key=v_h.provider_key AND lower(m.provider_status)=lower(BTRIM(p_provider_status)) AND m.status='approved' AND m.effective_from<=p_occurred_at AND (m.effective_to IS NULL OR m.effective_to>p_occurred_at) ORDER BY m.version DESC LIMIT 1;
IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'reason','tracking_status_mapping_missing','providerStatus',p_provider_status,'interfaceVersion',1); END IF; v_status:=v_mapping.canonical_status;
SELECT * INTO v_leg FROM private.supplier_fulfilment_legs WHERE id=v_h.fulfilment_leg_id FOR UPDATE; IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'reason','fulfilment_leg_missing','interfaceVersion',1); END IF;
INSERT INTO private.supplier_leg_shipments(order_id,orchestration_id,fulfilment_leg_id,handshake_id,supplier_id,provider_key,external_supplier_order_ref,carrier_ref,tracking_ref,canonical_status,last_event_at,last_ingested_at)
VALUES(v_h.order_id,v_h.orchestration_id,v_h.fulfilment_leg_id,v_h.id,v_h.supplier_id,v_h.provider_key,v_h.external_supplier_order_ref,NULLIF(BTRIM(p_carrier_ref),''),NULLIF(BTRIM(p_tracking_ref),''),'accepted',p_occurred_at,now()) ON CONFLICT(fulfilment_leg_id) DO NOTHING;
SELECT * INTO v_ship FROM private.supplier_leg_shipments WHERE fulfilment_leg_id=v_h.fulfilment_leg_id FOR UPDATE;
IF v_ship.provider_key<>v_h.provider_key OR v_ship.external_supplier_order_ref<>v_h.external_supplier_order_ref THEN RAISE EXCEPTION 'supplier tracking shipment identity mismatch'; END IF;
IF v_ship.tracking_ref IS NOT NULL AND NULLIF(BTRIM(p_tracking_ref),'') IS NOT NULL AND v_ship.tracking_ref<>BTRIM(p_tracking_ref) THEN RAISE EXCEPTION 'tracking reference cannot change once established'; END IF;
v_fingerprint:=md5(concat_ws('|',v_h.id::text,lower(BTRIM(p_provider_status)),COALESCE(BTRIM(p_carrier_ref),''),COALESCE(BTRIM(p_tracking_ref),''),COALESCE(BTRIM(p_provider_event_ref),''),p_occurred_at::text));
INSERT INTO private.supplier_tracking_events(shipment_id,provider_key,provider_status,canonical_status,mapping_id,carrier_ref,tracking_ref,provider_event_ref,event_fingerprint,occurred_at,raw_evidence)
VALUES(v_ship.id,v_h.provider_key,BTRIM(p_provider_status),v_status,v_mapping.id,NULLIF(BTRIM(p_carrier_ref),''),NULLIF(BTRIM(p_tracking_ref),''),NULLIF(BTRIM(p_provider_event_ref),''),v_fingerprint,p_occurred_at,COALESCE(p_raw_evidence,'{}'::jsonb)) ON CONFLICT(event_fingerprint) DO NOTHING RETURNING * INTO v_event;
IF v_event.id IS NULL THEN SELECT * INTO v_event FROM private.supplier_tracking_events WHERE event_fingerprint=v_fingerprint; RETURN jsonb_build_object('ok',true,'reason','tracking_event_replayed','shipmentId',v_ship.id,'eventId',v_event.id,'canonicalStatus',v_event.canonical_status,'interfaceVersion',1); END IF;
v_progress:=CASE v_status WHEN 'pending' THEN 0 WHEN 'accepted' THEN 1 WHEN 'dispatched' THEN 2 WHEN 'in_transit' THEN 3 WHEN 'out_for_delivery' THEN 4 WHEN 'delivered' THEN 5 WHEN 'returned' THEN 6 ELSE -1 END;
v_current_progress:=CASE v_ship.canonical_status WHEN 'pending' THEN 0 WHEN 'accepted' THEN 1 WHEN 'dispatched' THEN 2 WHEN 'in_transit' THEN 3 WHEN 'out_for_delivery' THEN 4 WHEN 'delivered' THEN 5 WHEN 'returned' THEN 6 ELSE -1 END;
IF v_status IN ('exception','failed_delivery') OR v_progress>=v_current_progress THEN
UPDATE private.supplier_leg_shipments SET carrier_ref=COALESCE(carrier_ref,NULLIF(BTRIM(p_carrier_ref),'')),tracking_ref=COALESCE(tracking_ref,NULLIF(BTRIM(p_tracking_ref),'')),canonical_status=v_status,dispatched_at=CASE WHEN v_status IN ('dispatched','in_transit','out_for_delivery','delivered') THEN COALESCE(dispatched_at,p_occurred_at) ELSE dispatched_at END,delivered_at=CASE WHEN v_status='delivered' THEN COALESCE(delivered_at,p_occurred_at) ELSE delivered_at END,last_event_at=GREATEST(COALESCE(last_event_at,p_occurred_at),p_occurred_at),last_ingested_at=now(),updated_at=now() WHERE id=v_ship.id RETURNING * INTO v_ship;
ELSE UPDATE private.supplier_leg_shipments SET last_ingested_at=now(),updated_at=now() WHERE id=v_ship.id RETURNING * INTO v_ship; END IF;
RETURN jsonb_build_object('ok',true,'reason','tracking_event_ingested','shipmentId',v_ship.id,'eventId',v_event.id,'canonicalStatus',v_status,'mappingVersion',v_mapping.version,'interfaceVersion',1);
END; $$;
REVOKE ALL ON FUNCTION public.server_ingest_supplier_tracking_event_v1(uuid,text,text,text,text,timestamptz,jsonb) FROM PUBLIC, anon, authenticated; GRANT EXECUTE ON FUNCTION public.server_ingest_supplier_tracking_event_v1(uuid,text,text,text,text,timestamptz,jsonb) TO service_role;
COMMENT ON FUNCTION public.server_ingest_supplier_tracking_event_v1(uuid,text,text,text,text,timestamptz,jsonb) IS 'Phase K provider-neutral tracking ingestion. Requires approved mapping + tracking_ingest control and preserves append-only raw evidence.';;
