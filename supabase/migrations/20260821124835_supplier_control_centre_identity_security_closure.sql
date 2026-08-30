-- 658_supplier_control_centre_identity_security_closure.sql
-- Phase M Branch Guard closure: a supplier kill switch must bind to the exact canonical
-- supplier UUID used by runtime scope decisions, and a green security posture may not
-- coexist with a failed/unknown security component.

ALTER TABLE private.supplier_security_posture
  DROP CONSTRAINT IF EXISTS supplier_security_green_consistency_check;
ALTER TABLE private.supplier_security_posture
  ADD CONSTRAINT supplier_security_green_consistency_check CHECK (
    state <> 'green' OR (
      adapter_auth_state='pass' AND secret_storage_state='pass' AND credential_rotation_state='pass'
      AND webhook_verification_state IN ('pass','not_applicable') AND least_privilege_state='pass'
      AND config_integrity_state='pass'
    )
  );

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
  v_requested_scope_ref text:=NULLIF(BTRIM(p_scope_ref),'');
  v_reason text:=NULLIF(BTRIM(p_reason),'');
  v_severity text:=lower(BTRIM(COALESCE(p_severity,'')));
  v_control private.supplier_commerce_controls%ROWTYPE;
  v_previous boolean; v_previous_version integer; v_existing_found boolean:=false;
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
    v_scope_ref:=v_supplier_id::text;
  ELSE
    v_provider_ref:=v_scope_ref;
  END IF;

  SELECT * INTO v_control FROM private.supplier_commerce_controls
   WHERE operation='*' AND scope_type=v_scope_type AND scope_ref=v_scope_ref FOR UPDATE;
  v_existing_found:=FOUND;
  v_previous:=CASE WHEN v_existing_found THEN v_control.enabled ELSE NULL END;
  v_previous_version:=CASE WHEN v_existing_found THEN v_control.version ELSE NULL END;

  IF v_existing_found THEN
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
    v_reason,v_incident.id,jsonb_build_object('controlId',v_control.id,'controlVersion',v_control.version,'previousEnabled',v_previous,'requestedScopeRef',v_requested_scope_ref,'canonicalScopeRef',v_scope_ref)
  );

  RETURN jsonb_build_object('ok',true,'scopeType',v_scope_type,'scopeRef',v_scope_ref,'requestedScopeRef',v_requested_scope_ref,'enabled',false,'controlVersion',v_control.version,'incidentId',v_incident.id,'interfaceVersion',1);
END;
$$;
REVOKE ALL ON FUNCTION public.server_admin_supplier_kill_switch_v1(uuid,text,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_admin_supplier_kill_switch_v1(uuid,text,text,text,text) TO service_role;

COMMENT ON FUNCTION public.server_admin_supplier_kill_switch_v1(uuid,text,text,text,text) IS 'Phase M emergency kill switch. Supplier aliases are resolved and persisted as canonical UUID scope_ref so runtime scoped controls cannot be bypassed by identity mismatch.';;
