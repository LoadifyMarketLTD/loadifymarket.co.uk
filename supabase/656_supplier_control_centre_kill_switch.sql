-- 656_supplier_control_centre_kill_switch.sql
-- Phase M atomic scoped kill switch + incident visibility + control-centre snapshot.
-- Kill-switch RPC can only disable; it cannot enable Supplier Commerce.

CREATE OR REPLACE FUNCTION public.server_admin_supplier_kill_switch_v1(
  p_actor_id uuid,
  p_scope_type text,
  p_scope_ref text,
  p_reason text,
  p_severity text DEFAULT 'high'
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE
  v_scope_type text:=lower(BTRIM(COALESCE(p_scope_type,'')));
  v_scope_ref text:=NULLIF(BTRIM(p_scope_ref),'');
  v_reason text:=NULLIF(BTRIM(p_reason),'');
  v_severity text:=lower(BTRIM(COALESCE(p_severity,'')));
  v_control private.supplier_commerce_controls%ROWTYPE;
  v_previous boolean; v_previous_version integer;
  v_incident private.supplier_commerce_incidents%ROWTYPE;
  v_incident_key text; v_supplier_id uuid; v_provider_ref text;
BEGIN
  PERFORM private.require_active_admin_v1(p_actor_id);
  IF v_scope_type NOT IN ('supplier','provider') OR v_scope_ref IS NULL OR v_reason IS NULL OR v_severity NOT IN ('critical','high','medium','low') THEN
    RAISE EXCEPTION 'complete supplier/provider kill switch request is required';
  END IF;

  IF v_scope_type='supplier' THEN
    SELECT s.id INTO v_supplier_id FROM private.supplier_foundation_suppliers s
     WHERE s.id::text=v_scope_ref OR s.supplier_key=v_scope_ref LIMIT 1;
    IF v_supplier_id IS NULL THEN RAISE EXCEPTION 'supplier kill switch target not found'; END IF;
  ELSE
    v_provider_ref:=v_scope_ref;
  END IF;

  SELECT * INTO v_control FROM private.supplier_commerce_controls
   WHERE operation='*' AND scope_type=v_scope_type AND scope_ref=v_scope_ref FOR UPDATE;
  v_previous:=CASE WHEN FOUND THEN v_control.enabled ELSE NULL END;
  v_previous_version:=CASE WHEN FOUND THEN v_control.version ELSE NULL END;

  IF FOUND THEN
    UPDATE private.supplier_commerce_controls SET enabled=false,reason=v_reason,version=version+1,updated_by=p_actor_id,updated_at=now()
     WHERE id=v_control.id RETURNING * INTO v_control;
  ELSE
    INSERT INTO private.supplier_commerce_controls(operation,scope_type,scope_ref,enabled,reason,version,updated_by)
    VALUES('*',v_scope_type,v_scope_ref,false,v_reason,1,p_actor_id) RETURNING * INTO v_control;
  END IF;

  INSERT INTO private.supplier_commerce_control_audit(
    control_id,actor_id,operation,scope_type,scope_ref,previous_enabled,new_enabled,previous_version,new_version,reason
  ) VALUES(v_control.id,p_actor_id,'*',v_scope_type,v_scope_ref,v_previous,false,v_previous_version,v_control.version,v_reason);

  v_incident_key:='phase-m-kill:'||v_scope_type||':'||v_scope_ref;
  INSERT INTO private.supplier_commerce_incidents(
    incident_key,severity,status,title,owner_id,provider_ref,supplier_ref,capability,customer_impact,financial_impact,mitigation,opened_at,updated_at
  ) VALUES(
    v_incident_key,v_severity,'mitigating','Supplier Commerce kill switch activated',p_actor_id,
    CASE WHEN v_scope_type='provider' THEN v_scope_ref END,
    CASE WHEN v_scope_type='supplier' THEN v_scope_ref END,
    'supplier_commerce','Supplier Commerce operations for this scope are blocked','New Supplier Commerce financial exposure is blocked',v_reason,now(),now()
  ) ON CONFLICT(incident_key) DO UPDATE SET
    severity=EXCLUDED.severity,status='mitigating',owner_id=EXCLUDED.owner_id,mitigation=EXCLUDED.mitigation,updated_at=now(),closed_at=NULL
  RETURNING * INTO v_incident;

  INSERT INTO private.supplier_control_centre_actions(action_key,actor_id,supplier_id,provider_ref,action_type,reason,incident_id,evidence)
  VALUES(
    'kill:'||v_scope_type||':'||v_scope_ref||':'||v_control.version::text,p_actor_id,v_supplier_id,v_provider_ref,
    CASE WHEN v_scope_type='supplier' THEN 'supplier_kill_switch' ELSE 'provider_kill_switch' END,
    v_reason,v_incident.id,jsonb_build_object('controlId',v_control.id,'controlVersion',v_control.version,'previousEnabled',v_previous)
  );

  RETURN jsonb_build_object('ok',true,'scopeType',v_scope_type,'scopeRef',v_scope_ref,'enabled',false,'controlVersion',v_control.version,'incidentId',v_incident.id,'interfaceVersion',1);
END;
$$;
REVOKE ALL ON FUNCTION public.server_admin_supplier_kill_switch_v1(uuid,text,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_admin_supplier_kill_switch_v1(uuid,text,text,text,text) TO service_role;

CREATE OR REPLACE FUNCTION public.server_admin_transition_supplier_commerce_incident_v1(
  p_actor_id uuid,p_incident_id uuid,p_status text,p_mitigation text,p_recovery_evidence text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE v_incident private.supplier_commerce_incidents%ROWTYPE; v_status text:=lower(BTRIM(COALESCE(p_status,'')));
BEGIN
  PERFORM private.require_active_admin_v1(p_actor_id);
  IF v_status NOT IN ('open','mitigating','monitoring','resolved','closed') THEN RAISE EXCEPTION 'invalid incident state'; END IF;
  SELECT * INTO v_incident FROM private.supplier_commerce_incidents WHERE id=p_incident_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'reason','incident_not_found','interfaceVersion',1); END IF;
  IF v_incident.status='closed' AND v_status<>'closed' THEN RAISE EXCEPTION 'closed incident cannot regress'; END IF;
  IF v_status IN ('resolved','closed') AND NULLIF(BTRIM(COALESCE(p_recovery_evidence,'')),'') IS NULL THEN
    RAISE EXCEPTION 'incident resolution requires recovery evidence';
  END IF;

  UPDATE private.supplier_commerce_incidents SET
    status=v_status,owner_id=p_actor_id,
    mitigation=COALESCE(NULLIF(BTRIM(p_mitigation),''),mitigation),
    recovery_evidence=COALESCE(NULLIF(BTRIM(p_recovery_evidence),''),recovery_evidence),
    updated_at=now(),closed_at=CASE WHEN v_status='closed' THEN now() ELSE closed_at END
  WHERE id=p_incident_id RETURNING * INTO v_incident;

  INSERT INTO private.supplier_control_centre_actions(action_key,actor_id,provider_ref,action_type,reason,incident_id,evidence)
  VALUES('incident:'||v_incident.id::text||':'||v_status||':'||extract(epoch from v_incident.updated_at)::bigint::text,p_actor_id,v_incident.provider_ref,'incident_transition','Incident transitioned to '||v_status,v_incident.id,jsonb_build_object('status',v_status,'supplierRef',v_incident.supplier_ref));
  RETURN jsonb_build_object('ok',true,'incidentId',v_incident.id,'status',v_incident.status,'interfaceVersion',1);
END;
$$;
REVOKE ALL ON FUNCTION public.server_admin_transition_supplier_commerce_incident_v1(uuid,uuid,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_admin_transition_supplier_commerce_incident_v1(uuid,uuid,text,text,text) TO service_role;

CREATE OR REPLACE FUNCTION public.server_admin_supplier_control_centre_v1(
  p_actor_id uuid,p_supplier_id uuid DEFAULT NULL,p_provider_ref text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE v_supplier private.supplier_foundation_suppliers%ROWTYPE; v_supplier_ref text; v_supplier_key text;
BEGIN
  PERFORM private.require_active_admin_v1(p_actor_id);
  IF p_supplier_id IS NOT NULL THEN
    SELECT * INTO v_supplier FROM private.supplier_foundation_suppliers WHERE id=p_supplier_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'supplier not found'; END IF;
    v_supplier_ref:=v_supplier.id::text; v_supplier_key:=v_supplier.supplier_key;
  END IF;

  RETURN jsonb_build_object(
    'supplier',CASE WHEN p_supplier_id IS NULL THEN NULL ELSE to_jsonb(v_supplier) END,
    'securityPosture',(SELECT to_jsonb(s) FROM private.supplier_security_posture s WHERE s.supplier_id=p_supplier_id),
    'activeSla',(SELECT to_jsonb(s) FROM private.supplier_sla_versions s WHERE s.supplier_id=p_supplier_id AND s.status='active' AND s.effective_from<=now() AND (s.effective_to IS NULL OR s.effective_to>now()) LIMIT 1),
    'latestRisk',(SELECT to_jsonb(r) FROM private.supplier_risk_assessments r WHERE r.supplier_id=p_supplier_id ORDER BY r.assessed_at DESC LIMIT 1),
    'openSlaBreaches',(SELECT COALESCE(jsonb_agg(to_jsonb(b) ORDER BY b.occurred_at DESC),'[]'::jsonb) FROM private.supplier_sla_breach_events b WHERE (p_supplier_id IS NULL OR b.supplier_id=p_supplier_id) AND b.state NOT IN ('resolved','waived')),
    'incidents',(SELECT COALESCE(jsonb_agg(to_jsonb(i) ORDER BY i.opened_at DESC),'[]'::jsonb) FROM private.supplier_commerce_incidents i WHERE
      (p_supplier_id IS NULL OR i.supplier_ref IN (v_supplier_ref,v_supplier_key)) AND
      (NULLIF(BTRIM(p_provider_ref),'') IS NULL OR i.provider_ref=BTRIM(p_provider_ref)) AND i.status<>'closed'),
    'controls',(SELECT COALESCE(jsonb_agg(to_jsonb(c) ORDER BY c.updated_at DESC),'[]'::jsonb) FROM private.supplier_commerce_controls c WHERE
      (p_supplier_id IS NULL OR (c.scope_type='supplier' AND c.scope_ref IN (v_supplier_ref,v_supplier_key))) OR
      (NULLIF(BTRIM(p_provider_ref),'') IS NOT NULL AND c.scope_type='provider' AND c.scope_ref=BTRIM(p_provider_ref)) OR
      c.scope_type='global'),
    'recentOperations',(SELECT COALESCE(jsonb_agg(to_jsonb(o) ORDER BY o.created_at DESC),'[]'::jsonb) FROM (
      SELECT o.* FROM private.supplier_commerce_operations o WHERE
        (p_supplier_id IS NULL OR o.supplier_ref IN (v_supplier_ref,v_supplier_key)) AND
        (NULLIF(BTRIM(p_provider_ref),'') IS NULL OR o.provider_ref=BTRIM(p_provider_ref))
      ORDER BY o.created_at DESC LIMIT 100
    ) o),
    'recoveryQueue',(SELECT COALESCE(jsonb_agg(to_jsonb(q) ORDER BY q.created_at DESC),'[]'::jsonb) FROM private.supplier_commerce_recovery_queue q WHERE q.status NOT IN ('resolved','cancelled')),
    'actions',(SELECT COALESCE(jsonb_agg(to_jsonb(a) ORDER BY a.created_at DESC),'[]'::jsonb) FROM (
      SELECT a.* FROM private.supplier_control_centre_actions a WHERE (p_supplier_id IS NULL OR a.supplier_id=p_supplier_id) AND (NULLIF(BTRIM(p_provider_ref),'') IS NULL OR a.provider_ref=BTRIM(p_provider_ref)) ORDER BY a.created_at DESC LIMIT 100
    ) a),
    'interfaceVersion',1
  );
END;
$$;
REVOKE ALL ON FUNCTION public.server_admin_supplier_control_centre_v1(uuid,uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_admin_supplier_control_centre_v1(uuid,uuid,text) TO service_role;

COMMENT ON FUNCTION public.server_admin_supplier_kill_switch_v1(uuid,text,text,text,text) IS 'Phase M emergency scoped kill switch. This RPC can only create or move a scoped wildcard control to disabled=false commerce authorization state; it never enables commerce.';
COMMENT ON FUNCTION public.server_admin_supplier_control_centre_v1(uuid,uuid,text) IS 'Phase M active-admin-only operational visibility across supplier security, SLA, risk, controls, incidents, recovery and operations.';
