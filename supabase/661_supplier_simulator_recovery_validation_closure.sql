-- 661_supplier_simulator_recovery_validation_closure.sql
-- Phase N Branch Guard closure: simulator evidence is append-only and PASS cannot be
-- declared until every required recovery/replay scenario has explicit passing evidence.

CREATE OR REPLACE FUNCTION private.guard_supplier_simulator_history_immutable_v1()
RETURNS trigger LANGUAGE plpgsql SET search_path TO '' AS $$
BEGIN
  RAISE EXCEPTION 'supplier simulator validation history is append-only';
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_supplier_simulator_checks_immutable_v1 ON private.supplier_simulator_validation_checks;
CREATE TRIGGER trg_guard_supplier_simulator_checks_immutable_v1 BEFORE UPDATE OR DELETE ON private.supplier_simulator_validation_checks
FOR EACH ROW EXECUTE FUNCTION private.guard_supplier_simulator_history_immutable_v1();
DROP TRIGGER IF EXISTS trg_guard_supplier_replay_evidence_immutable_v1 ON private.supplier_replay_validation_evidence;
CREATE TRIGGER trg_guard_supplier_replay_evidence_immutable_v1 BEFORE UPDATE OR DELETE ON private.supplier_replay_validation_evidence
FOR EACH ROW EXECUTE FUNCTION private.guard_supplier_simulator_history_immutable_v1();

CREATE OR REPLACE FUNCTION private.guard_supplier_simulator_run_history_v1()
RETURNS trigger LANGUAGE plpgsql SET search_path TO '' AS $$
BEGIN
  IF OLD.status IN ('passed','failed') THEN
    RAISE EXCEPTION 'terminal supplier simulator run is immutable';
  END IF;
  IF OLD.environment IS DISTINCT FROM NEW.environment OR OLD.run_key IS DISTINCT FROM NEW.run_key
     OR OLD.simulator_version IS DISTINCT FROM NEW.simulator_version OR OLD.contract_version IS DISTINCT FROM NEW.contract_version
     OR OLD.required_checks IS DISTINCT FROM NEW.required_checks OR OLD.started_by IS DISTINCT FROM NEW.started_by
     OR OLD.started_at IS DISTINCT FROM NEW.started_at THEN
    RAISE EXCEPTION 'supplier simulator run identity is immutable';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_supplier_simulator_run_history_v1 ON private.supplier_simulator_validation_runs;
CREATE TRIGGER trg_guard_supplier_simulator_run_history_v1 BEFORE UPDATE OR DELETE ON private.supplier_simulator_validation_runs
FOR EACH ROW EXECUTE FUNCTION private.guard_supplier_simulator_run_history_v1();

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
    IF NOT EXISTS(
      SELECT 1 FROM private.supplier_replay_validation_evidence e
       WHERE e.run_id=p_run_id AND e.replay_class='supplier_submit' AND e.result='recovered'
    ) THEN RETURN jsonb_build_object('ok',false,'reason','lost_response_recovery_not_proven','interfaceVersion',1); END IF;
    IF NOT EXISTS(
      SELECT 1 FROM private.supplier_replay_validation_evidence e
       WHERE e.run_id=p_run_id AND e.result='blocked_collision'
    ) THEN RETURN jsonb_build_object('ok',false,'reason','idempotency_collision_block_not_proven','interfaceVersion',1); END IF;
    IF NOT EXISTS(
      SELECT 1 FROM private.supplier_replay_validation_evidence e
       WHERE e.run_id=p_run_id AND e.replay_class IN ('acknowledgement','tracking','refund','supplier_recovery') AND e.result='exact_replay'
       GROUP BY e.run_id HAVING count(DISTINCT e.replay_class)=4
    ) THEN RETURN jsonb_build_object('ok',false,'reason','canonical_replay_classes_not_proven','interfaceVersion',1); END IF;
  END IF;

  UPDATE private.supplier_simulator_validation_runs SET
    status=v_status,finished_at=now(),summary=COALESCE(p_summary,'{}'::jsonb)
  WHERE id=p_run_id RETURNING * INTO v_run;

  RETURN jsonb_build_object('ok',true,'runId',v_run.id,'status',v_run.status,'simulatorVersion',v_run.simulator_version,'interfaceVersion',1);
END;
$$;
REVOKE ALL ON FUNCTION public.server_admin_complete_supplier_simulator_run_v1(uuid,uuid,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_admin_complete_supplier_simulator_run_v1(uuid,uuid,text,jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.server_admin_supplier_simulator_status_v1(p_actor_id uuid,p_run_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
BEGIN
  PERFORM private.require_active_admin_v1(p_actor_id);
  RETURN jsonb_build_object(
    'runs',(SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY r.started_at DESC),'[]'::jsonb) FROM (
      SELECT r.* FROM private.supplier_simulator_validation_runs r WHERE p_run_id IS NULL OR r.id=p_run_id ORDER BY r.started_at DESC LIMIT 25
    ) r),
    'checks',(SELECT COALESCE(jsonb_agg(to_jsonb(c) ORDER BY c.created_at),'[]'::jsonb) FROM private.supplier_simulator_validation_checks c WHERE p_run_id IS NOT NULL AND c.run_id=p_run_id),
    'replayEvidence',(SELECT COALESCE(jsonb_agg(to_jsonb(e) ORDER BY e.created_at),'[]'::jsonb) FROM private.supplier_replay_validation_evidence e WHERE p_run_id IS NOT NULL AND e.run_id=p_run_id),
    'simulatorPassIsNotPilotPass',true,
    'interfaceVersion',1
  );
END;
$$;
REVOKE ALL ON FUNCTION public.server_admin_supplier_simulator_status_v1(uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_admin_supplier_simulator_status_v1(uuid,uuid) TO service_role;

COMMENT ON FUNCTION public.server_admin_complete_supplier_simulator_run_v1(uuid,uuid,text,jsonb) IS 'Phase N fail-closed completion gate. PASS requires the full canonical simulator scenario set plus lost-response recovery, collision blocking and acknowledgement/tracking/refund/recovery replay proof.';
