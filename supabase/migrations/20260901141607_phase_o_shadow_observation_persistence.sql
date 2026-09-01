-- Phase O durable Shadow observation persistence.
--
-- This migration adds append-only, server-derived Shadow observations for the
-- controlled supplier pilot. It deliberately DOES NOT define a promotion/pass
-- threshold and therefore can never make Phase O autonomy ready by itself.
--
-- No supplier order, provider mutation, customer notification, PII disclosure,
-- payment, refund, or pilot activation is performed here.

CREATE TABLE IF NOT EXISTS private.supplier_pilot_shadow_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pilot_id uuid NOT NULL REFERENCES private.supplier_pilot_programs(id) ON DELETE RESTRICT,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  provider_key text NOT NULL,
  capability text NOT NULL DEFAULT 'order_submission',
  source text NOT NULL DEFAULT 'durable_shadow_review_v1',
  persistence_bound boolean NOT NULL DEFAULT true,
  policy_version text NOT NULL DEFAULT 'phase-o-order-shadow-v1',
  system_action text NOT NULL,
  system_reason text NOT NULL,
  operator_action text NOT NULL,
  operator_status text NOT NULL,
  operator_rationale_code text,
  classification text NOT NULL,
  canonical_ready boolean NOT NULL,
  provider_contract_ready boolean NOT NULL,
  provider_contract_reason text NOT NULL,
  system_snapshot jsonb NOT NULL,
  recorded_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  observed_at timestamptz NOT NULL DEFAULT now(),
  recorded_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplier_pilot_shadow_provider_check CHECK (
    provider_key=lower(BTRIM(provider_key)) AND NULLIF(provider_key,'') IS NOT NULL
  ),
  CONSTRAINT supplier_pilot_shadow_capability_check CHECK (capability='order_submission'),
  CONSTRAINT supplier_pilot_shadow_source_check CHECK (source='durable_shadow_review_v1'),
  CONSTRAINT supplier_pilot_shadow_persistence_check CHECK (persistence_bound=true),
  CONSTRAINT supplier_pilot_shadow_policy_check CHECK (policy_version='phase-o-order-shadow-v1'),
  CONSTRAINT supplier_pilot_shadow_system_action_check CHECK (system_action IN ('submit_order','no_action')),
  CONSTRAINT supplier_pilot_shadow_operator_action_check CHECK (operator_action IN ('submit_order','no_action')),
  CONSTRAINT supplier_pilot_shadow_operator_status_check CHECK (operator_status IN ('resolved','unresolved')),
  CONSTRAINT supplier_pilot_shadow_classification_check CHECK (
    classification IN ('agreement','false_positive','false_negative','ambiguous')
  ),
  CONSTRAINT supplier_pilot_shadow_reason_check CHECK (NULLIF(BTRIM(system_reason),'') IS NOT NULL),
  CONSTRAINT supplier_pilot_shadow_provider_reason_check CHECK (NULLIF(BTRIM(provider_contract_reason),'') IS NOT NULL),
  CONSTRAINT supplier_pilot_shadow_snapshot_check CHECK (
    jsonb_typeof(system_snapshot)='object' AND system_snapshot<>'{}'::jsonb
  ),
  UNIQUE(pilot_id,order_id,policy_version)
);

CREATE INDEX IF NOT EXISTS supplier_pilot_shadow_observation_lookup_idx
  ON private.supplier_pilot_shadow_observations(pilot_id,recorded_at DESC);

ALTER TABLE private.supplier_pilot_shadow_observations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.supplier_pilot_shadow_observations FROM PUBLIC,anon,authenticated,service_role;

DROP TRIGGER IF EXISTS trg_guard_supplier_pilot_shadow_observation_immutable_v1
  ON private.supplier_pilot_shadow_observations;
CREATE TRIGGER trg_guard_supplier_pilot_shadow_observation_immutable_v1
BEFORE UPDATE OR DELETE ON private.supplier_pilot_shadow_observations
FOR EACH ROW EXECUTE FUNCTION private.guard_supplier_pilot_history_v1();

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
       OR v_existing.classification<>v_classification THEN
      RAISE EXCEPTION 'Shadow observation idempotency collision';
    END IF;
    RETURN v_existing.id;
  END IF;

  INSERT INTO private.supplier_pilot_shadow_observations(
    pilot_id,order_id,provider_key,system_action,system_reason,
    operator_action,operator_status,operator_rationale_code,classification,
    canonical_ready,provider_contract_ready,provider_contract_reason,system_snapshot,recorded_by
  ) VALUES(
    v_pilot.id,p_order_id,lower(BTRIM(v_pilot.provider_key)),v_system_action,v_system_reason,
    v_operator_action,v_operator_status,NULLIF(BTRIM(COALESCE(p_operator_rationale_code,'')),''),v_classification,
    v_canonical_ready,v_provider_ready,v_provider_reason,
    jsonb_build_object(
      'canonicalReadiness',v_canonical,
      'providerContractReady',v_provider_ready,
      'providerContractReason',v_provider_reason,
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
    p_actor_id
  ) RETURNING id INTO v_id;

  INSERT INTO private.supplier_pilot_audit(pilot_id,actor_id,action,new_status,evidence)
  VALUES(
    v_pilot.id,p_actor_id,'record_shadow_order_observation',v_pilot.status,
    jsonb_build_object(
      'observationId',v_id,
      'orderId',p_order_id,
      'classification',v_classification,
      'policyVersion','phase-o-order-shadow-v1'
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
  v_total integer:=0;
  v_resolved integer:=0;
  v_agreement integer:=0;
  v_false_positive integer:=0;
  v_false_negative integer:=0;
  v_ambiguous integer:=0;
  v_last_reviewed timestamptz;
  v_evidence_ref text;
BEGIN
  PERFORM private.require_active_admin_v1(p_actor_id);

  SELECT * INTO v_pilot FROM private.supplier_pilot_programs WHERE id=p_pilot_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('exists',false,'reason','pilot_not_found','interfaceVersion',1);
  END IF;

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
    AND policy_version='phase-o-order-shadow-v1';

  IF v_total>0 THEN
    v_evidence_ref:=format(
      'supplier-pilot-shadow-review:%s:%s:%s',
      v_pilot.id::text,
      v_total::text,
      floor(extract(epoch from v_last_reviewed))::bigint::text
    );
  END IF;

  RETURN jsonb_build_object(
    'exists',v_total>0,
    'interfaceVersion',1,
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
    'passed',false,
    'passPolicyConfigured',false,
    'reason',CASE WHEN v_total=0 THEN 'shadow_observations_missing' ELSE 'shadow_pass_policy_not_configured' END,
    'metrics',jsonb_build_object(
      'agreement',v_agreement,
      'falsePositive',v_false_positive,
      'falseNegative',v_false_negative,
      'ambiguous',v_ambiguous
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
