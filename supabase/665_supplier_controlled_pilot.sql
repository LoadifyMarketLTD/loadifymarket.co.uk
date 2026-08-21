-- 665_supplier_controlled_pilot.sql
-- Phase O — Controlled Pilot.
--
-- This migration creates a fail-closed pilot control plane. It does NOT create a
-- supplier, select products, fabricate pilot evidence, enable global Supplier
-- Commerce, or declare Pilot PASS.
--
-- Global Supplier Commerce remains OFF. A distinct `pilot` master control may be
-- enabled only by the dedicated admin pilot transition after factual readiness.

CREATE SCHEMA IF NOT EXISTS private;

ALTER TABLE private.supplier_commerce_controls
  DROP CONSTRAINT IF EXISTS supplier_commerce_controls_operation_check;
ALTER TABLE private.supplier_commerce_controls
  ADD CONSTRAINT supplier_commerce_controls_operation_check
  CHECK (operation IN (
    '*','pilot','import','publish','checkout','reservation','supplier_order',
    'tracking_ingest','return_recovery','stock_sync','price_sync'
  ));

INSERT INTO private.supplier_commerce_controls(operation,scope_type,scope_ref,enabled,reason)
VALUES('pilot','global',NULL,false,'Phase O controlled pilot safe default')
ON CONFLICT(operation,scope_type,scope_ref_key) DO NOTHING;

CREATE TABLE IF NOT EXISTS private.supplier_pilot_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pilot_key text NOT NULL UNIQUE,
  supplier_id uuid NOT NULL REFERENCES private.supplier_foundation_suppliers(id) ON DELETE RESTRICT,
  provider_key text NOT NULL,
  cohort_key text NOT NULL UNIQUE,
  territory text NOT NULL DEFAULT 'GB',
  currency text NOT NULL DEFAULT 'GBP',
  status text NOT NULL DEFAULT 'draft',
  minimum_product_count integer NOT NULL DEFAULT 5,
  maximum_product_count integer NOT NULL DEFAULT 10,
  maximum_order_count integer NOT NULL,
  maximum_order_value_minor bigint NOT NULL,
  acceptance_thresholds jsonb NOT NULL,
  simulator_evidence_ref text NOT NULL,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  prepared_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  prepared_at timestamptz,
  activated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  activated_at timestamptz,
  ended_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  ended_at timestamptz,
  end_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplier_pilot_key_check CHECK (
    pilot_key=lower(BTRIM(pilot_key)) AND pilot_key ~ '^[a-z0-9][a-z0-9._-]{2,127}$'
  ),
  CONSTRAINT supplier_pilot_provider_check CHECK (NULLIF(BTRIM(provider_key),'') IS NOT NULL),
  CONSTRAINT supplier_pilot_cohort_check CHECK (
    cohort_key=lower(BTRIM(cohort_key)) AND cohort_key ~ '^[a-z0-9][a-z0-9._-]{2,127}$'
  ),
  CONSTRAINT supplier_pilot_territory_check CHECK (territory='GB'),
  CONSTRAINT supplier_pilot_currency_check CHECK (currency='GBP'),
  CONSTRAINT supplier_pilot_status_check CHECK (
    status IN ('draft','preparing','active','paused','completed','failed','cancelled')
  ),
  CONSTRAINT supplier_pilot_product_bounds_check CHECK (
    minimum_product_count BETWEEN 1 AND 10
    AND maximum_product_count BETWEEN 1 AND 10
    AND minimum_product_count<=maximum_product_count
  ),
  CONSTRAINT supplier_pilot_order_bounds_check CHECK (
    maximum_order_count>0 AND maximum_order_value_minor>0
  ),
  CONSTRAINT supplier_pilot_thresholds_check CHECK (
    jsonb_typeof(acceptance_thresholds)='object'
    AND acceptance_thresholds ? 'acknowledgementRateMinPct'
    AND acceptance_thresholds ? 'duplicateSideEffectsMax'
    AND acceptance_thresholds ? 'oversellMax'
    AND acceptance_thresholds ? 'unreconciledFinancialExceptionsMax'
    AND acceptance_thresholds ? 'criticalIncidentMax'
    AND COALESCE((acceptance_thresholds->>'duplicateSideEffectsMax')::integer,-1)=0
    AND COALESCE((acceptance_thresholds->>'unreconciledFinancialExceptionsMax')::integer,-1)=0
    AND COALESCE((acceptance_thresholds->>'criticalIncidentMax')::integer,-1)=0
  ),
  CONSTRAINT supplier_pilot_evidence_check CHECK (jsonb_typeof(evidence)='object'),
  CONSTRAINT supplier_pilot_simulator_ref_check CHECK (NULLIF(BTRIM(simulator_evidence_ref),'') IS NOT NULL),
  CONSTRAINT supplier_pilot_prepare_check CHECK (
    status NOT IN ('preparing','active','paused','completed','failed')
    OR (prepared_by IS NOT NULL AND prepared_at IS NOT NULL)
  ),
  CONSTRAINT supplier_pilot_activate_check CHECK (
    status NOT IN ('active','paused','completed','failed')
    OR (activated_by IS NOT NULL AND activated_at IS NOT NULL)
  ),
  CONSTRAINT supplier_pilot_end_check CHECK (
    status NOT IN ('completed','failed','cancelled')
    OR (ended_by IS NOT NULL AND ended_at IS NOT NULL AND NULLIF(BTRIM(end_reason),'') IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS supplier_pilot_one_live_program
  ON private.supplier_pilot_programs((true))
  WHERE status IN ('preparing','active');
CREATE INDEX IF NOT EXISTS supplier_pilot_supplier_idx
  ON private.supplier_pilot_programs(supplier_id,status,created_at DESC);

CREATE TABLE IF NOT EXISTS private.supplier_pilot_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pilot_id uuid NOT NULL REFERENCES private.supplier_pilot_programs(id) ON DELETE RESTRICT,
  supplier_offer_id uuid NOT NULL REFERENCES private.supplier_offers(id) ON DELETE RESTRICT,
  external_variant_ref text NOT NULL DEFAULT '',
  risk_class text NOT NULL DEFAULT 'low',
  selection_evidence jsonb NOT NULL,
  approved_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  approved_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplier_pilot_offer_variant_check CHECK (external_variant_ref=BTRIM(external_variant_ref)),
  CONSTRAINT supplier_pilot_offer_risk_check CHECK (risk_class='low'),
  CONSTRAINT supplier_pilot_offer_evidence_check CHECK (
    jsonb_typeof(selection_evidence)='object' AND selection_evidence<>'{}'::jsonb
  ),
  UNIQUE(pilot_id,supplier_offer_id,external_variant_ref)
);
CREATE INDEX IF NOT EXISTS supplier_pilot_offer_lookup_idx
  ON private.supplier_pilot_offers(pilot_id,supplier_offer_id);

CREATE TABLE IF NOT EXISTS private.supplier_pilot_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pilot_id uuid NOT NULL REFERENCES private.supplier_pilot_programs(id) ON DELETE RESTRICT,
  order_id uuid REFERENCES public.orders(id) ON DELETE RESTRICT,
  evidence_type text NOT NULL,
  evidence_ref text NOT NULL,
  summary text NOT NULL,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  recorded_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  observed_at timestamptz NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplier_pilot_evidence_type_check CHECK (
    evidence_type IN ('buyer_communication','kill_switch_test','operator_escalation','incident_review','pilot_note')
  ),
  CONSTRAINT supplier_pilot_evidence_ref_check CHECK (NULLIF(BTRIM(evidence_ref),'') IS NOT NULL),
  CONSTRAINT supplier_pilot_evidence_summary_check CHECK (NULLIF(BTRIM(summary),'') IS NOT NULL),
  CONSTRAINT supplier_pilot_evidence_object_check CHECK (jsonb_typeof(evidence)='object')
);
CREATE INDEX IF NOT EXISTS supplier_pilot_evidence_idx
  ON private.supplier_pilot_evidence(pilot_id,evidence_type,observed_at DESC);

CREATE TABLE IF NOT EXISTS private.supplier_pilot_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pilot_id uuid NOT NULL REFERENCES private.supplier_pilot_programs(id) ON DELETE RESTRICT,
  actor_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  previous_status text,
  new_status text,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplier_pilot_audit_evidence_check CHECK (jsonb_typeof(evidence)='object')
);
CREATE INDEX IF NOT EXISTS supplier_pilot_audit_idx
  ON private.supplier_pilot_audit(pilot_id,created_at DESC);

REVOKE ALL ON TABLE private.supplier_pilot_programs FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON TABLE private.supplier_pilot_offers FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON TABLE private.supplier_pilot_evidence FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON TABLE private.supplier_pilot_audit FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION private.guard_supplier_pilot_history_v1()
RETURNS trigger LANGUAGE plpgsql SET search_path TO '' AS $$
BEGIN
  RAISE EXCEPTION 'controlled pilot evidence/history is append-only';
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_supplier_pilot_evidence_immutable_v1 ON private.supplier_pilot_evidence;
CREATE TRIGGER trg_guard_supplier_pilot_evidence_immutable_v1
BEFORE UPDATE OR DELETE ON private.supplier_pilot_evidence
FOR EACH ROW EXECUTE FUNCTION private.guard_supplier_pilot_history_v1();
DROP TRIGGER IF EXISTS trg_guard_supplier_pilot_audit_immutable_v1 ON private.supplier_pilot_audit;
CREATE TRIGGER trg_guard_supplier_pilot_audit_immutable_v1
BEFORE UPDATE OR DELETE ON private.supplier_pilot_audit
FOR EACH ROW EXECUTE FUNCTION private.guard_supplier_pilot_history_v1();

CREATE OR REPLACE FUNCTION private.set_supplier_pilot_master_control_v1(
  p_actor_id uuid,p_enabled boolean,p_reason text
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE
  v_existing private.supplier_commerce_controls%ROWTYPE;
  v_saved private.supplier_commerce_controls%ROWTYPE;
BEGIN
  PERFORM private.require_active_admin_v1(p_actor_id);
  IF NULLIF(BTRIM(p_reason),'') IS NULL THEN RAISE EXCEPTION 'pilot control reason is required'; END IF;
  SELECT * INTO v_existing FROM private.supplier_commerce_controls
   WHERE operation='pilot' AND scope_type='global' AND scope_ref IS NULL FOR UPDATE;
  IF FOUND THEN
    UPDATE private.supplier_commerce_controls
       SET enabled=p_enabled,reason=BTRIM(p_reason),version=version+1,updated_by=p_actor_id,updated_at=now()
     WHERE id=v_existing.id RETURNING * INTO v_saved;
  ELSE
    INSERT INTO private.supplier_commerce_controls(operation,scope_type,scope_ref,enabled,reason,updated_by)
    VALUES('pilot','global',NULL,p_enabled,BTRIM(p_reason),p_actor_id) RETURNING * INTO v_saved;
  END IF;
  INSERT INTO private.supplier_commerce_control_audit(
    control_id,actor_id,operation,scope_type,scope_ref,previous_enabled,new_enabled,previous_version,new_version,reason
  ) VALUES(
    v_saved.id,p_actor_id,'pilot','global',NULL,
    CASE WHEN v_existing.id IS NULL THEN NULL ELSE v_existing.enabled END,v_saved.enabled,
    CASE WHEN v_existing.id IS NULL THEN NULL ELSE v_existing.version END,v_saved.version,BTRIM(p_reason)
  );
END;
$$;
REVOKE ALL ON FUNCTION private.set_supplier_pilot_master_control_v1(uuid,boolean,text) FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION private.supplier_pilot_control_decision_v1(
  p_operation text,p_scope jsonb
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE
  v_operation text:=lower(BTRIM(COALESCE(p_operation,'')));
  v_supplier_ref text:=NULLIF(BTRIM(p_scope->>'supplierRef'),'');
  v_provider_ref text:=NULLIF(BTRIM(p_scope->>'providerRef'),'');
  v_offer_ref text:=NULLIF(BTRIM(p_scope->>'offerRef'),'');
  v_product_ref text:=NULLIF(BTRIM(p_scope->>'productRef'),'');
  v_territory text:=NULLIF(upper(BTRIM(p_scope->>'territory')),'');
  v_cohort text:=NULLIF(BTRIM(p_scope->>'cohort'),'');
  v_pilot private.supplier_pilot_programs%ROWTYPE;
  v_supplier private.supplier_foundation_suppliers%ROWTYPE;
  v_offer private.supplier_offers%ROWTYPE;
  v_pilot_control private.supplier_commerce_controls%ROWTYPE;
  v_blocker private.supplier_commerce_controls%ROWTYPE;
BEGIN
  SELECT * INTO v_pilot_control FROM private.supplier_commerce_controls
   WHERE operation='pilot' AND scope_type='global' AND scope_ref IS NULL LIMIT 1;
  IF NOT FOUND OR v_pilot_control.enabled IS DISTINCT FROM true THEN
    RETURN jsonb_build_object('enabled',false,'reason','pilot_master_disabled','interfaceVersion',1);
  END IF;

  IF v_supplier_ref IS NULL THEN
    RETURN jsonb_build_object('enabled',false,'reason','pilot_supplier_scope_required','interfaceVersion',1);
  END IF;

  SELECT p,s INTO v_pilot,v_supplier
    FROM private.supplier_pilot_programs p
    JOIN private.supplier_foundation_suppliers s ON s.id=p.supplier_id
   WHERE p.status IN ('preparing','active')
     AND v_supplier_ref IN (p.supplier_id::text,s.supplier_key)
     AND (v_provider_ref IS NULL OR v_provider_ref=p.provider_key)
     AND (v_cohort IS NULL OR v_cohort=p.cohort_key)
     AND (v_territory IS NULL OR v_territory=p.territory)
   ORDER BY p.created_at DESC LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('enabled',false,'reason','pilot_scope_not_allowlisted','interfaceVersion',1);
  END IF;

  IF v_pilot.status='preparing' AND v_operation NOT IN ('import','stock_sync','price_sync') THEN
    RETURN jsonb_build_object('enabled',false,'reason','pilot_not_active','pilotId',v_pilot.id,'interfaceVersion',1);
  END IF;

  IF v_operation<>'import' THEN
    IF v_offer_ref IS NULL THEN
      RETURN jsonb_build_object('enabled',false,'reason','pilot_offer_scope_required','pilotId',v_pilot.id,'interfaceVersion',1);
    END IF;
    SELECT o.* INTO v_offer
      FROM private.supplier_pilot_offers po
      JOIN private.supplier_offers o ON o.id=po.supplier_offer_id
     WHERE po.pilot_id=v_pilot.id
       AND v_offer_ref IN (o.id::text,o.offer_key)
       AND o.supplier_id=v_pilot.supplier_id
       AND o.territory=v_pilot.territory
       AND o.status='approved'
     LIMIT 1;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('enabled',false,'reason','pilot_offer_not_allowlisted','pilotId',v_pilot.id,'interfaceVersion',1);
    END IF;
    IF v_product_ref IS NOT NULL AND v_product_ref NOT IN (v_offer.canonical_product_id::text) THEN
      RETURN jsonb_build_object('enabled',false,'reason','pilot_product_scope_mismatch','pilotId',v_pilot.id,'interfaceVersion',1);
    END IF;
  END IF;

  SELECT * INTO v_blocker FROM private.supplier_commerce_controls c
   WHERE c.enabled=false AND c.operation IN ('*',v_operation)
     AND (
       (c.scope_type='supplier' AND c.scope_ref IN (v_pilot.supplier_id::text,v_supplier.supplier_key))
       OR (c.scope_type='provider' AND c.scope_ref=v_pilot.provider_key)
       OR (c.scope_type='territory' AND c.scope_ref=v_pilot.territory)
       OR (c.scope_type='cohort' AND c.scope_ref=v_pilot.cohort_key)
       OR (v_offer.id IS NOT NULL AND c.scope_type='offer' AND c.scope_ref IN (v_offer.id::text,v_offer.offer_key))
       OR (v_offer.id IS NOT NULL AND c.scope_type='product' AND c.scope_ref=v_offer.canonical_product_id::text)
     )
   ORDER BY c.updated_at DESC LIMIT 1;
  IF FOUND THEN
    RETURN jsonb_build_object('enabled',false,'reason','scoped_kill_switch','pilotId',v_pilot.id,
      'scopeType',v_blocker.scope_type,'scopeRef',v_blocker.scope_ref,'controlVersion',v_blocker.version,'interfaceVersion',1);
  END IF;

  RETURN jsonb_build_object(
    'enabled',true,
    'reason',CASE WHEN v_pilot.status='preparing' THEN 'controlled_pilot_preparation_enabled' ELSE 'controlled_pilot_enabled' END,
    'operation',v_operation,'pilotId',v_pilot.id,'cohort',v_pilot.cohort_key,'interfaceVersion',1,
    'controlVersion',v_pilot_control.version
  );
END;
$$;
REVOKE ALL ON FUNCTION private.supplier_pilot_control_decision_v1(text,jsonb) FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.server_supplier_commerce_control_decision_v1(
  p_operation text,p_scope jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE
  v_operation text:=lower(BTRIM(COALESCE(p_operation,'')));
  v_global private.supplier_commerce_controls%ROWTYPE;
  v_operation_control private.supplier_commerce_controls%ROWTYPE;
  v_scope_type text; v_scope_ref text; v_scope_key text;
  v_blocker private.supplier_commerce_controls%ROWTYPE;
  v_pilot jsonb;
BEGIN
  IF v_operation NOT IN ('import','publish','checkout','reservation','supplier_order','tracking_ingest','return_recovery','stock_sync','price_sync') THEN
    RETURN jsonb_build_object('enabled',false,'reason','unknown_operation','interfaceVersion',1);
  END IF;
  IF p_scope IS NULL OR jsonb_typeof(p_scope) IS DISTINCT FROM 'object' THEN
    RETURN jsonb_build_object('enabled',false,'reason','invalid_scope','interfaceVersion',1);
  END IF;

  SELECT * INTO v_global FROM private.supplier_commerce_controls
   WHERE operation='*' AND scope_type='global' AND scope_ref IS NULL LIMIT 1;
  SELECT * INTO v_operation_control FROM private.supplier_commerce_controls
   WHERE operation=v_operation AND scope_type='global' AND scope_ref IS NULL LIMIT 1;

  IF FOUND AND v_global.enabled=true AND v_operation_control.enabled=true THEN
    FOREACH v_scope_type IN ARRAY ARRAY['provider','supplier','offer','product','category','territory','cohort']::text[] LOOP
      v_scope_key:=CASE v_scope_type WHEN 'provider' THEN 'providerRef' WHEN 'supplier' THEN 'supplierRef'
        WHEN 'offer' THEN 'offerRef' WHEN 'product' THEN 'productRef' WHEN 'category' THEN 'categoryRef'
        WHEN 'territory' THEN 'territory' WHEN 'cohort' THEN 'cohort' END;
      v_scope_ref:=NULLIF(BTRIM(p_scope->>v_scope_key),'');
      IF v_scope_ref IS NOT NULL THEN
        SELECT * INTO v_blocker FROM private.supplier_commerce_controls
         WHERE operation IN ('*',v_operation) AND scope_type=v_scope_type AND scope_ref=v_scope_ref AND enabled=false
         ORDER BY CASE WHEN operation=v_operation THEN 0 ELSE 1 END LIMIT 1;
        IF FOUND THEN RETURN jsonb_build_object('enabled',false,'reason','scoped_kill_switch','operation',v_operation,
          'scopeType',v_scope_type,'scopeRef',v_scope_ref,'interfaceVersion',1,'controlVersion',v_blocker.version); END IF;
      END IF;
    END LOOP;
    RETURN jsonb_build_object('enabled',true,'reason','enabled','operation',v_operation,'interfaceVersion',1,
      'controlVersion',GREATEST(v_global.version,v_operation_control.version));
  END IF;

  v_pilot:=private.supplier_pilot_control_decision_v1(v_operation,p_scope);
  IF COALESCE((v_pilot->>'enabled')::boolean,false)=true THEN RETURN v_pilot; END IF;

  IF v_global.id IS NULL OR v_global.enabled IS DISTINCT FROM true THEN
    RETURN jsonb_build_object('enabled',false,'reason','supplier_commerce_global_disabled','operation',v_operation,
      'pilotReason',v_pilot->>'reason','interfaceVersion',1,'controlVersion',COALESCE(v_global.version,0));
  END IF;
  RETURN jsonb_build_object('enabled',false,'reason','operation_disabled','operation',v_operation,
    'pilotReason',v_pilot->>'reason','interfaceVersion',1,'controlVersion',COALESCE(v_operation_control.version,0));
END;
$$;
REVOKE ALL ON FUNCTION public.server_supplier_commerce_control_decision_v1(text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.server_supplier_commerce_control_decision_v1(text,jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.server_admin_create_supplier_pilot_v1(
  p_actor_id uuid,p_pilot_key text,p_supplier_id uuid,p_provider_key text,p_cohort_key text,
  p_maximum_order_count integer,p_maximum_order_value_minor bigint,p_acceptance_thresholds jsonb,
  p_simulator_evidence_ref text,p_evidence jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE v_id uuid;
BEGIN
  PERFORM private.require_active_admin_v1(p_actor_id);
  IF NOT EXISTS(SELECT 1 FROM private.supplier_foundation_suppliers s WHERE s.id=p_supplier_id) THEN RAISE EXCEPTION 'supplier foundation record required'; END IF;
  IF NULLIF(BTRIM(p_pilot_key),'') IS NULL OR NULLIF(BTRIM(p_provider_key),'') IS NULL OR NULLIF(BTRIM(p_cohort_key),'') IS NULL
     OR p_maximum_order_count IS NULL OR p_maximum_order_count<=0 OR p_maximum_order_value_minor IS NULL OR p_maximum_order_value_minor<=0
     OR jsonb_typeof(COALESCE(p_acceptance_thresholds,'{}'::jsonb))<>'object' OR NULLIF(BTRIM(p_simulator_evidence_ref),'') IS NULL
     OR jsonb_typeof(COALESCE(p_evidence,'{}'::jsonb))<>'object' THEN RAISE EXCEPTION 'complete controlled pilot definition is required'; END IF;
  INSERT INTO private.supplier_pilot_programs(
    pilot_key,supplier_id,provider_key,cohort_key,maximum_order_count,maximum_order_value_minor,
    acceptance_thresholds,simulator_evidence_ref,evidence,created_by
  ) VALUES(
    lower(BTRIM(p_pilot_key)),p_supplier_id,BTRIM(p_provider_key),lower(BTRIM(p_cohort_key)),p_maximum_order_count,p_maximum_order_value_minor,
    p_acceptance_thresholds,BTRIM(p_simulator_evidence_ref),COALESCE(p_evidence,'{}'::jsonb),p_actor_id
  ) RETURNING id INTO v_id;
  INSERT INTO private.supplier_pilot_audit(pilot_id,actor_id,action,new_status,evidence)
  VALUES(v_id,p_actor_id,'create','draft',jsonb_build_object('simulatorEvidenceRef',BTRIM(p_simulator_evidence_ref)));
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.server_admin_create_supplier_pilot_v1(uuid,text,uuid,text,text,integer,bigint,jsonb,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.server_admin_create_supplier_pilot_v1(uuid,text,uuid,text,text,integer,bigint,jsonb,text,jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.server_admin_add_supplier_pilot_offer_v1(
  p_actor_id uuid,p_pilot_id uuid,p_supplier_offer_id uuid,p_external_variant_ref text,p_selection_evidence jsonb
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE v_pilot private.supplier_pilot_programs%ROWTYPE; v_offer private.supplier_offers%ROWTYPE; v_id uuid; v_count integer;
BEGIN
  PERFORM private.require_active_admin_v1(p_actor_id);
  SELECT * INTO v_pilot FROM private.supplier_pilot_programs WHERE id=p_pilot_id FOR UPDATE;
  IF NOT FOUND OR v_pilot.status NOT IN ('draft','preparing') THEN RAISE EXCEPTION 'pilot offer set is mutable only before activation'; END IF;
  SELECT * INTO v_offer FROM private.supplier_offers WHERE id=p_supplier_offer_id AND supplier_id=v_pilot.supplier_id AND territory='GB' AND status='approved';
  IF NOT FOUND THEN RAISE EXCEPTION 'approved GB supplier offer for pilot supplier required'; END IF;
  IF NOT EXISTS(SELECT 1 FROM private.canonical_products p WHERE p.id=v_offer.canonical_product_id AND p.status='active') THEN RAISE EXCEPTION 'active canonical product required'; END IF;
  IF jsonb_typeof(COALESCE(p_selection_evidence,'{}'::jsonb))<>'object' OR COALESCE(p_selection_evidence,'{}'::jsonb)='{}'::jsonb THEN RAISE EXCEPTION 'low-risk product selection evidence required'; END IF;
  SELECT count(*) INTO v_count FROM private.supplier_pilot_offers WHERE pilot_id=p_pilot_id;
  IF v_count>=v_pilot.maximum_product_count THEN RAISE EXCEPTION 'pilot product ceiling reached'; END IF;
  INSERT INTO private.supplier_pilot_offers(pilot_id,supplier_offer_id,external_variant_ref,selection_evidence,approved_by)
  VALUES(p_pilot_id,p_supplier_offer_id,BTRIM(COALESCE(p_external_variant_ref,'')),p_selection_evidence,p_actor_id)
  ON CONFLICT(pilot_id,supplier_offer_id,external_variant_ref) DO UPDATE SET supplier_offer_id=EXCLUDED.supplier_offer_id
  RETURNING id INTO v_id;
  INSERT INTO private.supplier_pilot_audit(pilot_id,actor_id,action,new_status,evidence)
  VALUES(p_pilot_id,p_actor_id,'add_offer',v_pilot.status,jsonb_build_object('supplierOfferId',p_supplier_offer_id,'variantRef',BTRIM(COALESCE(p_external_variant_ref,''))));
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.server_admin_add_supplier_pilot_offer_v1(uuid,uuid,uuid,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.server_admin_add_supplier_pilot_offer_v1(uuid,uuid,uuid,text,jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.server_supplier_pilot_readiness_v1(p_pilot_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE
  v_pilot private.supplier_pilot_programs%ROWTYPE; v_supplier private.supplier_foundation_suppliers%ROWTYPE;
  v_foundation jsonb; v_governance jsonb; v_offer record; v_decision jsonb;
  v_offer_count integer:=0; v_product_count integer:=0; v_failures jsonb:='[]'::jsonb;
  v_required_cap text;
BEGIN
  SELECT * INTO v_pilot FROM private.supplier_pilot_programs WHERE id=p_pilot_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ready',false,'reason','pilot_not_found','interfaceVersion',1); END IF;
  SELECT * INTO v_supplier FROM private.supplier_foundation_suppliers WHERE id=v_pilot.supplier_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ready',false,'reason','supplier_not_found','interfaceVersion',1); END IF;

  v_foundation:=public.server_supplier_foundation_decision_v1(v_supplier.supplier_key,'GB','catalog');
  IF COALESCE((v_foundation->>'eligible')::boolean,false) IS DISTINCT FROM true THEN
    v_failures:=v_failures||jsonb_build_array(jsonb_build_object('check','supplier_foundation','detail',v_foundation));
  END IF;
  v_governance:=public.server_supplier_governance_decision_v1(v_pilot.supplier_id,v_pilot.provider_key);
  IF COALESCE((v_governance->>'eligible')::boolean,false) IS DISTINCT FROM true THEN
    v_failures:=v_failures||jsonb_build_array(jsonb_build_object('check','supplier_governance','detail',v_governance));
  END IF;

  IF NOT EXISTS(
    SELECT 1 FROM private.supplier_commerce_provider_capabilities c
     WHERE c.provider_key=v_pilot.provider_key AND c.territory='GB' AND c.role IN ('supplier','fulfilment_provider')
       AND c.status='verified' AND c.verified_at IS NOT NULL AND c.reverify_due_at>now()
       AND jsonb_array_length(c.official_source_refs)>0
  ) THEN v_failures:=v_failures||jsonb_build_array(jsonb_build_object('check','provider_capability_register','reason','current_verified_provider_capability_missing')); END IF;

  FOREACH v_required_cap IN ARRAY ARRAY['catalog','stock','price','shipping','order_submission','acknowledgement','tracking','cancellation','returns','reimbursement']::text[] LOOP
    IF NOT EXISTS(
      SELECT 1 FROM private.supplier_adapter_registrations a
       WHERE a.supplier_id=v_pilot.supplier_id AND a.provider_key=v_pilot.provider_key AND a.status='active'
         AND a.interface_version=1 AND a.capabilities @> ARRAY[v_required_cap]::text[]
         AND a.verified_at IS NOT NULL
    ) THEN v_failures:=v_failures||jsonb_build_array(jsonb_build_object('check','adapter_capability','capability',v_required_cap)); END IF;
  END LOOP;

  SELECT count(*),count(DISTINCT o.canonical_product_id) INTO v_offer_count,v_product_count
    FROM private.supplier_pilot_offers po JOIN private.supplier_offers o ON o.id=po.supplier_offer_id
   WHERE po.pilot_id=v_pilot.id;
  IF v_offer_count<v_pilot.minimum_product_count OR v_offer_count>v_pilot.maximum_product_count OR v_product_count<>v_offer_count THEN
    v_failures:=v_failures||jsonb_build_array(jsonb_build_object('check','pilot_product_set','offerCount',v_offer_count,'distinctProductCount',v_product_count,'minimum',v_pilot.minimum_product_count,'maximum',v_pilot.maximum_product_count));
  END IF;

  FOR v_offer IN
    SELECT po.supplier_offer_id,po.external_variant_ref,o.canonical_product_id,o.offer_key
      FROM private.supplier_pilot_offers po JOIN private.supplier_offers o ON o.id=po.supplier_offer_id
     WHERE po.pilot_id=v_pilot.id
  LOOP
    v_decision:=public.server_supplier_catalog_decision_v1(v_offer.canonical_product_id,v_offer.supplier_offer_id,'GB');
    IF COALESCE((v_decision->>'eligible')::boolean,false) IS DISTINCT FROM true THEN
      v_failures:=v_failures||jsonb_build_array(jsonb_build_object('check','catalog_readiness','offer',v_offer.offer_key,'detail',v_decision));
    END IF;
    v_decision:=public.server_supplier_stock_price_decision_v1(v_offer.supplier_offer_id,v_offer.canonical_product_id,'loadify_supplier_fulfilled','GB',v_offer.external_variant_ref);
    IF COALESCE((v_decision->>'eligible')::boolean,false) IS DISTINCT FROM true THEN
      v_failures:=v_failures||jsonb_build_array(jsonb_build_object('check','stock_price_readiness','offer',v_offer.offer_key,'detail',v_decision));
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'ready',jsonb_array_length(v_failures)=0,'reason',CASE WHEN jsonb_array_length(v_failures)=0 THEN 'controlled_pilot_ready' ELSE 'controlled_pilot_not_ready' END,
    'pilotId',v_pilot.id,'supplierId',v_pilot.supplier_id,'providerKey',v_pilot.provider_key,'territory','GB',
    'offerCount',v_offer_count,'distinctProductCount',v_product_count,'failures',v_failures,'simulatorPassIsNotPilotPass',true,'interfaceVersion',1
  );
END;
$$;
REVOKE ALL ON FUNCTION public.server_supplier_pilot_readiness_v1(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.server_supplier_pilot_readiness_v1(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.server_admin_prepare_supplier_pilot_v1(p_actor_id uuid,p_pilot_id uuid,p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE v_pilot private.supplier_pilot_programs%ROWTYPE; v_supplier private.supplier_foundation_suppliers%ROWTYPE; v_foundation jsonb; v_governance jsonb;
BEGIN
  PERFORM private.require_active_admin_v1(p_actor_id);
  IF NULLIF(BTRIM(p_reason),'') IS NULL THEN RAISE EXCEPTION 'pilot preparation reason required'; END IF;
  SELECT * INTO v_pilot FROM private.supplier_pilot_programs WHERE id=p_pilot_id FOR UPDATE;
  IF NOT FOUND OR v_pilot.status NOT IN ('draft','paused') THEN RAISE EXCEPTION 'pilot must be draft or paused to enter preparation'; END IF;
  SELECT * INTO v_supplier FROM private.supplier_foundation_suppliers WHERE id=v_pilot.supplier_id;
  v_foundation:=public.server_supplier_foundation_decision_v1(v_supplier.supplier_key,'GB','catalog');
  IF COALESCE((v_foundation->>'eligible')::boolean,false) IS DISTINCT FROM true THEN RETURN jsonb_build_object('ok',false,'reason','supplier_foundation_not_ready','detail',v_foundation,'interfaceVersion',1); END IF;
  v_governance:=public.server_supplier_governance_decision_v1(v_pilot.supplier_id,v_pilot.provider_key);
  IF COALESCE((v_governance->>'eligible')::boolean,false) IS DISTINCT FROM true THEN RETURN jsonb_build_object('ok',false,'reason','supplier_governance_not_ready','detail',v_governance,'interfaceVersion',1); END IF;
  IF NOT EXISTS(SELECT 1 FROM private.supplier_commerce_provider_capabilities c WHERE c.provider_key=v_pilot.provider_key AND c.territory='GB' AND c.status='verified' AND c.reverify_due_at>now()) THEN
    RETURN jsonb_build_object('ok',false,'reason','provider_capability_not_current','interfaceVersion',1);
  END IF;
  UPDATE private.supplier_pilot_programs SET status='preparing',prepared_by=COALESCE(prepared_by,p_actor_id),prepared_at=COALESCE(prepared_at,now()),updated_at=now() WHERE id=v_pilot.id;
  PERFORM private.set_supplier_pilot_master_control_v1(p_actor_id,true,'Phase O preparation: '||BTRIM(p_reason));
  INSERT INTO private.supplier_pilot_audit(pilot_id,actor_id,action,previous_status,new_status,evidence)
  VALUES(v_pilot.id,p_actor_id,'prepare',v_pilot.status,'preparing',jsonb_build_object('reason',BTRIM(p_reason)));
  RETURN jsonb_build_object('ok',true,'pilotId',v_pilot.id,'status','preparing','buyerFacingOperationsEnabled',false,'interfaceVersion',1);
END;
$$;
REVOKE ALL ON FUNCTION public.server_admin_prepare_supplier_pilot_v1(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.server_admin_prepare_supplier_pilot_v1(uuid,uuid,text) TO service_role;

CREATE OR REPLACE FUNCTION public.server_admin_activate_supplier_pilot_v1(p_actor_id uuid,p_pilot_id uuid,p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE v_pilot private.supplier_pilot_programs%ROWTYPE; v_readiness jsonb;
BEGIN
  PERFORM private.require_active_admin_v1(p_actor_id);
  IF NULLIF(BTRIM(p_reason),'') IS NULL THEN RAISE EXCEPTION 'pilot activation reason required'; END IF;
  SELECT * INTO v_pilot FROM private.supplier_pilot_programs WHERE id=p_pilot_id FOR UPDATE;
  IF NOT FOUND OR v_pilot.status<>'preparing' THEN RAISE EXCEPTION 'pilot must be preparing before activation'; END IF;
  v_readiness:=public.server_supplier_pilot_readiness_v1(v_pilot.id);
  IF COALESCE((v_readiness->>'ready')::boolean,false) IS DISTINCT FROM true THEN RETURN jsonb_build_object('ok',false,'reason','pilot_readiness_failed','readiness',v_readiness,'interfaceVersion',1); END IF;
  UPDATE private.supplier_pilot_programs SET status='active',activated_by=p_actor_id,activated_at=now(),updated_at=now() WHERE id=v_pilot.id;
  PERFORM private.set_supplier_pilot_master_control_v1(p_actor_id,true,'Phase O active controlled pilot: '||BTRIM(p_reason));
  INSERT INTO private.supplier_pilot_audit(pilot_id,actor_id,action,previous_status,new_status,evidence)
  VALUES(v_pilot.id,p_actor_id,'activate','preparing','active',jsonb_build_object('reason',BTRIM(p_reason),'readiness',v_readiness));
  RETURN jsonb_build_object('ok',true,'pilotId',v_pilot.id,'status','active','globalSupplierCommerceEnabled',false,'readiness',v_readiness,'interfaceVersion',1);
END;
$$;
REVOKE ALL ON FUNCTION public.server_admin_activate_supplier_pilot_v1(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.server_admin_activate_supplier_pilot_v1(uuid,uuid,text) TO service_role;

CREATE OR REPLACE FUNCTION public.server_admin_record_supplier_pilot_evidence_v1(
  p_actor_id uuid,p_pilot_id uuid,p_order_id uuid,p_evidence_type text,p_evidence_ref text,p_summary text,p_observed_at timestamptz,p_evidence jsonb
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE v_id uuid;
BEGIN
  PERFORM private.require_active_admin_v1(p_actor_id);
  IF NOT EXISTS(SELECT 1 FROM private.supplier_pilot_programs p WHERE p.id=p_pilot_id AND p.status IN ('active','paused')) THEN RAISE EXCEPTION 'pilot must be active or paused to record evidence'; END IF;
  IF p_order_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.orders o WHERE o.id=p_order_id) THEN RAISE EXCEPTION 'pilot evidence order not found'; END IF;
  INSERT INTO private.supplier_pilot_evidence(pilot_id,order_id,evidence_type,evidence_ref,summary,evidence,recorded_by,observed_at)
  VALUES(p_pilot_id,p_order_id,lower(BTRIM(p_evidence_type)),BTRIM(p_evidence_ref),BTRIM(p_summary),COALESCE(p_evidence,'{}'::jsonb),p_actor_id,p_observed_at)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.server_admin_record_supplier_pilot_evidence_v1(uuid,uuid,uuid,text,text,text,timestamptz,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.server_admin_record_supplier_pilot_evidence_v1(uuid,uuid,uuid,text,text,text,timestamptz,jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.server_supplier_pilot_acceptance_v1(p_pilot_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE
  v_pilot private.supplier_pilot_programs%ROWTYPE;
  v_orders integer:=0; v_acks integer:=0; v_delivered integer:=0; v_returns integer:=0; v_refunds integer:=0; v_recoveries integer:=0; v_reconciled integer:=0;
  v_open_critical integer:=0; v_ack_rate numeric:=0; v_ack_min numeric:=0; v_failures jsonb:='[]'::jsonb;
BEGIN
  SELECT * INTO v_pilot FROM private.supplier_pilot_programs WHERE id=p_pilot_id;
  IF NOT FOUND OR v_pilot.activated_at IS NULL THEN RETURN jsonb_build_object('passed',false,'reason','pilot_not_activated','interfaceVersion',1); END IF;

  SELECT count(DISTINCT h.order_id),count(DISTINCT h.order_id) FILTER(WHERE h.state='reconciled' AND h.acknowledgement_state='accepted')
    INTO v_orders,v_acks
    FROM private.supplier_order_handshakes h
    JOIN private.supplier_pilot_offers po ON po.pilot_id=v_pilot.id AND po.supplier_offer_id=h.supplier_offer_id
   WHERE h.supplier_id=v_pilot.supplier_id AND h.provider_key=v_pilot.provider_key AND h.created_at>=v_pilot.activated_at;
  IF v_orders>0 THEN v_ack_rate:=round((v_acks::numeric/v_orders::numeric)*100,3); END IF;
  v_ack_min:=COALESCE((v_pilot.acceptance_thresholds->>'acknowledgementRateMinPct')::numeric,101);

  SELECT count(DISTINCT s.order_id) INTO v_delivered FROM private.supplier_leg_shipments s
    JOIN private.supplier_order_handshakes h ON h.id=s.handshake_id
    JOIN private.supplier_pilot_offers po ON po.pilot_id=v_pilot.id AND po.supplier_offer_id=h.supplier_offer_id
   WHERE s.supplier_id=v_pilot.supplier_id AND s.provider_key=v_pilot.provider_key AND s.canonical_status='delivered' AND s.created_at>=v_pilot.activated_at;
  SELECT count(DISTINCT r.order_id) INTO v_returns FROM private.supplier_return_cases r
    JOIN private.supplier_pilot_offers po ON po.pilot_id=v_pilot.id AND po.supplier_offer_id=r.supplier_offer_id
   WHERE r.supplier_id=v_pilot.supplier_id AND r.requested_at>=v_pilot.activated_at;
  SELECT count(DISTINCT e.order_id) INTO v_refunds FROM private.supplier_customer_refund_evidence e
    JOIN private.supplier_return_cases r ON r.id=e.return_case_id
    JOIN private.supplier_pilot_offers po ON po.pilot_id=v_pilot.id AND po.supplier_offer_id=r.supplier_offer_id
   WHERE e.state IN ('partial','succeeded') AND e.occurred_at>=v_pilot.activated_at;
  SELECT count(DISTINCT e.order_id) INTO v_recoveries FROM private.supplier_recovery_evidence e
   WHERE e.supplier_id=v_pilot.supplier_id AND e.state IN ('partial','recovered') AND e.occurred_at>=v_pilot.activated_at;
  SELECT count(DISTINCT f.order_id) INTO v_reconciled FROM private.supplier_financial_reconciliations f
   WHERE f.state='reconciled' AND f.evaluated_at>=v_pilot.activated_at
     AND EXISTS(SELECT 1 FROM private.supplier_order_handshakes h JOIN private.supplier_pilot_offers po ON po.pilot_id=v_pilot.id AND po.supplier_offer_id=h.supplier_offer_id WHERE h.order_id=f.order_id AND h.supplier_id=v_pilot.supplier_id);
  SELECT count(*) INTO v_open_critical FROM private.supplier_commerce_incidents i
   WHERE i.severity='critical' AND i.status NOT IN ('resolved','closed') AND i.supplier_ref IN (v_pilot.supplier_id::text,(SELECT supplier_key FROM private.supplier_foundation_suppliers WHERE id=v_pilot.supplier_id));

  IF v_orders=0 THEN v_failures:=v_failures||jsonb_build_array(jsonb_build_object('check','real_orders','reason','no_real_pilot_orders')); END IF;
  IF v_orders>v_pilot.maximum_order_count THEN v_failures:=v_failures||jsonb_build_array(jsonb_build_object('check','order_volume_limit','orders',v_orders,'maximum',v_pilot.maximum_order_count)); END IF;
  IF v_ack_rate<v_ack_min THEN v_failures:=v_failures||jsonb_build_array(jsonb_build_object('check','acknowledgement_rate','actualPct',v_ack_rate,'minimumPct',v_ack_min)); END IF;
  IF v_delivered=0 THEN v_failures:=v_failures||jsonb_build_array(jsonb_build_object('check','delivery','reason','no_delivered_pilot_order')); END IF;
  IF v_returns=0 OR v_refunds=0 OR v_recoveries=0 THEN v_failures:=v_failures||jsonb_build_array(jsonb_build_object('check','return_refund_recovery','returns',v_returns,'refunds',v_refunds,'recoveries',v_recoveries)); END IF;
  IF v_reconciled<v_orders THEN v_failures:=v_failures||jsonb_build_array(jsonb_build_object('check','financial_reconciliation','reconciledOrders',v_reconciled,'pilotOrders',v_orders)); END IF;
  IF v_open_critical>0 THEN v_failures:=v_failures||jsonb_build_array(jsonb_build_object('check','critical_incidents','open',v_open_critical)); END IF;
  IF NOT EXISTS(SELECT 1 FROM private.supplier_pilot_evidence e WHERE e.pilot_id=v_pilot.id AND e.evidence_type='buyer_communication') THEN v_failures:=v_failures||jsonb_build_array(jsonb_build_object('check','buyer_communication','reason','evidence_missing')); END IF;
  IF NOT EXISTS(SELECT 1 FROM private.supplier_pilot_evidence e WHERE e.pilot_id=v_pilot.id AND e.evidence_type='kill_switch_test') THEN v_failures:=v_failures||jsonb_build_array(jsonb_build_object('check','kill_switch_test','reason','evidence_missing')); END IF;

  RETURN jsonb_build_object(
    'passed',jsonb_array_length(v_failures)=0,'reason',CASE WHEN jsonb_array_length(v_failures)=0 THEN 'controlled_pilot_pass' ELSE 'controlled_pilot_evidence_incomplete' END,
    'pilotId',v_pilot.id,'orders',v_orders,'acknowledgedOrders',v_acks,'acknowledgementRatePct',v_ack_rate,'deliveredOrders',v_delivered,
    'returnOrders',v_returns,'refundOrders',v_refunds,'recoveryOrders',v_recoveries,'reconciledOrders',v_reconciled,'openCriticalIncidents',v_open_critical,
    'failures',v_failures,'simulatorPassIsNotPilotPass',true,'interfaceVersion',1
  );
END;
$$;
REVOKE ALL ON FUNCTION public.server_supplier_pilot_acceptance_v1(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.server_supplier_pilot_acceptance_v1(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.server_admin_pause_supplier_pilot_v1(p_actor_id uuid,p_pilot_id uuid,p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE v_pilot private.supplier_pilot_programs%ROWTYPE;
BEGIN
  PERFORM private.require_active_admin_v1(p_actor_id);
  IF NULLIF(BTRIM(p_reason),'') IS NULL THEN RAISE EXCEPTION 'pilot pause reason required'; END IF;
  SELECT * INTO v_pilot FROM private.supplier_pilot_programs WHERE id=p_pilot_id FOR UPDATE;
  IF NOT FOUND OR v_pilot.status NOT IN ('preparing','active') THEN RAISE EXCEPTION 'only preparing/active pilot can be paused'; END IF;
  UPDATE private.supplier_pilot_programs SET status='paused',updated_at=now() WHERE id=v_pilot.id;
  PERFORM private.set_supplier_pilot_master_control_v1(p_actor_id,false,'Phase O pilot paused: '||BTRIM(p_reason));
  INSERT INTO private.supplier_pilot_audit(pilot_id,actor_id,action,previous_status,new_status,evidence)
  VALUES(v_pilot.id,p_actor_id,'pause',v_pilot.status,'paused',jsonb_build_object('reason',BTRIM(p_reason)));
  RETURN jsonb_build_object('ok',true,'pilotId',v_pilot.id,'status','paused','pilotControlEnabled',false,'interfaceVersion',1);
END;
$$;
REVOKE ALL ON FUNCTION public.server_admin_pause_supplier_pilot_v1(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.server_admin_pause_supplier_pilot_v1(uuid,uuid,text) TO service_role;

CREATE OR REPLACE FUNCTION public.server_admin_complete_supplier_pilot_v1(p_actor_id uuid,p_pilot_id uuid,p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE v_pilot private.supplier_pilot_programs%ROWTYPE; v_acceptance jsonb;
BEGIN
  PERFORM private.require_active_admin_v1(p_actor_id);
  IF NULLIF(BTRIM(p_reason),'') IS NULL THEN RAISE EXCEPTION 'pilot completion reason required'; END IF;
  SELECT * INTO v_pilot FROM private.supplier_pilot_programs WHERE id=p_pilot_id FOR UPDATE;
  IF NOT FOUND OR v_pilot.status NOT IN ('active','paused') THEN RAISE EXCEPTION 'pilot must be active or paused to complete'; END IF;
  v_acceptance:=public.server_supplier_pilot_acceptance_v1(v_pilot.id);
  IF COALESCE((v_acceptance->>'passed')::boolean,false) IS DISTINCT FROM true THEN RETURN jsonb_build_object('ok',false,'reason','pilot_acceptance_failed','acceptance',v_acceptance,'interfaceVersion',1); END IF;
  UPDATE private.supplier_pilot_programs SET status='completed',ended_by=p_actor_id,ended_at=now(),end_reason=BTRIM(p_reason),updated_at=now() WHERE id=v_pilot.id;
  PERFORM private.set_supplier_pilot_master_control_v1(p_actor_id,false,'Phase O pilot completed: '||BTRIM(p_reason));
  INSERT INTO private.supplier_pilot_audit(pilot_id,actor_id,action,previous_status,new_status,evidence)
  VALUES(v_pilot.id,p_actor_id,'complete',v_pilot.status,'completed',jsonb_build_object('reason',BTRIM(p_reason),'acceptance',v_acceptance));
  RETURN jsonb_build_object('ok',true,'pilotId',v_pilot.id,'status','completed','pilotPass',true,'globalSupplierCommerceEnabled',false,'acceptance',v_acceptance,'interfaceVersion',1);
END;
$$;
REVOKE ALL ON FUNCTION public.server_admin_complete_supplier_pilot_v1(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.server_admin_complete_supplier_pilot_v1(uuid,uuid,text) TO service_role;

CREATE OR REPLACE FUNCTION public.server_admin_supplier_pilot_status_v1(p_actor_id uuid,p_pilot_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE v_pilot private.supplier_pilot_programs%ROWTYPE; v_control private.supplier_commerce_controls%ROWTYPE; v_readiness jsonb; v_acceptance jsonb;
BEGIN
  PERFORM private.require_active_admin_v1(p_actor_id);
  IF p_pilot_id IS NULL THEN SELECT * INTO v_pilot FROM private.supplier_pilot_programs ORDER BY created_at DESC LIMIT 1;
  ELSE SELECT * INTO v_pilot FROM private.supplier_pilot_programs WHERE id=p_pilot_id; END IF;
  SELECT * INTO v_control FROM private.supplier_commerce_controls WHERE operation='pilot' AND scope_type='global' AND scope_ref IS NULL LIMIT 1;
  IF v_pilot.id IS NULL THEN RETURN jsonb_build_object('exists',false,'pilotControlEnabled',COALESCE(v_control.enabled,false),'globalSupplierCommerceEnabled',false,'interfaceVersion',1); END IF;
  v_readiness:=public.server_supplier_pilot_readiness_v1(v_pilot.id);
  v_acceptance:=CASE WHEN v_pilot.activated_at IS NULL THEN jsonb_build_object('passed',false,'reason','pilot_not_activated','interfaceVersion',1) ELSE public.server_supplier_pilot_acceptance_v1(v_pilot.id) END;
  RETURN jsonb_build_object('exists',true,'pilotId',v_pilot.id,'pilotKey',v_pilot.pilot_key,'status',v_pilot.status,'supplierId',v_pilot.supplier_id,
    'providerKey',v_pilot.provider_key,'cohort',v_pilot.cohort_key,'territory',v_pilot.territory,'pilotControlEnabled',COALESCE(v_control.enabled,false),
    'globalSupplierCommerceEnabled',(SELECT COALESCE(enabled,false) FROM private.supplier_commerce_controls WHERE operation='*' AND scope_type='global' AND scope_ref IS NULL LIMIT 1),
    'readiness',v_readiness,'acceptance',v_acceptance,'simulatorPassIsNotPilotPass',true,'interfaceVersion',1);
END;
$$;
REVOKE ALL ON FUNCTION public.server_admin_supplier_pilot_status_v1(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.server_admin_supplier_pilot_status_v1(uuid,uuid) TO service_role;

COMMENT ON TABLE private.supplier_pilot_programs IS 'Phase O controlled-pilot definition. Exactly one live preparation/active pilot; GB baseline; no global Supplier Commerce activation.';
COMMENT ON FUNCTION public.server_supplier_pilot_readiness_v1(uuid) IS 'Phase O factual preflight gate. Readiness is not Pilot PASS and requires real supplier/offer/governance/stock/price evidence.';
COMMENT ON FUNCTION public.server_supplier_pilot_acceptance_v1(uuid) IS 'Phase O no-fake-pass acceptance gate. Requires real orders, acknowledgement, delivery, return/refund/recovery, reconciliation and operator evidence.';
