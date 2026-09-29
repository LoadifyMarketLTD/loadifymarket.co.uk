-- Phase O commercial viability gate.
-- Requires evidence-backed UK market competitiveness before a controlled pilot can activate.
-- Additive and fail-closed: this migration does not activate a pilot or publish products.

CREATE TABLE IF NOT EXISTS private.supplier_pilot_market_viability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pilot_id uuid NOT NULL REFERENCES private.supplier_pilot_programs(id) ON DELETE RESTRICT,
  pilot_offer_id uuid NOT NULL REFERENCES private.supplier_pilot_offers(id) ON DELETE RESTRICT,
  pricing_snapshot_id uuid NOT NULL REFERENCES private.supplier_pricing_snapshots(id) ON DELETE RESTRICT,
  market_code text NOT NULL DEFAULT 'GB',
  currency text NOT NULL DEFAULT 'GBP',
  benchmark_sample_count integer NOT NULL,
  benchmark_low_price numeric(18,4) NOT NULL,
  benchmark_median_price numeric(18,4) NOT NULL,
  proposed_customer_price numeric(18,4) NOT NULL,
  max_market_premium_pct numeric(7,4) NOT NULL DEFAULT 0,
  expected_contribution numeric(18,4) NOT NULL,
  minimum_contribution numeric(18,4) NOT NULL,
  evidence_refs jsonb NOT NULL,
  observed_at timestamptz NOT NULL,
  decision text NOT NULL,
  reason text NOT NULL,
  reviewed_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  reviewed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplier_pilot_market_viability_market_check CHECK (market_code='GB' AND currency='GBP'),
  CONSTRAINT supplier_pilot_market_viability_sample_check CHECK (benchmark_sample_count>=3),
  CONSTRAINT supplier_pilot_market_viability_prices_check CHECK (
    benchmark_low_price>0 AND benchmark_median_price>0 AND proposed_customer_price>0
    AND benchmark_low_price<=benchmark_median_price
  ),
  CONSTRAINT supplier_pilot_market_viability_premium_check CHECK (max_market_premium_pct BETWEEN 0 AND 50),
  CONSTRAINT supplier_pilot_market_viability_margin_check CHECK (
    expected_contribution>=minimum_contribution
  ),
  CONSTRAINT supplier_pilot_market_viability_evidence_check CHECK (
    jsonb_typeof(evidence_refs)='array' AND jsonb_array_length(evidence_refs)>=3
  ),
  CONSTRAINT supplier_pilot_market_viability_decision_check CHECK (decision IN ('approved','rejected')),
  CONSTRAINT supplier_pilot_market_viability_reason_check CHECK (NULLIF(BTRIM(reason),'') IS NOT NULL),
  UNIQUE(pilot_id,pilot_offer_id)
);

REVOKE ALL ON TABLE private.supplier_pilot_market_viability FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION private.guard_supplier_pilot_market_viability_v1()
RETURNS trigger LANGUAGE plpgsql SET search_path TO '' AS $$
BEGIN
  RAISE EXCEPTION 'controlled pilot market viability evidence is immutable; record a new pilot instead';
END;
$$;
DROP TRIGGER IF EXISTS trg_supplier_pilot_market_viability_immutable_v1 ON private.supplier_pilot_market_viability;
CREATE TRIGGER trg_supplier_pilot_market_viability_immutable_v1
BEFORE UPDATE OR DELETE ON private.supplier_pilot_market_viability
FOR EACH ROW EXECUTE FUNCTION private.guard_supplier_pilot_market_viability_v1();

CREATE OR REPLACE FUNCTION public.server_admin_record_supplier_pilot_market_viability_v1(
  p_actor_id uuid,
  p_pilot_id uuid,
  p_pilot_offer_id uuid,
  p_pricing_snapshot_id uuid,
  p_benchmark_sample_count integer,
  p_benchmark_low_price numeric,
  p_benchmark_median_price numeric,
  p_proposed_customer_price numeric,
  p_max_market_premium_pct numeric,
  p_evidence_refs jsonb,
  p_observed_at timestamptz,
  p_decision text,
  p_reason text
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE
  v_id uuid;
  v_pilot private.supplier_pilot_programs%ROWTYPE;
  v_po private.supplier_pilot_offers%ROWTYPE;
  v_offer private.supplier_offers%ROWTYPE;
  v_price private.supplier_pricing_snapshots%ROWTYPE;
  v_allowed_price numeric(18,4);
BEGIN
  PERFORM private.require_active_admin_v1(p_actor_id);
  SELECT * INTO v_pilot FROM private.supplier_pilot_programs WHERE id=p_pilot_id;
  IF NOT FOUND OR v_pilot.status NOT IN ('draft','preparing') THEN
    RAISE EXCEPTION 'market viability can only be recorded before pilot activation';
  END IF;

  SELECT * INTO v_po FROM private.supplier_pilot_offers WHERE id=p_pilot_offer_id AND pilot_id=p_pilot_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'pilot offer is not part of this pilot'; END IF;
  SELECT * INTO v_offer FROM private.supplier_offers WHERE id=v_po.supplier_offer_id;
  SELECT * INTO v_price FROM private.supplier_pricing_snapshots
   WHERE id=p_pricing_snapshot_id
     AND supplier_offer_id=v_po.supplier_offer_id
     AND canonical_product_id=v_offer.canonical_product_id
     AND currency='GBP' AND status='approved'
     AND valid_from<=now() AND (valid_to IS NULL OR valid_to>now());
  IF NOT FOUND THEN RAISE EXCEPTION 'current approved GBP pricing snapshot is required'; END IF;

  IF p_observed_at>now() OR p_observed_at<now()-interval '14 days' THEN
    RAISE EXCEPTION 'market benchmark evidence must be current within 14 days';
  END IF;
  IF p_proposed_customer_price<>v_price.gross_customer_price THEN
    RAISE EXCEPTION 'proposed customer price must match approved pricing snapshot';
  END IF;
  IF v_price.expected_contribution<v_price.minimum_contribution THEN
    RAISE EXCEPTION 'approved pricing snapshot fails contribution guard';
  END IF;

  v_allowed_price:=round(p_benchmark_median_price*(1+(p_max_market_premium_pct/100.0)),4);
  IF lower(BTRIM(p_decision))='approved' AND p_proposed_customer_price>v_allowed_price THEN
    RAISE EXCEPTION 'market viability cannot be approved above the reviewed market premium ceiling';
  END IF;

  INSERT INTO private.supplier_pilot_market_viability(
    pilot_id,pilot_offer_id,pricing_snapshot_id,benchmark_sample_count,benchmark_low_price,
    benchmark_median_price,proposed_customer_price,max_market_premium_pct,
    expected_contribution,minimum_contribution,evidence_refs,observed_at,decision,reason,reviewed_by
  ) VALUES (
    p_pilot_id,p_pilot_offer_id,p_pricing_snapshot_id,p_benchmark_sample_count,p_benchmark_low_price,
    p_benchmark_median_price,p_proposed_customer_price,p_max_market_premium_pct,
    v_price.expected_contribution,v_price.minimum_contribution,p_evidence_refs,p_observed_at,
    lower(BTRIM(p_decision)),BTRIM(p_reason),p_actor_id
  ) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.server_admin_record_supplier_pilot_market_viability_v1(uuid,uuid,uuid,uuid,integer,numeric,numeric,numeric,numeric,jsonb,timestamptz,text,text)
FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.server_admin_record_supplier_pilot_market_viability_v1(uuid,uuid,uuid,uuid,integer,numeric,numeric,numeric,numeric,jsonb,timestamptz,text,text)
TO service_role;

CREATE OR REPLACE FUNCTION public.server_supplier_pilot_market_viability_readiness_v1(p_pilot_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE
  v_offer_count integer:=0;
  v_approved_count integer:=0;
  v_failures jsonb:='[]'::jsonb;
  v_row record;
BEGIN
  SELECT count(*)::integer INTO v_offer_count FROM private.supplier_pilot_offers WHERE pilot_id=p_pilot_id;
  FOR v_row IN
    SELECT po.id AS pilot_offer_id,o.offer_key,mv.id AS viability_id,mv.decision,mv.observed_at,
           mv.proposed_customer_price,mv.benchmark_median_price,mv.max_market_premium_pct,
           mv.expected_contribution,mv.minimum_contribution,mv.benchmark_sample_count
      FROM private.supplier_pilot_offers po
      JOIN private.supplier_offers o ON o.id=po.supplier_offer_id
      LEFT JOIN private.supplier_pilot_market_viability mv ON mv.pilot_offer_id=po.id AND mv.pilot_id=po.pilot_id
     WHERE po.pilot_id=p_pilot_id
  LOOP
    IF v_row.viability_id IS NULL THEN
      v_failures:=v_failures||jsonb_build_array(jsonb_build_object('check','market_viability','offer',v_row.offer_key,'reason','market_viability_evidence_missing'));
    ELSIF v_row.decision<>'approved' THEN
      v_failures:=v_failures||jsonb_build_array(jsonb_build_object('check','market_viability','offer',v_row.offer_key,'reason','market_viability_rejected'));
    ELSIF v_row.observed_at<now()-interval '14 days' THEN
      v_failures:=v_failures||jsonb_build_array(jsonb_build_object('check','market_viability','offer',v_row.offer_key,'reason','market_benchmark_stale'));
    ELSIF v_row.expected_contribution<v_row.minimum_contribution THEN
      v_failures:=v_failures||jsonb_build_array(jsonb_build_object('check','market_viability','offer',v_row.offer_key,'reason','profitability_guard_failed'));
    ELSIF v_row.proposed_customer_price>round(v_row.benchmark_median_price*(1+(v_row.max_market_premium_pct/100.0)),4) THEN
      v_failures:=v_failures||jsonb_build_array(jsonb_build_object('check','market_viability','offer',v_row.offer_key,'reason','market_price_ceiling_failed'));
    ELSE
      v_approved_count:=v_approved_count+1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'ready',v_offer_count>0 AND v_approved_count=v_offer_count AND jsonb_array_length(v_failures)=0,
    'reason',CASE WHEN v_offer_count>0 AND v_approved_count=v_offer_count AND jsonb_array_length(v_failures)=0
      THEN 'pilot_market_viability_ready' ELSE 'pilot_market_viability_not_ready' END,
    'pilotId',p_pilot_id,'offerCount',v_offer_count,'approvedOfferCount',v_approved_count,
    'failures',v_failures,'interfaceVersion',1
  );
END;
$$;
REVOKE ALL ON FUNCTION public.server_supplier_pilot_market_viability_readiness_v1(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.server_supplier_pilot_market_viability_readiness_v1(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.server_supplier_pilot_activation_readiness_v1(p_pilot_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE
  v_pilot private.supplier_pilot_programs%ROWTYPE;
  v_core jsonb;
  v_market jsonb;
  v_control private.supplier_commerce_controls%ROWTYPE;
  v_cohort_count integer:=0;
  v_other_global_enabled integer:=0;
  v_failures jsonb:='[]'::jsonb;
BEGIN
  SELECT * INTO v_pilot FROM private.supplier_pilot_programs WHERE id=p_pilot_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ready',false,'reason','pilot_not_found','interfaceVersion',2); END IF;

  v_core:=public.server_supplier_pilot_readiness_v1(p_pilot_id);
  IF COALESCE((v_core->>'ready')::boolean,false) IS DISTINCT FROM true THEN
    v_failures:=v_failures||jsonb_build_array(jsonb_build_object('check','core_readiness','detail',v_core));
  END IF;

  v_market:=public.server_supplier_pilot_market_viability_readiness_v1(p_pilot_id);
  IF COALESCE((v_market->>'ready')::boolean,false) IS DISTINCT FROM true THEN
    v_failures:=v_failures||jsonb_build_array(jsonb_build_object('check','market_viability','detail',v_market));
  END IF;

  IF NOT EXISTS(
    SELECT 1 FROM private.supplier_simulator_validation_runs r
     WHERE r.status='passed' AND v_pilot.simulator_evidence_ref IN (r.id::text,r.run_key)
  ) THEN
    v_failures:=v_failures||jsonb_build_array(jsonb_build_object('check','real_simulator_evidence','reason','passed_phase_n_simulator_run_not_found','simulatorEvidenceRef',v_pilot.simulator_evidence_ref));
  END IF;

  SELECT count(*)::integer INTO v_cohort_count FROM private.supplier_pilot_cohort_members m WHERE m.pilot_id=v_pilot.id;
  IF v_cohort_count=0 THEN
    v_failures:=v_failures||jsonb_build_array(jsonb_build_object('check','pilot_cohort','reason','explicit_buyer_cohort_missing'));
  END IF;

  SELECT * INTO v_control FROM private.supplier_commerce_controls WHERE operation='pilot' AND scope_type='global' AND scope_ref IS NULL LIMIT 1;
  IF NOT FOUND OR v_control.enabled IS DISTINCT FROM true THEN
    v_failures:=v_failures||jsonb_build_array(jsonb_build_object('check','pilot_master_control','reason','pilot_master_disabled'));
  END IF;

  SELECT count(*)::integer INTO v_other_global_enabled FROM private.supplier_commerce_controls c
   WHERE c.scope_type='global' AND c.scope_ref IS NULL AND c.operation<>'pilot' AND c.enabled=true;
  IF v_other_global_enabled>0 THEN
    v_failures:=v_failures||jsonb_build_array(jsonb_build_object('check','global_activation_guard','reason','non_pilot_global_supplier_commerce_control_enabled','enabledCount',v_other_global_enabled));
  END IF;

  RETURN jsonb_build_object(
    'ready',jsonb_array_length(v_failures)=0,
    'reason',CASE WHEN jsonb_array_length(v_failures)=0 THEN 'controlled_pilot_activation_ready' ELSE 'controlled_pilot_activation_not_ready' END,
    'pilotId',v_pilot.id,'cohortMemberCount',v_cohort_count,'coreReadiness',v_core,'marketViability',v_market,
    'failures',v_failures,'simulatorPassIsNotPilotPass',true,'interfaceVersion',2
  );
END;
$$;
REVOKE ALL ON FUNCTION public.server_supplier_pilot_activation_readiness_v1(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.server_supplier_pilot_activation_readiness_v1(uuid) TO service_role;

COMMENT ON TABLE private.supplier_pilot_market_viability IS
  'Immutable Phase O evidence that each pilot offer is profitable under approved economics and competitively priced against current UK market evidence.';
