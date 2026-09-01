-- Phase O Shadow promotion policy governance.
--
-- This migration makes Shadow promotion criteria explicit, versioned and
-- pre-registered. It deliberately creates NO approved policy and NO thresholds.
-- Real readiness therefore remains fail-closed until an active admin creates a
-- draft policy, separately approves it with evidence, and new prospective
-- Shadow observations are collected under that exact approved policy.
--
-- No provider mutation, supplier order, customer PII disclosure, payment,
-- refund, notification or pilot activation is performed here.

CREATE TABLE IF NOT EXISTS private.supplier_pilot_shadow_promotion_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_key text NOT NULL,
  territory text NOT NULL,
  capability text NOT NULL DEFAULT 'order_submission',
  observation_policy_version text NOT NULL DEFAULT 'phase-o-order-shadow-v1',
  policy_version integer NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  minimum_sample_size integer NOT NULL,
  minimum_resolved_comparisons integer NOT NULL,
  minimum_agreement_rate_basis_points integer NOT NULL,
  maximum_false_positive_count integer NOT NULL,
  maximum_false_negative_count integer NOT NULL,
  maximum_ambiguous_count integer NOT NULL,
  evidence jsonb NOT NULL,
  created_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  approved_by uuid REFERENCES public.users(id) ON DELETE RESTRICT,
  approved_at timestamptz,
  retired_by uuid REFERENCES public.users(id) ON DELETE RESTRICT,
  retired_at timestamptz,
  retirement_reason text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplier_pilot_shadow_promotion_provider_check CHECK (
    provider_key=lower(BTRIM(provider_key)) AND NULLIF(provider_key,'') IS NOT NULL
  ),
  CONSTRAINT supplier_pilot_shadow_promotion_territory_check CHECK (
    territory=upper(BTRIM(territory)) AND NULLIF(territory,'') IS NOT NULL
  ),
  CONSTRAINT supplier_pilot_shadow_promotion_capability_check CHECK (capability='order_submission'),
  CONSTRAINT supplier_pilot_shadow_promotion_observation_policy_check CHECK (
    observation_policy_version='phase-o-order-shadow-v1'
  ),
  CONSTRAINT supplier_pilot_shadow_promotion_policy_version_check CHECK (policy_version>0),
  CONSTRAINT supplier_pilot_shadow_promotion_status_check CHECK (status IN ('draft','approved','retired')),
  CONSTRAINT supplier_pilot_shadow_promotion_sample_check CHECK (minimum_sample_size>0),
  CONSTRAINT supplier_pilot_shadow_promotion_resolved_check CHECK (
    minimum_resolved_comparisons>0 AND minimum_resolved_comparisons<=minimum_sample_size
  ),
  CONSTRAINT supplier_pilot_shadow_promotion_agreement_rate_check CHECK (
    minimum_agreement_rate_basis_points BETWEEN 0 AND 10000
  ),
  CONSTRAINT supplier_pilot_shadow_promotion_false_positive_check CHECK (maximum_false_positive_count>=0),
  CONSTRAINT supplier_pilot_shadow_promotion_false_negative_check CHECK (maximum_false_negative_count>=0),
  CONSTRAINT supplier_pilot_shadow_promotion_ambiguous_check CHECK (maximum_ambiguous_count>=0),
  CONSTRAINT supplier_pilot_shadow_promotion_evidence_check CHECK (
    jsonb_typeof(evidence)='object' AND evidence<>'{}'::jsonb
  ),
  CONSTRAINT supplier_pilot_shadow_promotion_approval_check CHECK (
    (status='draft' AND approved_by IS NULL AND approved_at IS NULL AND retired_by IS NULL AND retired_at IS NULL AND retirement_reason IS NULL)
    OR
    (status='approved' AND approved_by IS NOT NULL AND approved_at IS NOT NULL AND retired_by IS NULL AND retired_at IS NULL AND retirement_reason IS NULL)
    OR
    (status='retired' AND approved_by IS NOT NULL AND approved_at IS NOT NULL AND retired_by IS NOT NULL AND retired_at IS NOT NULL AND NULLIF(BTRIM(retirement_reason),'') IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS supplier_pilot_shadow_promotion_policy_version_unique
  ON private.supplier_pilot_shadow_promotion_policies(
    provider_key,territory,capability,observation_policy_version,policy_version
  );

CREATE UNIQUE INDEX IF NOT EXISTS supplier_pilot_shadow_promotion_one_approved_unique
  ON private.supplier_pilot_shadow_promotion_policies(
    provider_key,territory,capability,observation_policy_version
  )
  WHERE status='approved';

CREATE INDEX IF NOT EXISTS supplier_pilot_shadow_promotion_lookup_idx
  ON private.supplier_pilot_shadow_promotion_policies(
    provider_key,territory,status,policy_version DESC
  );

ALTER TABLE private.supplier_pilot_shadow_promotion_policies ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.supplier_pilot_shadow_promotion_policies FROM PUBLIC,anon,authenticated,service_role;

CREATE TABLE IF NOT EXISTS private.supplier_pilot_shadow_promotion_policy_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id uuid NOT NULL REFERENCES private.supplier_pilot_shadow_promotion_policies(id) ON DELETE RESTRICT,
  actor_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  reason text NOT NULL,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplier_pilot_shadow_promotion_audit_action_check CHECK (action IN ('created','approved','retired')),
  CONSTRAINT supplier_pilot_shadow_promotion_audit_reason_check CHECK (NULLIF(BTRIM(reason),'') IS NOT NULL),
  CONSTRAINT supplier_pilot_shadow_promotion_audit_evidence_check CHECK (jsonb_typeof(evidence)='object')
);
CREATE INDEX IF NOT EXISTS supplier_pilot_shadow_promotion_audit_policy_idx
  ON private.supplier_pilot_shadow_promotion_policy_audit(policy_id,created_at DESC);
ALTER TABLE private.supplier_pilot_shadow_promotion_policy_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.supplier_pilot_shadow_promotion_policy_audit FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION private.guard_supplier_pilot_shadow_promotion_policy_v1()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $$
BEGIN
  IF TG_OP='DELETE' THEN
    RAISE EXCEPTION 'Shadow promotion policy history cannot be deleted';
  END IF;

  IF NEW.provider_key IS DISTINCT FROM OLD.provider_key
     OR NEW.territory IS DISTINCT FROM OLD.territory
     OR NEW.capability IS DISTINCT FROM OLD.capability
     OR NEW.observation_policy_version IS DISTINCT FROM OLD.observation_policy_version
     OR NEW.policy_version IS DISTINCT FROM OLD.policy_version
     OR NEW.minimum_sample_size IS DISTINCT FROM OLD.minimum_sample_size
     OR NEW.minimum_resolved_comparisons IS DISTINCT FROM OLD.minimum_resolved_comparisons
     OR NEW.minimum_agreement_rate_basis_points IS DISTINCT FROM OLD.minimum_agreement_rate_basis_points
     OR NEW.maximum_false_positive_count IS DISTINCT FROM OLD.maximum_false_positive_count
     OR NEW.maximum_false_negative_count IS DISTINCT FROM OLD.maximum_false_negative_count
     OR NEW.maximum_ambiguous_count IS DISTINCT FROM OLD.maximum_ambiguous_count
     OR NEW.evidence IS DISTINCT FROM OLD.evidence
     OR NEW.created_by IS DISTINCT FROM OLD.created_by
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Shadow promotion policy criteria and evidence are immutable; create a new version';
  END IF;

  IF OLD.status='draft' AND NEW.status='approved' THEN
    IF NEW.approved_by IS NULL OR NEW.approved_at IS NULL
       OR NEW.retired_by IS NOT NULL OR NEW.retired_at IS NOT NULL OR NEW.retirement_reason IS NOT NULL THEN
      RAISE EXCEPTION 'invalid Shadow promotion policy approval transition';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.status='approved' AND NEW.status='retired' THEN
    IF NEW.approved_by IS DISTINCT FROM OLD.approved_by
       OR NEW.approved_at IS DISTINCT FROM OLD.approved_at
       OR NEW.retired_by IS NULL OR NEW.retired_at IS NULL
       OR NULLIF(BTRIM(NEW.retirement_reason),'') IS NULL THEN
      RAISE EXCEPTION 'invalid Shadow promotion policy retirement transition';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW IS DISTINCT FROM OLD THEN
    RAISE EXCEPTION 'Shadow promotion policy lifecycle transition is not allowed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_supplier_pilot_shadow_promotion_policy_v1
  ON private.supplier_pilot_shadow_promotion_policies;
CREATE TRIGGER trg_guard_supplier_pilot_shadow_promotion_policy_v1
BEFORE UPDATE OR DELETE ON private.supplier_pilot_shadow_promotion_policies
FOR EACH ROW EXECUTE FUNCTION private.guard_supplier_pilot_shadow_promotion_policy_v1();

DROP TRIGGER IF EXISTS trg_guard_supplier_pilot_shadow_promotion_policy_audit_v1
  ON private.supplier_pilot_shadow_promotion_policy_audit;
CREATE TRIGGER trg_guard_supplier_pilot_shadow_promotion_policy_audit_v1
BEFORE UPDATE OR DELETE ON private.supplier_pilot_shadow_promotion_policy_audit
FOR EACH ROW EXECUTE FUNCTION private.guard_supplier_pilot_history_v1();

CREATE OR REPLACE FUNCTION public.server_admin_create_supplier_pilot_shadow_promotion_policy_v1(
  p_actor_id uuid,
  p_provider_key text,
  p_territory text,
  p_policy_version integer,
  p_minimum_sample_size integer,
  p_minimum_resolved_comparisons integer,
  p_minimum_agreement_rate_basis_points integer,
  p_maximum_false_positive_count integer,
  p_maximum_false_negative_count integer,
  p_maximum_ambiguous_count integer,
  p_evidence jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_provider_key text:=lower(BTRIM(COALESCE(p_provider_key,'')));
  v_territory text:=upper(BTRIM(COALESCE(p_territory,'')));
  v_policy private.supplier_pilot_shadow_promotion_policies%ROWTYPE;
BEGIN
  PERFORM private.require_active_admin_v1(p_actor_id);
  IF v_provider_key='' THEN RAISE EXCEPTION 'provider key is required'; END IF;
  IF v_territory='' THEN RAISE EXCEPTION 'territory is required'; END IF;
  IF p_policy_version IS NULL OR p_policy_version<=0 THEN RAISE EXCEPTION 'positive policy version is required'; END IF;
  IF p_minimum_sample_size IS NULL OR p_minimum_sample_size<=0 THEN RAISE EXCEPTION 'positive minimum sample size is required'; END IF;
  IF p_minimum_resolved_comparisons IS NULL OR p_minimum_resolved_comparisons<=0 OR p_minimum_resolved_comparisons>p_minimum_sample_size THEN
    RAISE EXCEPTION 'minimum resolved comparisons must be positive and no greater than minimum sample size';
  END IF;
  IF p_minimum_agreement_rate_basis_points IS NULL OR p_minimum_agreement_rate_basis_points<0 OR p_minimum_agreement_rate_basis_points>10000 THEN
    RAISE EXCEPTION 'minimum agreement rate basis points must be between 0 and 10000';
  END IF;
  IF p_maximum_false_positive_count IS NULL OR p_maximum_false_positive_count<0
     OR p_maximum_false_negative_count IS NULL OR p_maximum_false_negative_count<0
     OR p_maximum_ambiguous_count IS NULL OR p_maximum_ambiguous_count<0 THEN
    RAISE EXCEPTION 'maximum error counts must be non-negative';
  END IF;
  IF jsonb_typeof(COALESCE(p_evidence,'{}'::jsonb))<>'object' OR COALESCE(p_evidence,'{}'::jsonb)='{}'::jsonb THEN
    RAISE EXCEPTION 'policy evidence must be a non-empty object';
  END IF;

  INSERT INTO private.supplier_pilot_shadow_promotion_policies(
    provider_key,territory,policy_version,status,
    minimum_sample_size,minimum_resolved_comparisons,minimum_agreement_rate_basis_points,
    maximum_false_positive_count,maximum_false_negative_count,maximum_ambiguous_count,
    evidence,created_by
  ) VALUES(
    v_provider_key,v_territory,p_policy_version,'draft',
    p_minimum_sample_size,p_minimum_resolved_comparisons,p_minimum_agreement_rate_basis_points,
    p_maximum_false_positive_count,p_maximum_false_negative_count,p_maximum_ambiguous_count,
    p_evidence,p_actor_id
  ) RETURNING * INTO v_policy;

  INSERT INTO private.supplier_pilot_shadow_promotion_policy_audit(policy_id,actor_id,action,reason,evidence)
  VALUES(v_policy.id,p_actor_id,'created','Created draft Phase O Shadow promotion policy',p_evidence);

  RETURN jsonb_build_object(
    'ok',true,
    'policyId',v_policy.id,
    'providerKey',v_policy.provider_key,
    'territory',v_policy.territory,
    'capability',v_policy.capability,
    'observationPolicyVersion',v_policy.observation_policy_version,
    'policyVersion',v_policy.policy_version,
    'status',v_policy.status,
    'interfaceVersion',1
  );
END;
$$;
REVOKE ALL ON FUNCTION public.server_admin_create_supplier_pilot_shadow_promotion_policy_v1(uuid,text,text,integer,integer,integer,integer,integer,integer,integer,jsonb)
  FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.server_admin_create_supplier_pilot_shadow_promotion_policy_v1(uuid,text,text,integer,integer,integer,integer,integer,integer,integer,jsonb)
  TO service_role;

CREATE OR REPLACE FUNCTION public.server_admin_approve_supplier_pilot_shadow_promotion_policy_v1(
  p_actor_id uuid,
  p_policy_id uuid,
  p_reason text,
  p_approval_evidence jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_policy private.supplier_pilot_shadow_promotion_policies%ROWTYPE;
  v_reason text:=NULLIF(BTRIM(COALESCE(p_reason,'')),'');
BEGIN
  PERFORM private.require_active_admin_v1(p_actor_id);
  IF v_reason IS NULL THEN RAISE EXCEPTION 'approval reason is required'; END IF;
  IF jsonb_typeof(COALESCE(p_approval_evidence,'{}'::jsonb))<>'object' OR COALESCE(p_approval_evidence,'{}'::jsonb)='{}'::jsonb THEN
    RAISE EXCEPTION 'approval evidence must be a non-empty object';
  END IF;

  SELECT * INTO v_policy
    FROM private.supplier_pilot_shadow_promotion_policies
   WHERE id=p_policy_id
   FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Shadow promotion policy not found'; END IF;
  IF v_policy.status<>'draft' THEN RAISE EXCEPTION 'only a draft Shadow promotion policy can be approved'; END IF;
  IF EXISTS(
    SELECT 1
      FROM private.supplier_pilot_shadow_promotion_policies p
     WHERE p.provider_key=v_policy.provider_key
       AND p.territory=v_policy.territory
       AND p.capability=v_policy.capability
       AND p.observation_policy_version=v_policy.observation_policy_version
       AND p.status='approved'
       AND p.id<>v_policy.id
  ) THEN
    RAISE EXCEPTION 'retire the current approved Shadow promotion policy before approving a replacement';
  END IF;

  UPDATE private.supplier_pilot_shadow_promotion_policies
     SET status='approved',approved_by=p_actor_id,approved_at=now(),updated_at=now()
   WHERE id=v_policy.id
   RETURNING * INTO v_policy;

  INSERT INTO private.supplier_pilot_shadow_promotion_policy_audit(policy_id,actor_id,action,reason,evidence)
  VALUES(v_policy.id,p_actor_id,'approved',v_reason,p_approval_evidence);

  RETURN jsonb_build_object(
    'ok',true,'policyId',v_policy.id,'providerKey',v_policy.provider_key,'territory',v_policy.territory,
    'policyVersion',v_policy.policy_version,'status',v_policy.status,'approvedAt',v_policy.approved_at,'interfaceVersion',1
  );
END;
$$;
REVOKE ALL ON FUNCTION public.server_admin_approve_supplier_pilot_shadow_promotion_policy_v1(uuid,uuid,text,jsonb)
  FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.server_admin_approve_supplier_pilot_shadow_promotion_policy_v1(uuid,uuid,text,jsonb)
  TO service_role;

CREATE OR REPLACE FUNCTION public.server_admin_retire_supplier_pilot_shadow_promotion_policy_v1(
  p_actor_id uuid,
  p_policy_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_policy private.supplier_pilot_shadow_promotion_policies%ROWTYPE;
  v_reason text:=NULLIF(BTRIM(COALESCE(p_reason,'')),'');
BEGIN
  PERFORM private.require_active_admin_v1(p_actor_id);
  IF v_reason IS NULL THEN RAISE EXCEPTION 'retirement reason is required'; END IF;

  SELECT * INTO v_policy
    FROM private.supplier_pilot_shadow_promotion_policies
   WHERE id=p_policy_id
   FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Shadow promotion policy not found'; END IF;
  IF v_policy.status<>'approved' THEN RAISE EXCEPTION 'only an approved Shadow promotion policy can be retired'; END IF;

  UPDATE private.supplier_pilot_shadow_promotion_policies
     SET status='retired',retired_by=p_actor_id,retired_at=now(),retirement_reason=v_reason,updated_at=now()
   WHERE id=v_policy.id
   RETURNING * INTO v_policy;

  INSERT INTO private.supplier_pilot_shadow_promotion_policy_audit(policy_id,actor_id,action,reason,evidence)
  VALUES(v_policy.id,p_actor_id,'retired',v_reason,'{}'::jsonb);

  RETURN jsonb_build_object(
    'ok',true,'policyId',v_policy.id,'providerKey',v_policy.provider_key,'territory',v_policy.territory,
    'policyVersion',v_policy.policy_version,'status',v_policy.status,'retiredAt',v_policy.retired_at,'interfaceVersion',1
  );
END;
$$;
REVOKE ALL ON FUNCTION public.server_admin_retire_supplier_pilot_shadow_promotion_policy_v1(uuid,uuid,text)
  FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.server_admin_retire_supplier_pilot_shadow_promotion_policy_v1(uuid,uuid,text)
  TO service_role;

-- There must be no pre-policy observations. We refuse to silently backfill a
-- promotion policy onto evidence that was collected before policy approval.
DO $$
BEGIN
  IF EXISTS(SELECT 1 FROM private.supplier_pilot_shadow_observations) THEN
    RAISE EXCEPTION 'Phase O Shadow promotion policy binding requires zero pre-policy observations';
  END IF;
END;
$$;

ALTER TABLE private.supplier_pilot_shadow_observations
  ADD COLUMN IF NOT EXISTS promotion_policy_id uuid REFERENCES private.supplier_pilot_shadow_promotion_policies(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS promotion_policy_version integer;
ALTER TABLE private.supplier_pilot_shadow_observations ALTER COLUMN promotion_policy_id SET NOT NULL;
ALTER TABLE private.supplier_pilot_shadow_observations ALTER COLUMN promotion_policy_version SET NOT NULL;
ALTER TABLE private.supplier_pilot_shadow_observations
  ADD CONSTRAINT supplier_pilot_shadow_promotion_version_positive_check CHECK (promotion_policy_version>0);
CREATE INDEX IF NOT EXISTS supplier_pilot_shadow_promotion_binding_idx
  ON private.supplier_pilot_shadow_observations(promotion_policy_id,pilot_id,recorded_at DESC);

CREATE OR REPLACE FUNCTION public.server_record_supplier_pilot_shadow_observation_v1(
  p_actor_id uuid,
  p_pilot_id uuid,
  p_order_id uuid,
  p_operator_action text,
  p_operator_status text,
  p_operator_rationale_code text,
  p_provider_contract_ready boolean,
  p_provider_contract_reason text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_pilot private.supplier_pilot_programs%ROWTYPE;
  v_promotion_policy private.supplier_pilot_shadow_promotion_policies%ROWTYPE;
  v_order record;
  v_existing private.supplier_pilot_shadow_observations%ROWTYPE;
  v_canonical jsonb;
  v_canonical_ready boolean:=false;
  v_provider_ready boolean:=COALESCE(p_provider_contract_ready,false);
  v_provider_reason text:=NULLIF(BTRIM(COALESCE(p_provider_contract_reason,'')),'');
  v_operator_action text:=lower(BTRIM(COALESCE(p_operator_action,'')));
  v_operator_status text:=lower(BTRIM(COALESCE(p_operator_status,'')));
  v_system_action text;
  v_system_reason text;
  v_classification text;
  v_order_value_minor bigint;
  v_id uuid;
BEGIN
  PERFORM private.require_active_admin_v1(p_actor_id);

  SELECT * INTO v_pilot
    FROM private.supplier_pilot_programs
   WHERE id=p_pilot_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'controlled pilot not found'; END IF;
  IF v_pilot.status<>'preparing' THEN
    RAISE EXCEPTION 'Shadow observations are accepted only while pilot is preparing';
  END IF;
  IF v_pilot.prepared_at IS NULL THEN
    RAISE EXCEPTION 'Shadow observation requires a prepared pilot timestamp';
  END IF;
  IF v_provider_reason IS NULL THEN RAISE EXCEPTION 'provider contract reason is required'; END IF;
  IF v_operator_action NOT IN ('submit_order','no_action') THEN RAISE EXCEPTION 'operator action is invalid'; END IF;
  IF v_operator_status NOT IN ('resolved','unresolved') THEN RAISE EXCEPTION 'operator status is invalid'; END IF;

  SELECT * INTO v_promotion_policy
    FROM private.supplier_pilot_shadow_promotion_policies p
   WHERE p.provider_key=lower(BTRIM(v_pilot.provider_key))
     AND p.territory=upper(BTRIM(v_pilot.territory))
     AND p.capability='order_submission'
     AND p.observation_policy_version='phase-o-order-shadow-v1'
     AND p.status='approved'
   ORDER BY p.policy_version DESC
   LIMIT 1;
  IF NOT FOUND OR v_promotion_policy.approved_at IS NULL THEN
    RAISE EXCEPTION 'approved Shadow promotion policy is required before observations';
  END IF;

  SELECT
    o.id,
    o."buyerId" AS buyer_id,
    o."productId" AS product_id,
    o.total,
    o."createdAt" AS created_at
    INTO v_order
    FROM public.orders o
   WHERE o.id=p_order_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Shadow observation requires an existing order'; END IF;
  IF v_order.created_at<v_pilot.prepared_at THEN
    RAISE EXCEPTION 'Shadow observation order predates pilot preparation';
  END IF;
  IF v_order.created_at<v_promotion_policy.approved_at THEN
    RAISE EXCEPTION 'Shadow observation order predates approved promotion policy';
  END IF;

  IF NOT EXISTS(
    SELECT 1 FROM private.supplier_pilot_cohort_members c
     WHERE c.pilot_id=v_pilot.id
       AND c.buyer_id=v_order.buyer_id
       AND c.added_at<=v_order.created_at
  ) THEN
    RAISE EXCEPTION 'Shadow observation order buyer is outside the contemporaneous pilot cohort';
  END IF;

  IF v_order.product_id IS NULL OR NOT EXISTS(
    SELECT 1
      FROM private.supplier_pilot_offers po
      JOIN private.supplier_offers so ON so.id=po.supplier_offer_id
     WHERE po.pilot_id=v_pilot.id
       AND po.approved_at<=v_order.created_at
       AND so.canonical_product_id=v_order.product_id
       AND so.supplier_id=v_pilot.supplier_id
       AND so.territory=v_pilot.territory
       AND so.status='approved'
       AND so.approved_at IS NOT NULL
       AND so.approved_at<=v_order.created_at
  ) THEN
    RAISE EXCEPTION 'Shadow observation order product is outside the contemporaneous pilot offer set';
  END IF;

  v_order_value_minor:=round(COALESCE(v_order.total,0) * 100)::bigint;
  IF v_order_value_minor<=0 OR v_order_value_minor>v_pilot.maximum_order_value_minor THEN
    RAISE EXCEPTION 'Shadow observation order value is outside the pilot cap';
  END IF;

  v_canonical:=public.server_supplier_pilot_activation_readiness_v1(v_pilot.id);
  v_canonical_ready:=COALESCE((v_canonical->>'ready')::boolean,false);
  v_system_action:=CASE WHEN v_canonical_ready AND v_provider_ready THEN 'submit_order' ELSE 'no_action' END;
  v_system_reason:=CASE
    WHEN v_canonical_ready AND v_provider_ready THEN 'pre_shadow_gates_ready'
    WHEN NOT v_canonical_ready THEN 'canonical_pilot_readiness_blocked'
    ELSE v_provider_reason
  END;

  v_classification:=CASE
    WHEN v_operator_status='unresolved' THEN 'ambiguous'
    WHEN v_system_action=v_operator_action THEN 'agreement'
    WHEN v_system_action='submit_order' AND v_operator_action='no_action' THEN 'false_positive'
    ELSE 'false_negative'
  END;

  SELECT * INTO v_existing
    FROM private.supplier_pilot_shadow_observations
   WHERE pilot_id=v_pilot.id AND order_id=p_order_id AND policy_version='phase-o-order-shadow-v1';
  IF FOUND THEN
    IF v_existing.operator_action<>v_operator_action
       OR v_existing.operator_status<>v_operator_status
       OR v_existing.system_action<>v_system_action
       OR v_existing.provider_contract_ready IS DISTINCT FROM v_provider_ready
       OR v_existing.classification<>v_classification
       OR v_existing.promotion_policy_id IS DISTINCT FROM v_promotion_policy.id
       OR v_existing.promotion_policy_version IS DISTINCT FROM v_promotion_policy.policy_version THEN
      RAISE EXCEPTION 'Shadow observation idempotency collision';
    END IF;
    RETURN v_existing.id;
  END IF;

  INSERT INTO private.supplier_pilot_shadow_observations(
    pilot_id,order_id,provider_key,system_action,system_reason,
    operator_action,operator_status,operator_rationale_code,classification,
    canonical_ready,provider_contract_ready,provider_contract_reason,system_snapshot,recorded_by,
    promotion_policy_id,promotion_policy_version
  ) VALUES(
    v_pilot.id,p_order_id,lower(BTRIM(v_pilot.provider_key)),v_system_action,v_system_reason,
    v_operator_action,v_operator_status,NULLIF(BTRIM(COALESCE(p_operator_rationale_code,'')),''),v_classification,
    v_canonical_ready,v_provider_ready,v_provider_reason,
    jsonb_build_object(
      'canonicalReadiness',v_canonical,
      'providerContractReady',v_provider_ready,
      'providerContractReason',v_provider_reason,
      'promotionPolicy',jsonb_build_object(
        'id',v_promotion_policy.id,
        'version',v_promotion_policy.policy_version,
        'approvedAt',v_promotion_policy.approved_at
      ),
      'orderScope',jsonb_build_object(
        'orderId',p_order_id,
        'orderCreatedAt',v_order.created_at,
        'pilotPreparedAt',v_pilot.prepared_at,
        'buyerCohortMatchedAtOrderTime',true,
        'productAllowlistedAtOrderTime',true,
        'orderValueMinor',v_order_value_minor
      ),
      'externalMutationPerformed',false,
      'customerPiiDisclosurePerformed',false,
      'paymentMutationPerformed',false
    ),
    p_actor_id,v_promotion_policy.id,v_promotion_policy.policy_version
  ) RETURNING id INTO v_id;

  INSERT INTO private.supplier_pilot_audit(pilot_id,actor_id,action,new_status,evidence)
  VALUES(
    v_pilot.id,p_actor_id,'record_shadow_order_observation',v_pilot.status,
    jsonb_build_object(
      'observationId',v_id,
      'orderId',p_order_id,
      'classification',v_classification,
      'observationPolicyVersion','phase-o-order-shadow-v1',
      'promotionPolicyId',v_promotion_policy.id,
      'promotionPolicyVersion',v_promotion_policy.policy_version
    )
  );

  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.server_record_supplier_pilot_shadow_observation_v1(uuid,uuid,uuid,text,text,text,boolean,text)
  FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.server_record_supplier_pilot_shadow_observation_v1(uuid,uuid,uuid,text,text,text,boolean,text)
  TO service_role;

CREATE OR REPLACE FUNCTION public.server_get_supplier_pilot_shadow_review_v1(
  p_actor_id uuid,
  p_pilot_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_pilot private.supplier_pilot_programs%ROWTYPE;
  v_policy private.supplier_pilot_shadow_promotion_policies%ROWTYPE;
  v_total integer:=0;
  v_resolved integer:=0;
  v_agreement integer:=0;
  v_false_positive integer:=0;
  v_false_negative integer:=0;
  v_ambiguous integer:=0;
  v_agreement_rate_basis_points integer:=0;
  v_last_reviewed timestamptz;
  v_evidence_ref text;
  v_passed boolean:=false;
BEGIN
  PERFORM private.require_active_admin_v1(p_actor_id);

  SELECT * INTO v_pilot FROM private.supplier_pilot_programs WHERE id=p_pilot_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('exists',false,'reason','pilot_not_found','interfaceVersion',2);
  END IF;

  SELECT * INTO v_policy
    FROM private.supplier_pilot_shadow_promotion_policies p
   WHERE p.provider_key=lower(BTRIM(v_pilot.provider_key))
     AND p.territory=upper(BTRIM(v_pilot.territory))
     AND p.capability='order_submission'
     AND p.observation_policy_version='phase-o-order-shadow-v1'
     AND p.status='approved'
   ORDER BY p.policy_version DESC
   LIMIT 1;

  IF v_policy.id IS NOT NULL THEN
    SELECT
      count(*)::integer,
      count(*) FILTER (WHERE operator_status='resolved')::integer,
      count(*) FILTER (WHERE classification='agreement')::integer,
      count(*) FILTER (WHERE classification='false_positive')::integer,
      count(*) FILTER (WHERE classification='false_negative')::integer,
      count(*) FILTER (WHERE classification='ambiguous')::integer,
      max(recorded_at)
    INTO
      v_total,v_resolved,v_agreement,v_false_positive,v_false_negative,v_ambiguous,v_last_reviewed
    FROM private.supplier_pilot_shadow_observations
    WHERE pilot_id=v_pilot.id
      AND provider_key=lower(BTRIM(v_pilot.provider_key))
      AND capability='order_submission'
      AND source='durable_shadow_review_v1'
      AND persistence_bound=true
      AND policy_version='phase-o-order-shadow-v1'
      AND promotion_policy_id=v_policy.id
      AND promotion_policy_version=v_policy.policy_version
      AND recorded_at>=v_policy.approved_at;

    IF v_resolved>0 THEN
      v_agreement_rate_basis_points:=floor((v_agreement::numeric*10000)/v_resolved)::integer;
    END IF;

    v_passed:=
      v_total>=v_policy.minimum_sample_size
      AND v_resolved>=v_policy.minimum_resolved_comparisons
      AND v_agreement_rate_basis_points>=v_policy.minimum_agreement_rate_basis_points
      AND v_false_positive<=v_policy.maximum_false_positive_count
      AND v_false_negative<=v_policy.maximum_false_negative_count
      AND v_ambiguous<=v_policy.maximum_ambiguous_count;
  END IF;

  IF v_total>0 THEN
    v_evidence_ref:=format(
      'supplier-pilot-shadow-review:%s:%s:%s:%s',
      v_pilot.id::text,
      v_policy.id::text,
      v_total::text,
      floor(extract(epoch from v_last_reviewed))::bigint::text
    );
  END IF;

  RETURN jsonb_build_object(
    'exists',v_total>0,
    'interfaceVersion',2,
    'pilotId',v_pilot.id,
    'providerKey',lower(BTRIM(v_pilot.provider_key)),
    'capability','order_submission',
    'source','durable_shadow_review_v1',
    'persistenceBound',true,
    'evidenceRef',v_evidence_ref,
    'policyVersion','phase-o-order-shadow-v1',
    'reviewedAt',v_last_reviewed,
    'sampleSize',v_total,
    'resolvedComparisons',v_resolved,
    'operatorRelative',true,
    'passed',v_passed,
    'passPolicyConfigured',v_policy.id IS NOT NULL,
    'promotionPolicyId',v_policy.id,
    'promotionPolicyVersion',v_policy.policy_version,
    'promotionPolicyApprovedAt',v_policy.approved_at,
    'reason',CASE
      WHEN v_policy.id IS NULL THEN 'shadow_promotion_policy_not_configured'
      WHEN v_total=0 THEN 'shadow_observations_missing'
      WHEN v_passed THEN 'shadow_promotion_policy_passed'
      ELSE 'shadow_promotion_policy_failed'
    END,
    'criteria',CASE WHEN v_policy.id IS NULL THEN NULL ELSE jsonb_build_object(
      'minimumSampleSize',v_policy.minimum_sample_size,
      'minimumResolvedComparisons',v_policy.minimum_resolved_comparisons,
      'minimumAgreementRateBasisPoints',v_policy.minimum_agreement_rate_basis_points,
      'maximumFalsePositiveCount',v_policy.maximum_false_positive_count,
      'maximumFalseNegativeCount',v_policy.maximum_false_negative_count,
      'maximumAmbiguousCount',v_policy.maximum_ambiguous_count
    ) END,
    'metrics',jsonb_build_object(
      'agreement',v_agreement,
      'falsePositive',v_false_positive,
      'falseNegative',v_false_negative,
      'ambiguous',v_ambiguous,
      'agreementRateBasisPoints',v_agreement_rate_basis_points
    ),
    'externalMutationPerformed',false,
    'pilotActivationPerformed',false,
    'paymentMutationPerformed',false
  );
END;
$$;
REVOKE ALL ON FUNCTION public.server_get_supplier_pilot_shadow_review_v1(uuid,uuid)
  FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.server_get_supplier_pilot_shadow_review_v1(uuid,uuid)
  TO service_role;

-- No approved policy row is created by this migration. No pilot control changes.
