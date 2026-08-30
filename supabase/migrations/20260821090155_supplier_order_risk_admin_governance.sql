-- 636_supplier_order_risk_admin_governance.sql
-- Phase I governance: active-admin-only risk policy lifecycle, factual order-orchestrator status and safe reservation expiry.

CREATE TABLE IF NOT EXISTS private.supplier_commerce_risk_policy_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id uuid NOT NULL REFERENCES private.supplier_commerce_risk_policy_versions(id) ON DELETE RESTRICT,
  actor_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  reason text NOT NULL,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplier_commerce_risk_policy_audit_action_check CHECK (action IN ('created','approved','retired')),
  CONSTRAINT supplier_commerce_risk_policy_audit_reason_check CHECK (NULLIF(BTRIM(reason),'') IS NOT NULL),
  CONSTRAINT supplier_commerce_risk_policy_audit_evidence_check CHECK (jsonb_typeof(evidence)='object')
);
REVOKE ALL ON TABLE private.supplier_commerce_risk_policy_audit FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.guard_supplier_risk_policy_history_v1()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $$
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'risk policy history cannot be deleted'; END IF;
  IF OLD.status='approved' AND (
    NEW.policy_key IS DISTINCT FROM OLD.policy_key OR NEW.version IS DISTINCT FROM OLD.version OR
    NEW.review_score IS DISTINCT FROM OLD.review_score OR NEW.hold_score IS DISTINCT FROM OLD.hold_score OR
    NEW.restrict_score IS DISTINCT FROM OLD.restrict_score OR NEW.block_score IS DISTINCT FROM OLD.block_score OR
    NEW.evidence IS DISTINCT FROM OLD.evidence OR NEW.approved_by IS DISTINCT FROM OLD.approved_by OR NEW.approved_at IS DISTINCT FROM OLD.approved_at OR
    NEW.effective_from IS DISTINCT FROM OLD.effective_from
  ) THEN
    RAISE EXCEPTION 'approved risk policy is immutable; retire and create a new version';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_supplier_risk_policy_history_v1 ON private.supplier_commerce_risk_policy_versions;
CREATE TRIGGER trg_guard_supplier_risk_policy_history_v1
BEFORE UPDATE OR DELETE ON private.supplier_commerce_risk_policy_versions
FOR EACH ROW EXECUTE FUNCTION private.guard_supplier_risk_policy_history_v1();

CREATE OR REPLACE FUNCTION public.server_admin_supplier_risk_policy_v1(
  p_actor_id uuid,
  p_policy_key text,
  p_version integer,
  p_status text,
  p_review_score integer,
  p_hold_score integer,
  p_restrict_score integer,
  p_block_score integer,
  p_evidence jsonb,
  p_effective_from timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_status text:=lower(BTRIM(COALESCE(p_status,'draft')));
  v_key text:=NULLIF(BTRIM(p_policy_key),'');
  v_saved private.supplier_commerce_risk_policy_versions%ROWTYPE;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id=p_actor_id AND u.role='admin' AND u."isActive"=true) THEN
    RAISE EXCEPTION 'active admin authority is required' USING ERRCODE='42501';
  END IF;
  IF v_key IS NULL OR p_version IS NULL OR p_version<=0 THEN RAISE EXCEPTION 'risk policy key/version required'; END IF;
  IF v_status NOT IN ('draft','approved') THEN RAISE EXCEPTION 'risk policy status must be draft or approved'; END IF;
  IF p_review_score IS NULL OR p_hold_score IS NULL OR p_restrict_score IS NULL OR p_block_score IS NULL
     OR p_review_score<0 OR p_block_score>100 OR p_review_score>p_hold_score OR p_hold_score>p_restrict_score OR p_restrict_score>p_block_score THEN
    RAISE EXCEPTION 'invalid risk policy thresholds';
  END IF;
  IF p_evidence IS NULL OR jsonb_typeof(p_evidence)<>'object' OR (v_status='approved' AND p_evidence='{}'::jsonb) THEN
    RAISE EXCEPTION 'risk policy evidence required';
  END IF;
  IF p_evidence::text ~* '(password|secret|access[_-]?token|refresh[_-]?token|api[_-]?key|card(number)?)' THEN
    RAISE EXCEPTION 'secret-bearing risk policy payload rejected';
  END IF;
  IF v_status='approved' AND EXISTS (
    SELECT 1 FROM private.supplier_commerce_risk_policy_versions p
     WHERE p.policy_key=v_key AND p.status='approved' AND p.effective_to IS NULL
  ) THEN RAISE EXCEPTION 'retire current approved risk policy before approving another'; END IF;

  INSERT INTO private.supplier_commerce_risk_policy_versions(
    policy_key,version,status,review_score,hold_score,restrict_score,block_score,evidence,approved_by,approved_at,effective_from
  ) VALUES(
    v_key,p_version,v_status,p_review_score,p_hold_score,p_restrict_score,p_block_score,p_evidence,
    CASE WHEN v_status='approved' THEN p_actor_id ELSE NULL END,
    CASE WHEN v_status='approved' THEN now() ELSE NULL END,
    COALESCE(p_effective_from,now())
  ) RETURNING * INTO v_saved;

  INSERT INTO private.supplier_commerce_risk_policy_audit(policy_id,actor_id,action,reason,evidence)
  VALUES(v_saved.id,p_actor_id,CASE WHEN v_status='approved' THEN 'approved' ELSE 'created' END,
    CASE WHEN v_status='approved' THEN 'Approved Phase I commerce risk policy' ELSE 'Created Phase I commerce risk draft' END,p_evidence);

  RETURN jsonb_build_object('ok',true,'policyId',v_saved.id,'policyKey',v_saved.policy_key,'version',v_saved.version,'status',v_saved.status,'interfaceVersion',1);
END;
$$;
REVOKE ALL ON FUNCTION public.server_admin_supplier_risk_policy_v1(uuid,text,integer,text,integer,integer,integer,integer,jsonb,timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_admin_supplier_risk_policy_v1(uuid,text,integer,text,integer,integer,integer,integer,jsonb,timestamptz) TO service_role;

CREATE OR REPLACE FUNCTION public.server_admin_retire_supplier_risk_policy_v1(
  p_actor_id uuid,
  p_policy_key text,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_policy private.supplier_commerce_risk_policy_versions%ROWTYPE;
  v_reason text:=NULLIF(BTRIM(p_reason),'');
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id=p_actor_id AND u.role='admin' AND u."isActive"=true) THEN
    RAISE EXCEPTION 'active admin authority is required' USING ERRCODE='42501';
  END IF;
  IF v_reason IS NULL THEN RAISE EXCEPTION 'risk policy retirement reason required'; END IF;
  SELECT * INTO v_policy FROM private.supplier_commerce_risk_policy_versions
   WHERE policy_key=BTRIM(COALESCE(p_policy_key,'')) AND status='approved' AND effective_to IS NULL
   ORDER BY version DESC LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'approved risk policy not found'; END IF;
  UPDATE private.supplier_commerce_risk_policy_versions
     SET status='retired',effective_to=now()
   WHERE id=v_policy.id RETURNING * INTO v_policy;
  INSERT INTO private.supplier_commerce_risk_policy_audit(policy_id,actor_id,action,reason,evidence)
  VALUES(v_policy.id,p_actor_id,'retired',v_reason,v_policy.evidence);
  RETURN jsonb_build_object('ok',true,'policyId',v_policy.id,'status',v_policy.status,'effectiveTo',v_policy.effective_to,'interfaceVersion',1);
END;
$$;
REVOKE ALL ON FUNCTION public.server_admin_retire_supplier_risk_policy_v1(uuid,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_admin_retire_supplier_risk_policy_v1(uuid,text,text) TO service_role;

CREATE OR REPLACE FUNCTION public.server_expire_supplier_reservations_v1()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE v_count integer:=0;
BEGIN
  WITH expired AS (
    UPDATE private.supplier_stock_reservations r
       SET status='expired',released_at=now()
     WHERE r.status='active' AND r.expires_at<=now()
     RETURNING r.id,r.leg_item_id,r.orchestration_id
  ), updated_legs AS (
    UPDATE private.supplier_fulfilment_legs l SET status='released',updated_at=now()
     WHERE l.id IN (
       SELECT DISTINCT i.leg_id FROM private.supplier_fulfilment_leg_items i
       JOIN expired e ON e.leg_item_id=i.id
     )
     RETURNING l.id
  ), updated_orchestrations AS (
    UPDATE private.supplier_order_orchestrations o SET state='released',updated_at=now()
     WHERE o.id IN (SELECT DISTINCT orchestration_id FROM expired)
       AND NOT EXISTS (
         SELECT 1 FROM private.supplier_stock_reservations active
          WHERE active.orchestration_id=o.id AND active.status='active' AND active.expires_at>now()
       )
     RETURNING o.id
  )
  SELECT count(*)::integer INTO v_count FROM expired;
  RETURN v_count;
END;
$$;
REVOKE ALL ON FUNCTION public.server_expire_supplier_reservations_v1() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_expire_supplier_reservations_v1() TO service_role;

CREATE OR REPLACE FUNCTION public.server_admin_supplier_order_orchestration_status_v1(
  p_actor_id uuid,
  p_order_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE v_orch private.supplier_order_orchestrations%ROWTYPE;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id=p_actor_id AND u.role='admin' AND u."isActive"=true) THEN
    RAISE EXCEPTION 'active admin authority is required' USING ERRCODE='42501';
  END IF;
  SELECT * INTO v_orch FROM private.supplier_order_orchestrations WHERE order_id=p_order_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('found',false,'orderId',p_order_id,'interfaceVersion',1); END IF;
  RETURN jsonb_build_object(
    'found',true,'orderId',v_orch.order_id,'orchestrationId',v_orch.id,'state',v_orch.state,'riskState',v_orch.risk_state,
    'correlationId',v_orch.correlation_id,'legs',(
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id',l.id,'legKey',l.leg_key,'fulfillerType',l.fulfiller_type,'commercialMode',l.commercial_mode,'status',l.status,
        'supplierOfferId',l.supplier_offer_id,'sellerId',l.seller_id,
        'items',(SELECT COALESCE(jsonb_agg(jsonb_build_object('orderItemId',i.order_item_id,'quantity',i.quantity,'canonicalProductId',i.canonical_product_id,'supplierOfferId',i.supplier_offer_id)),'[]'::jsonb)
                   FROM private.supplier_fulfilment_leg_items i WHERE i.leg_id=l.id)
      ) ORDER BY l.created_at),'[]'::jsonb)
      FROM private.supplier_fulfilment_legs l WHERE l.orchestration_id=v_orch.id
    ),
    'riskAssessments',(
      SELECT COALESCE(jsonb_agg(jsonb_build_object('id',r.id,'subjectType',r.subject_type,'riskScore',r.risk_score,'action',r.action,'reason',r.reason,'createdAt',r.created_at) ORDER BY r.created_at),'[]'::jsonb)
      FROM private.supplier_commerce_risk_assessments r WHERE r.orchestration_id=v_orch.id
    ),
    'reservations',(
      SELECT COALESCE(jsonb_agg(jsonb_build_object('id',r.id,'orderItemId',r.order_item_id,'quantity',r.quantity,'status',r.status,'expiresAt',r.expires_at) ORDER BY r.created_at),'[]'::jsonb)
      FROM private.supplier_stock_reservations r WHERE r.orchestration_id=v_orch.id
    ),
    'interfaceVersion',1
  );
END;
$$;
REVOKE ALL ON FUNCTION public.server_admin_supplier_order_orchestration_status_v1(uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_admin_supplier_order_orchestration_status_v1(uuid,uuid) TO service_role;

COMMENT ON FUNCTION public.server_expire_supplier_reservations_v1() IS 'Expires only elapsed active Phase I supplier reservations; does not modify public customer order history.';;
