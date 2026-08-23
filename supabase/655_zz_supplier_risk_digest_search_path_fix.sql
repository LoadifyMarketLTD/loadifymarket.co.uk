-- 655_zz_supplier_risk_digest_search_path_fix.sql
-- Release-hardening corrective migration.
--
-- server_supplier_risk_assessment_v1 is SECURITY DEFINER with an empty
-- search_path. Supabase installs pgcrypto in the extensions schema, therefore
-- digest() must be schema-qualified rather than depending on ambient search
-- path resolution.

CREATE OR REPLACE FUNCTION public.server_supplier_risk_assessment_v1(p_supplier_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
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
  v_key:=encode(extensions.digest(p_supplier_id::text||'|'||v_policy.id::text||'|'||v_inputs::text||'|'||date_trunc('minute',now())::text,'sha256'),'hex');
  INSERT INTO private.supplier_risk_assessments(assessment_key,supplier_id,policy_version_id,score,risk_class,recommended_action,inputs,evidence)
  VALUES(v_key,p_supplier_id,v_policy.id,v_score,v_class,v_action,v_inputs,jsonb_build_object('evaluatedBy','server_supplier_risk_assessment_v1'))
  ON CONFLICT(assessment_key) DO UPDATE SET assessment_key=EXCLUDED.assessment_key RETURNING id INTO v_id;

  RETURN jsonb_build_object('ready',true,'supplierId',p_supplier_id,'assessmentId',v_id,'score',v_score,'riskClass',v_class,'recommendedAction',v_action,'inputs',v_inputs,'policyVersion',v_policy.version,'interfaceVersion',1);
END;
$$;

REVOKE ALL ON FUNCTION public.server_supplier_risk_assessment_v1(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_supplier_risk_assessment_v1(uuid) TO service_role;
