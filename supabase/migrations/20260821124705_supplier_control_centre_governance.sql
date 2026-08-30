-- 655_supplier_control_centre_governance.sql
-- Phase M governance RPCs: active-admin mutation, versioned risk policy, security posture,
-- append-only SLA breach evidence and deterministic risk assessment.

CREATE OR REPLACE FUNCTION private.require_active_admin_v1(p_actor_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
BEGIN
  IF p_actor_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.users u WHERE u.id=p_actor_id AND u.role='admin' AND u."isActive"=true
  ) THEN
    RAISE EXCEPTION 'active admin authority is required' USING ERRCODE='42501';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION private.require_active_admin_v1(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.require_active_admin_v1(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.server_admin_activate_supplier_risk_policy_v1(
  p_actor_id uuid,
  p_version integer,
  p_amber_score integer,
  p_red_score integer,
  p_max_open_high_incidents integer,
  p_max_open_critical_incidents integer,
  p_max_sla_breaches_30d integer,
  p_stale_security_hours integer,
  p_evidence jsonb
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE v_id uuid; v_now timestamptz:=now();
BEGIN
  PERFORM private.require_active_admin_v1(p_actor_id);
  IF p_version IS NULL OR p_version<=0 OR p_amber_score IS NULL OR p_red_score IS NULL
     OR p_amber_score<=0 OR p_red_score<=p_amber_score OR p_red_score>100
     OR p_max_open_high_incidents<0 OR p_max_open_critical_incidents<0 OR p_max_sla_breaches_30d<0
     OR p_stale_security_hours<=0 OR jsonb_typeof(COALESCE(p_evidence,'{}'::jsonb))<>'object' THEN
    RAISE EXCEPTION 'invalid supplier risk policy';
  END IF;

  UPDATE private.supplier_risk_policy_versions SET status='superseded',effective_to=v_now WHERE status='active';

  INSERT INTO private.supplier_risk_policy_versions(
    version,status,effective_from,amber_score,red_score,max_open_high_incidents,max_open_critical_incidents,
    max_sla_breaches_30d,stale_security_hours,evidence,created_by,approved_by,approved_at
  ) VALUES(
    p_version,'active',v_now,p_amber_score,p_red_score,p_max_open_high_incidents,p_max_open_critical_incidents,
    p_max_sla_breaches_30d,p_stale_security_hours,COALESCE(p_evidence,'{}'::jsonb),p_actor_id,p_actor_id,v_now
  ) RETURNING id INTO v_id;

  INSERT INTO private.supplier_control_centre_actions(action_key,actor_id,action_type,reason,evidence)
  VALUES('risk-policy:'||v_id::text,p_actor_id,'risk_policy_activate','Phase M supplier risk policy activated',jsonb_build_object('policyVersionId',v_id,'version',p_version));
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.server_admin_activate_supplier_risk_policy_v1(uuid,integer,integer,integer,integer,integer,integer,integer,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_admin_activate_supplier_risk_policy_v1(uuid,integer,integer,integer,integer,integer,integer,integer,jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.server_admin_set_supplier_security_posture_v1(
  p_actor_id uuid,p_supplier_id uuid,p_state text,p_adapter_auth_state text,p_secret_storage_state text,
  p_credential_rotation_state text,p_webhook_verification_state text,p_least_privilege_state text,
  p_config_integrity_state text,p_reverify_due_at timestamptz,p_evidence jsonb
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE v_old private.supplier_security_posture%ROWTYPE; v_new private.supplier_security_posture%ROWTYPE; v_evidence_text text;
BEGIN
  PERFORM private.require_active_admin_v1(p_actor_id);
  IF NOT EXISTS(SELECT 1 FROM private.supplier_foundation_suppliers s WHERE s.id=p_supplier_id) THEN RAISE EXCEPTION 'supplier not found'; END IF;
  IF lower(BTRIM(COALESCE(p_state,''))) NOT IN ('green','amber','red','blocked') THEN RAISE EXCEPTION 'invalid supplier security state'; END IF;
  IF p_reverify_due_at IS NULL OR p_reverify_due_at<=now() THEN RAISE EXCEPTION 'security posture requires a future reverify due time'; END IF;
  IF jsonb_typeof(COALESCE(p_evidence,'{}'::jsonb))<>'object' THEN RAISE EXCEPTION 'security evidence must be an object'; END IF;
  v_evidence_text:=lower(COALESCE(p_evidence::text,''));
  IF v_evidence_text ~ '(password|secret[_-]?key|api[_-]?key|access[_-]?token|refresh[_-]?token|private[_-]?key)["'' ]*:' THEN
    RAISE EXCEPTION 'raw secrets are forbidden in supplier security evidence';
  END IF;

  SELECT * INTO v_old FROM private.supplier_security_posture WHERE supplier_id=p_supplier_id;

  INSERT INTO private.supplier_security_posture(
    supplier_id,state,adapter_auth_state,secret_storage_state,credential_rotation_state,webhook_verification_state,
    least_privilege_state,config_integrity_state,last_verified_at,reverify_due_at,evidence,version,updated_by,updated_at
  ) VALUES(
    p_supplier_id,lower(BTRIM(p_state)),lower(BTRIM(p_adapter_auth_state)),lower(BTRIM(p_secret_storage_state)),
    lower(BTRIM(p_credential_rotation_state)),lower(BTRIM(p_webhook_verification_state)),lower(BTRIM(p_least_privilege_state)),
    lower(BTRIM(p_config_integrity_state)),now(),p_reverify_due_at,COALESCE(p_evidence,'{}'::jsonb),COALESCE(v_old.version,0)+1,p_actor_id,now()
  ) ON CONFLICT(supplier_id) DO UPDATE SET
    state=EXCLUDED.state,adapter_auth_state=EXCLUDED.adapter_auth_state,secret_storage_state=EXCLUDED.secret_storage_state,
    credential_rotation_state=EXCLUDED.credential_rotation_state,webhook_verification_state=EXCLUDED.webhook_verification_state,
    least_privilege_state=EXCLUDED.least_privilege_state,config_integrity_state=EXCLUDED.config_integrity_state,
    last_verified_at=EXCLUDED.last_verified_at,reverify_due_at=EXCLUDED.reverify_due_at,evidence=EXCLUDED.evidence,
    version=private.supplier_security_posture.version+1,updated_by=EXCLUDED.updated_by,updated_at=now()
  RETURNING * INTO v_new;

  INSERT INTO private.supplier_security_posture_audit(supplier_id,actor_id,previous_state,new_state,previous_version,new_version,evidence)
  VALUES(p_supplier_id,p_actor_id,v_old.state,v_new.state,v_old.version,v_new.version,v_new.evidence);
  INSERT INTO private.supplier_control_centre_actions(action_key,actor_id,supplier_id,action_type,reason,evidence)
  VALUES('security-posture:'||p_supplier_id::text||':'||v_new.version::text,p_actor_id,p_supplier_id,'security_posture_update','Supplier security posture updated',jsonb_build_object('state',v_new.state,'version',v_new.version));

  RETURN jsonb_build_object('ok',true,'supplierId',p_supplier_id,'state',v_new.state,'version',v_new.version,'interfaceVersion',1);
END;
$$;
REVOKE ALL ON FUNCTION public.server_admin_set_supplier_security_posture_v1(uuid,uuid,text,text,text,text,text,text,text,timestamptz,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_admin_set_supplier_security_posture_v1(uuid,uuid,text,text,text,text,text,text,text,timestamptz,jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.server_record_supplier_sla_breach_v1(
  p_supplier_id uuid,p_sla_version_id uuid,p_order_id uuid,p_fulfilment_leg_id uuid,p_breach_type text,
  p_severity text,p_threshold_value numeric,p_observed_value numeric,p_occurred_at timestamptz,
  p_customer_impact text,p_financial_impact text,p_evidence jsonb
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE v_key text; v_id uuid;
BEGIN
  IF p_supplier_id IS NULL OR p_sla_version_id IS NULL OR p_occurred_at IS NULL
     OR lower(BTRIM(COALESCE(p_breach_type,''))) NOT IN ('acknowledgement','dispatch','stock_freshness','price_freshness','tracking_deadline','refund_response','reimbursement_deadline','defect','stock_accuracy','cancellation')
     OR lower(BTRIM(COALESCE(p_severity,''))) NOT IN ('low','medium','high','critical')
     OR jsonb_typeof(COALESCE(p_evidence,'{}'::jsonb))<>'object' THEN
    RAISE EXCEPTION 'complete supplier SLA breach evidence is required';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM private.supplier_sla_versions s WHERE s.id=p_sla_version_id AND s.supplier_id=p_supplier_id) THEN
    RAISE EXCEPTION 'supplier SLA version mismatch';
  END IF;
  IF p_order_id IS NOT NULL AND p_fulfilment_leg_id IS NOT NULL AND NOT EXISTS(
    SELECT 1 FROM private.supplier_fulfilment_legs l WHERE l.id=p_fulfilment_leg_id AND l.order_id=p_order_id AND l.supplier_id=p_supplier_id
  ) THEN RAISE EXCEPTION 'SLA breach order/leg/supplier identity mismatch'; END IF;

  v_key:=encode(digest(concat_ws('|',p_supplier_id::text,p_sla_version_id::text,COALESCE(p_order_id::text,''),COALESCE(p_fulfilment_leg_id::text,''),lower(BTRIM(p_breach_type)),p_occurred_at::text),'sha256'),'hex');
  INSERT INTO private.supplier_sla_breach_events(
    breach_key,supplier_id,sla_version_id,order_id,fulfilment_leg_id,breach_type,severity,threshold_value,observed_value,
    occurred_at,customer_impact,financial_impact,evidence
  ) VALUES(
    v_key,p_supplier_id,p_sla_version_id,p_order_id,p_fulfilment_leg_id,lower(BTRIM(p_breach_type)),lower(BTRIM(p_severity)),
    p_threshold_value,p_observed_value,p_occurred_at,NULLIF(BTRIM(p_customer_impact),''),NULLIF(BTRIM(p_financial_impact),''),COALESCE(p_evidence,'{}'::jsonb)
  ) ON CONFLICT(breach_key) DO UPDATE SET breach_key=EXCLUDED.breach_key
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.server_record_supplier_sla_breach_v1(uuid,uuid,uuid,uuid,text,text,numeric,numeric,timestamptz,text,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_record_supplier_sla_breach_v1(uuid,uuid,uuid,uuid,text,text,numeric,numeric,timestamptz,text,text,jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.server_supplier_risk_assessment_v1(p_supplier_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE
  v_policy private.supplier_risk_policy_versions%ROWTYPE;
  v_supplier private.supplier_foundation_suppliers%ROWTYPE;
  v_security private.supplier_security_posture%ROWTYPE;
  v_high integer:=0; v_critical integer:=0; v_breaches integer:=0; v_score integer:=0;
  v_class text; v_action text; v_key text; v_id uuid; v_inputs jsonb;
BEGIN
  SELECT * INTO v_supplier FROM private.supplier_foundation_suppliers WHERE id=p_supplier_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ready',false,'reason','supplier_not_found','interfaceVersion',1); END IF;
  SELECT * INTO v_policy FROM private.supplier_risk_policy_versions
   WHERE status='active' AND effective_from<=now() AND (effective_to IS NULL OR effective_to>now()) LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('ready',false,'reason','active_risk_policy_missing','interfaceVersion',1); END IF;

  SELECT count(*) FILTER (WHERE severity='critical'),count(*) FILTER (WHERE severity='high')
    INTO v_critical,v_high FROM private.supplier_commerce_incidents
   WHERE supplier_ref IN (v_supplier.id::text,v_supplier.supplier_key) AND status<>'closed';
  SELECT count(*) INTO v_breaches FROM private.supplier_sla_breach_events
   WHERE supplier_id=p_supplier_id AND occurred_at>=now()-interval '30 days' AND state NOT IN ('resolved','waived');
  SELECT * INTO v_security FROM private.supplier_security_posture WHERE supplier_id=p_supplier_id;

  v_score:=LEAST(100,
    CASE WHEN v_supplier.lifecycle_status IN ('suspended','banned') THEN 100 WHEN v_supplier.lifecycle_status='restricted' THEN 30 ELSE 0 END
    + LEAST(50,v_critical*50)
    + LEAST(30,v_high*15)
    + LEAST(20,v_breaches*5)
    + CASE WHEN NOT FOUND OR v_security.state='unknown' THEN 20 WHEN v_security.state='amber' THEN 15 WHEN v_security.state IN ('red','blocked') THEN 40 ELSE 0 END
    + CASE WHEN v_security.reverify_due_at IS NOT NULL AND v_security.reverify_due_at<=now() THEN 15 ELSE 0 END
  );
  IF v_critical>v_policy.max_open_critical_incidents OR v_score>=v_policy.red_score OR COALESCE(v_security.state,'unknown') IN ('red','blocked') THEN
    v_class:='red'; v_action:=CASE WHEN v_critical>v_policy.max_open_critical_incidents OR COALESCE(v_security.state,'unknown')='blocked' THEN 'kill_switch' ELSE 'suspend' END;
  ELSIF v_high>v_policy.max_open_high_incidents OR v_breaches>v_policy.max_sla_breaches_30d OR v_score>=v_policy.amber_score THEN
    v_class:='amber'; v_action:='review';
  ELSE v_class:='green'; v_action:='monitor'; END IF;

  v_inputs:=jsonb_build_object('lifecycleStatus',v_supplier.lifecycle_status,'openCriticalIncidents',v_critical,'openHighIncidents',v_high,'openSlaBreaches30d',v_breaches,'securityState',COALESCE(v_security.state,'unknown'),'securityReverifyDueAt',v_security.reverify_due_at);
  v_key:=encode(digest(p_supplier_id::text||'|'||v_policy.id::text||'|'||v_inputs::text||'|'||date_trunc('minute',now())::text,'sha256'),'hex');
  INSERT INTO private.supplier_risk_assessments(assessment_key,supplier_id,policy_version_id,score,risk_class,recommended_action,inputs,evidence)
  VALUES(v_key,p_supplier_id,v_policy.id,v_score,v_class,v_action,v_inputs,jsonb_build_object('evaluatedBy','server_supplier_risk_assessment_v1'))
  ON CONFLICT(assessment_key) DO UPDATE SET assessment_key=EXCLUDED.assessment_key RETURNING id INTO v_id;

  RETURN jsonb_build_object('ready',true,'supplierId',p_supplier_id,'assessmentId',v_id,'score',v_score,'riskClass',v_class,'recommendedAction',v_action,'inputs',v_inputs,'policyVersion',v_policy.version,'interfaceVersion',1);
END;
$$;
REVOKE ALL ON FUNCTION public.server_supplier_risk_assessment_v1(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_supplier_risk_assessment_v1(uuid) TO service_role;;
