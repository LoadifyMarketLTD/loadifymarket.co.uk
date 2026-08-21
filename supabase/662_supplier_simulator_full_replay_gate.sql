-- 662_supplier_simulator_full_replay_gate.sql
-- Phase N Branch Guard closure: no fake PASS. Require every canonical simulator scenario
-- and the complete replay/reprocessing classes from the disaster-recovery contract.

ALTER TABLE private.supplier_simulator_validation_runs
  ALTER COLUMN required_checks SET DEFAULT ARRAY[
    'stock_available','stock_zero','price_change','timeout','provider_500','duplicate_acknowledgement',
    'lost_response_after_accept','partial_fulfilment','tracking','tracking_replay','dispatch','delivery',
    'lost_shipment','cancellation','return','refund','reimbursement','kill_switch','idempotency_collision'
  ]::text[];

ALTER TABLE private.supplier_replay_validation_evidence
  DROP CONSTRAINT IF EXISTS supplier_replay_class_check;
ALTER TABLE private.supplier_replay_validation_evidence
  ADD CONSTRAINT supplier_replay_class_check CHECK (replay_class IN (
    'supplier_submit','acknowledgement','tracking','refund','supplier_recovery',
    'event','webhook','failed_job','sync','reconciliation','derived_state'
  ));

CREATE OR REPLACE FUNCTION public.server_admin_complete_supplier_simulator_run_v1(
  p_actor_id uuid,p_run_id uuid,p_status text,p_summary jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE
  v_run private.supplier_simulator_validation_runs%ROWTYPE;
  v_status text:=lower(BTRIM(COALESCE(p_status,'')));
  v_missing text[]:='{}';
  v_required text;
BEGIN
  PERFORM private.require_active_admin_v1(p_actor_id);
  IF v_status NOT IN ('passed','failed') OR jsonb_typeof(COALESCE(p_summary,'{}'::jsonb))<>'object' THEN
    RAISE EXCEPTION 'terminal simulator status and summary are required';
  END IF;
  SELECT * INTO v_run FROM private.supplier_simulator_validation_runs WHERE id=p_run_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'reason','simulator_run_not_found','interfaceVersion',1); END IF;
  IF v_run.status<>'running' THEN RAISE EXCEPTION 'simulator run is already terminal'; END IF;

  IF v_status='passed' THEN
    FOREACH v_required IN ARRAY v_run.required_checks LOOP
      IF NOT EXISTS(
        SELECT 1 FROM private.supplier_simulator_validation_checks c
         WHERE c.run_id=p_run_id AND c.check_key=v_required AND c.status='pass'
      ) THEN v_missing:=array_append(v_missing,v_required); END IF;
    END LOOP;
    IF cardinality(v_missing)>0 THEN
      RETURN jsonb_build_object('ok',false,'reason','required_simulator_checks_missing','missingChecks',to_jsonb(v_missing),'interfaceVersion',1);
    END IF;
    IF EXISTS(SELECT 1 FROM private.supplier_simulator_validation_checks c WHERE c.run_id=p_run_id AND c.status='fail') THEN
      RETURN jsonb_build_object('ok',false,'reason','simulator_failure_evidence_present','interfaceVersion',1);
    END IF;

    -- Accepted-but-response-lost must be recovered by query-before-retry under the same submit idempotency key.
    IF NOT EXISTS(
      SELECT 1 FROM private.supplier_replay_validation_evidence e
       WHERE e.run_id=p_run_id AND e.replay_class='supplier_submit' AND e.result='recovered'
         AND e.first_fingerprint=e.replay_fingerprint
    ) THEN RETURN jsonb_build_object('ok',false,'reason','lost_response_recovery_not_proven','interfaceVersion',1); END IF;

    -- Changed canonical evidence under the same key must be blocked, never laundered as an exact replay.
    IF NOT EXISTS(
      SELECT 1 FROM private.supplier_replay_validation_evidence e
       WHERE e.run_id=p_run_id AND e.result='blocked_collision' AND e.first_fingerprint<>e.replay_fingerprint
    ) THEN RETURN jsonb_build_object('ok',false,'reason','idempotency_collision_block_not_proven','interfaceVersion',1); END IF;

    -- Canonical event families must prove exact replay.
    IF NOT EXISTS(
      SELECT 1 FROM private.supplier_replay_validation_evidence e
       WHERE e.run_id=p_run_id
         AND e.replay_class IN ('acknowledgement','tracking','refund','supplier_recovery','event','webhook','sync','reconciliation')
         AND e.result='exact_replay' AND e.first_fingerprint=e.replay_fingerprint
       GROUP BY e.run_id HAVING count(DISTINCT e.replay_class)=8
    ) THEN RETURN jsonb_build_object('ok',false,'reason','canonical_replay_classes_not_proven','interfaceVersion',1); END IF;

    -- Failed jobs must prove deterministic recovery/reprocessing and derived state must be rebuildable from canonical truth.
    IF NOT EXISTS(
      SELECT 1 FROM private.supplier_replay_validation_evidence e
       WHERE e.run_id=p_run_id AND e.replay_class='failed_job' AND e.result='recovered'
    ) THEN RETURN jsonb_build_object('ok',false,'reason','failed_job_replay_not_proven','interfaceVersion',1); END IF;
    IF NOT EXISTS(
      SELECT 1 FROM private.supplier_replay_validation_evidence e
       WHERE e.run_id=p_run_id AND e.replay_class='derived_state' AND e.result='recovered'
    ) THEN RETURN jsonb_build_object('ok',false,'reason','derived_state_rebuild_not_proven','interfaceVersion',1); END IF;
  END IF;

  UPDATE private.supplier_simulator_validation_runs SET
    status=v_status,finished_at=now(),summary=COALESCE(p_summary,'{}'::jsonb)
  WHERE id=p_run_id RETURNING * INTO v_run;

  RETURN jsonb_build_object('ok',true,'runId',v_run.id,'status',v_run.status,'simulatorVersion',v_run.simulator_version,
    'simulatorPassIsNotPilotPass',true,'backupRestorePassClaimed',false,'interfaceVersion',1);
END;
$$;
REVOKE ALL ON FUNCTION public.server_admin_complete_supplier_simulator_run_v1(uuid,uuid,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_admin_complete_supplier_simulator_run_v1(uuid,uuid,text,jsonb) TO service_role;

COMMENT ON FUNCTION public.server_admin_complete_supplier_simulator_run_v1(uuid,uuid,text,jsonb) IS 'Phase N full no-fake-pass gate: all simulator scenarios, replay/reprocessing classes, lost-response recovery, collision blocking and derived-state rebuild evidence are mandatory. This does not claim backup restore PASS or Pilot PASS.';
