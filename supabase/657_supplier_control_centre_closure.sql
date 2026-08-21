-- 657_supplier_control_centre_closure.sql
-- Phase M Branch Guard closure: immutable governance history, SLA breach transition boundary,
-- and fail-closed supplier governance decision for downstream pilot/runtime gates.

CREATE OR REPLACE FUNCTION private.guard_supplier_control_history_immutable_v1()
RETURNS trigger LANGUAGE plpgsql SET search_path TO '' AS $$
BEGIN
  RAISE EXCEPTION 'Supplier Control Centre governance history is append-only';
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_supplier_security_audit_immutable_v1 ON private.supplier_security_posture_audit;
CREATE TRIGGER trg_guard_supplier_security_audit_immutable_v1 BEFORE UPDATE OR DELETE ON private.supplier_security_posture_audit
FOR EACH ROW EXECUTE FUNCTION private.guard_supplier_control_history_immutable_v1();
DROP TRIGGER IF EXISTS trg_guard_supplier_risk_assessment_immutable_v1 ON private.supplier_risk_assessments;
CREATE TRIGGER trg_guard_supplier_risk_assessment_immutable_v1 BEFORE UPDATE OR DELETE ON private.supplier_risk_assessments
FOR EACH ROW EXECUTE FUNCTION private.guard_supplier_control_history_immutable_v1();
DROP TRIGGER IF EXISTS trg_guard_supplier_control_actions_immutable_v1 ON private.supplier_control_centre_actions;
CREATE TRIGGER trg_guard_supplier_control_actions_immutable_v1 BEFORE UPDATE OR DELETE ON private.supplier_control_centre_actions
FOR EACH ROW EXECUTE FUNCTION private.guard_supplier_control_history_immutable_v1();

CREATE OR REPLACE FUNCTION private.guard_supplier_risk_policy_history_v1()
RETURNS trigger LANGUAGE plpgsql SET search_path TO '' AS $$
BEGIN
  IF OLD.status IN ('superseded','retired') THEN RAISE EXCEPTION 'historical supplier risk policy is immutable'; END IF;
  IF OLD.status='active' AND NEW.status NOT IN ('active','superseded') THEN RAISE EXCEPTION 'active supplier risk policy may only remain active or become superseded'; END IF;
  IF OLD.status='active' AND (
    NEW.version IS DISTINCT FROM OLD.version OR NEW.amber_score IS DISTINCT FROM OLD.amber_score OR NEW.red_score IS DISTINCT FROM OLD.red_score OR
    NEW.max_open_high_incidents IS DISTINCT FROM OLD.max_open_high_incidents OR NEW.max_open_critical_incidents IS DISTINCT FROM OLD.max_open_critical_incidents OR
    NEW.max_sla_breaches_30d IS DISTINCT FROM OLD.max_sla_breaches_30d OR NEW.stale_security_hours IS DISTINCT FROM OLD.stale_security_hours OR
    NEW.evidence IS DISTINCT FROM OLD.evidence OR NEW.effective_from IS DISTINCT FROM OLD.effective_from
  ) THEN RAISE EXCEPTION 'active supplier risk policy terms are immutable'; END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_supplier_risk_policy_history_v1 ON private.supplier_risk_policy_versions;
CREATE TRIGGER trg_guard_supplier_risk_policy_history_v1 BEFORE UPDATE OR DELETE ON private.supplier_risk_policy_versions
FOR EACH ROW EXECUTE FUNCTION private.guard_supplier_risk_policy_history_v1();

CREATE OR REPLACE FUNCTION public.server_admin_transition_supplier_sla_breach_v1(
  p_actor_id uuid,p_breach_id uuid,p_state text,p_resolution text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE v_breach private.supplier_sla_breach_events%ROWTYPE; v_state text:=lower(BTRIM(COALESCE(p_state,'')));
BEGIN
  PERFORM private.require_active_admin_v1(p_actor_id);
  IF v_state NOT IN ('acknowledged','mitigating','resolved','waived') THEN RAISE EXCEPTION 'invalid SLA breach transition'; END IF;
  SELECT * INTO v_breach FROM private.supplier_sla_breach_events WHERE id=p_breach_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'reason','sla_breach_not_found','interfaceVersion',1); END IF;
  IF v_breach.state IN ('resolved','waived') AND v_state<>v_breach.state THEN RAISE EXCEPTION 'terminal SLA breach cannot regress'; END IF;
  IF v_state IN ('resolved','waived') AND NULLIF(BTRIM(COALESCE(p_resolution,'')),'') IS NULL THEN RAISE EXCEPTION 'terminal SLA breach transition requires resolution evidence'; END IF;

  UPDATE private.supplier_sla_breach_events SET state=v_state,resolution=COALESCE(NULLIF(BTRIM(p_resolution),''),resolution),
    resolved_by=CASE WHEN v_state IN ('resolved','waived') THEN p_actor_id ELSE resolved_by END,
    resolved_at=CASE WHEN v_state IN ('resolved','waived') THEN COALESCE(resolved_at,now()) ELSE resolved_at END
  WHERE id=p_breach_id RETURNING * INTO v_breach;

  INSERT INTO private.supplier_control_centre_actions(action_key,actor_id,supplier_id,action_type,reason,evidence)
  VALUES('sla-transition:'||v_breach.id::text||':'||v_state||':'||extract(epoch from now())::bigint::text,p_actor_id,v_breach.supplier_id,'sla_breach_transition','SLA breach transitioned to '||v_state,jsonb_build_object('breachId',v_breach.id,'resolution',v_breach.resolution));
  RETURN jsonb_build_object('ok',true,'breachId',v_breach.id,'state',v_breach.state,'interfaceVersion',1);
END;
$$;
REVOKE ALL ON FUNCTION public.server_admin_transition_supplier_sla_breach_v1(uuid,uuid,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_admin_transition_supplier_sla_breach_v1(uuid,uuid,text,text) TO service_role;

CREATE OR REPLACE FUNCTION public.server_supplier_governance_decision_v1(
  p_supplier_id uuid,p_provider_ref text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE
  v_supplier private.supplier_foundation_suppliers%ROWTYPE;
  v_security private.supplier_security_posture%ROWTYPE;
  v_risk private.supplier_risk_assessments%ROWTYPE;
  v_policy private.supplier_risk_policy_versions%ROWTYPE;
  v_control private.supplier_commerce_controls%ROWTYPE;
  v_critical_incidents integer:=0; v_critical_breaches integer:=0;
BEGIN
  SELECT * INTO v_supplier FROM private.supplier_foundation_suppliers WHERE id=p_supplier_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('eligible',false,'reason','supplier_not_found','interfaceVersion',1); END IF;
  IF v_supplier.lifecycle_status<>'approved' THEN RETURN jsonb_build_object('eligible',false,'reason','supplier_not_approved','lifecycleStatus',v_supplier.lifecycle_status,'interfaceVersion',1); END IF;

  SELECT * INTO v_control FROM private.supplier_commerce_controls
   WHERE operation='*' AND scope_type='supplier' AND scope_ref IN (p_supplier_id::text,v_supplier.supplier_key) AND enabled=false
   ORDER BY updated_at DESC LIMIT 1;
  IF FOUND THEN RETURN jsonb_build_object('eligible',false,'reason','supplier_kill_switch_active','controlVersion',v_control.version,'interfaceVersion',1); END IF;
  IF NULLIF(BTRIM(p_provider_ref),'') IS NOT NULL AND EXISTS(
    SELECT 1 FROM private.supplier_commerce_controls c WHERE c.operation='*' AND c.scope_type='provider' AND c.scope_ref=BTRIM(p_provider_ref) AND c.enabled=false
  ) THEN RETURN jsonb_build_object('eligible',false,'reason','provider_kill_switch_active','interfaceVersion',1); END IF;

  SELECT * INTO v_security FROM private.supplier_security_posture WHERE supplier_id=p_supplier_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('eligible',false,'reason','security_posture_missing','interfaceVersion',1); END IF;
  IF v_security.state IN ('red','blocked') THEN RETURN jsonb_build_object('eligible',false,'reason','supplier_security_blocked','securityState',v_security.state,'interfaceVersion',1); END IF;
  IF v_security.reverify_due_at<=now() THEN RETURN jsonb_build_object('eligible',false,'reason','supplier_security_stale','interfaceVersion',1); END IF;

  SELECT * INTO v_policy FROM private.supplier_risk_policy_versions WHERE status='active' AND effective_from<=now() AND (effective_to IS NULL OR effective_to>now()) LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('eligible',false,'reason','active_risk_policy_missing','interfaceVersion',1); END IF;
  SELECT * INTO v_risk FROM private.supplier_risk_assessments WHERE supplier_id=p_supplier_id AND policy_version_id=v_policy.id ORDER BY assessed_at DESC LIMIT 1;
  IF NOT FOUND OR v_risk.assessed_at<now()-interval '24 hours' THEN RETURN jsonb_build_object('eligible',false,'reason','supplier_risk_assessment_missing_or_stale','interfaceVersion',1); END IF;
  IF v_risk.risk_class='red' OR v_risk.recommended_action IN ('suspend','kill_switch') THEN RETURN jsonb_build_object('eligible',false,'reason','supplier_risk_blocked','riskClass',v_risk.risk_class,'recommendedAction',v_risk.recommended_action,'interfaceVersion',1); END IF;

  SELECT count(*) INTO v_critical_incidents FROM private.supplier_commerce_incidents i
   WHERE i.supplier_ref IN (p_supplier_id::text,v_supplier.supplier_key) AND i.severity='critical' AND i.status NOT IN ('resolved','closed');
  IF v_critical_incidents>0 THEN RETURN jsonb_build_object('eligible',false,'reason','critical_supplier_incident_open','count',v_critical_incidents,'interfaceVersion',1); END IF;
  SELECT count(*) INTO v_critical_breaches FROM private.supplier_sla_breach_events b
   WHERE b.supplier_id=p_supplier_id AND b.severity='critical' AND b.state NOT IN ('resolved','waived');
  IF v_critical_breaches>0 THEN RETURN jsonb_build_object('eligible',false,'reason','critical_supplier_sla_breach_open','count',v_critical_breaches,'interfaceVersion',1); END IF;

  RETURN jsonb_build_object('eligible',true,'reason','supplier_governance_ready','supplierId',p_supplier_id,
    'securityState',v_security.state,'riskClass',v_risk.risk_class,'riskScore',v_risk.score,'policyVersion',v_policy.version,'interfaceVersion',1);
END;
$$;
REVOKE ALL ON FUNCTION public.server_supplier_governance_decision_v1(uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_supplier_governance_decision_v1(uuid,text) TO service_role;

COMMENT ON FUNCTION public.server_supplier_governance_decision_v1(uuid,text) IS 'Phase M fail-closed governance gate: lifecycle + kill switch + security posture + current risk + critical incident/SLA truth.';
