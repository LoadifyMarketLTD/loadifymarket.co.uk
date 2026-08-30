CREATE SCHEMA IF NOT EXISTS private;

CREATE TABLE IF NOT EXISTS private.supplier_simulator_validation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_key text NOT NULL UNIQUE,
  simulator_version text NOT NULL,
  contract_version integer NOT NULL DEFAULT 1 CHECK (contract_version > 0),
  environment text NOT NULL DEFAULT 'simulator',
  status text NOT NULL DEFAULT 'running',
  required_checks text[] NOT NULL DEFAULT ARRAY[
    'stock_zero','price_change','timeout','provider_500','duplicate_acknowledgement',
    'lost_response_after_accept','partial_fulfilment','tracking_replay','lost_shipment',
    'cancellation','return','refund','reimbursement','kill_switch','idempotency_collision'
  ]::text[],
  started_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT supplier_simulator_environment_check CHECK (environment='simulator'),
  CONSTRAINT supplier_simulator_run_status_check CHECK (status IN ('running','passed','failed')),
  CONSTRAINT supplier_simulator_summary_check CHECK (jsonb_typeof(summary)='object'),
  CONSTRAINT supplier_simulator_finished_check CHECK ((status='running' AND finished_at IS NULL) OR (status IN ('passed','failed') AND finished_at IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS private.supplier_simulator_validation_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES private.supplier_simulator_validation_runs(id) ON DELETE RESTRICT,
  check_key text NOT NULL,
  status text NOT NULL,
  attempt integer NOT NULL DEFAULT 1 CHECK (attempt > 0),
  idempotency_key text,
  canonical_fingerprint text,
  observed_fingerprint text,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplier_simulator_check_status_check CHECK (status IN ('pass','fail','blocked')),
  CONSTRAINT supplier_simulator_check_key_check CHECK (check_key IN (
    'stock_available','stock_zero','price_change','timeout','provider_500','duplicate_acknowledgement',
    'lost_response_after_accept','partial_fulfilment','tracking','tracking_replay','dispatch','delivery',
    'lost_shipment','cancellation','return','refund','reimbursement','kill_switch','idempotency_collision'
  )),
  CONSTRAINT supplier_simulator_check_evidence_check CHECK (jsonb_typeof(evidence)='object')
);
CREATE UNIQUE INDEX IF NOT EXISTS supplier_simulator_check_attempt_unique ON private.supplier_simulator_validation_checks(run_id,check_key,attempt);
CREATE INDEX IF NOT EXISTS supplier_simulator_check_run_idx ON private.supplier_simulator_validation_checks(run_id,created_at);

CREATE TABLE IF NOT EXISTS private.supplier_replay_validation_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES private.supplier_simulator_validation_runs(id) ON DELETE RESTRICT,
  replay_class text NOT NULL,
  idempotency_key text NOT NULL,
  first_fingerprint text NOT NULL,
  replay_fingerprint text NOT NULL,
  result text NOT NULL,
  source_operation text NOT NULL,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplier_replay_class_check CHECK (replay_class IN ('supplier_submit','acknowledgement','tracking','refund','supplier_recovery','webhook','sync','reconciliation')),
  CONSTRAINT supplier_replay_result_check CHECK (result IN ('exact_replay','recovered','blocked_collision','blocked_by_control','failed')),
  CONSTRAINT supplier_replay_evidence_check CHECK (jsonb_typeof(evidence)='object')
);
CREATE INDEX IF NOT EXISTS supplier_replay_validation_run_idx ON private.supplier_replay_validation_evidence(run_id,replay_class,created_at);

REVOKE ALL ON TABLE private.supplier_simulator_validation_runs FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE private.supplier_simulator_validation_checks FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE private.supplier_replay_validation_evidence FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.server_admin_start_supplier_simulator_run_v1(p_actor_id uuid,p_run_key text,p_simulator_version text,p_summary jsonb DEFAULT '{}'::jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE v_id uuid;
BEGIN
  PERFORM private.require_active_admin_v1(p_actor_id);
  IF NULLIF(BTRIM(p_run_key),'') IS NULL OR NULLIF(BTRIM(p_simulator_version),'') IS NULL OR jsonb_typeof(COALESCE(p_summary,'{}'::jsonb))<>'object' THEN
    RAISE EXCEPTION 'complete simulator run identity is required';
  END IF;
  INSERT INTO private.supplier_simulator_validation_runs(run_key,simulator_version,started_by,summary)
  VALUES(BTRIM(p_run_key),BTRIM(p_simulator_version),p_actor_id,COALESCE(p_summary,'{}'::jsonb)) RETURNING id INTO v_id;
  RETURN v_id;
END; $$;
REVOKE ALL ON FUNCTION public.server_admin_start_supplier_simulator_run_v1(uuid,text,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_admin_start_supplier_simulator_run_v1(uuid,text,text,jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.server_record_supplier_simulator_check_v1(p_run_id uuid,p_check_key text,p_status text,p_attempt integer,p_idempotency_key text,p_canonical_fingerprint text,p_observed_fingerprint text,p_evidence jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM private.supplier_simulator_validation_runs r WHERE r.id=p_run_id AND r.status='running') THEN RAISE EXCEPTION 'simulator run must exist and be running'; END IF;
  INSERT INTO private.supplier_simulator_validation_checks(run_id,check_key,status,attempt,idempotency_key,canonical_fingerprint,observed_fingerprint,evidence)
  VALUES(p_run_id,lower(BTRIM(p_check_key)),lower(BTRIM(p_status)),COALESCE(p_attempt,1),NULLIF(BTRIM(p_idempotency_key),''),NULLIF(BTRIM(p_canonical_fingerprint),''),NULLIF(BTRIM(p_observed_fingerprint),''),COALESCE(p_evidence,'{}'::jsonb)) RETURNING id INTO v_id;
  RETURN v_id;
END; $$;
REVOKE ALL ON FUNCTION public.server_record_supplier_simulator_check_v1(uuid,text,text,integer,text,text,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_record_supplier_simulator_check_v1(uuid,text,text,integer,text,text,text,jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.server_record_supplier_replay_validation_v1(p_run_id uuid,p_replay_class text,p_idempotency_key text,p_first_fingerprint text,p_replay_fingerprint text,p_result text,p_source_operation text,p_evidence jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM private.supplier_simulator_validation_runs r WHERE r.id=p_run_id AND r.status='running') THEN RAISE EXCEPTION 'simulator run must exist and be running'; END IF;
  IF NULLIF(BTRIM(p_idempotency_key),'') IS NULL OR NULLIF(BTRIM(p_first_fingerprint),'') IS NULL OR NULLIF(BTRIM(p_replay_fingerprint),'') IS NULL OR NULLIF(BTRIM(p_source_operation),'') IS NULL THEN RAISE EXCEPTION 'complete replay evidence is required'; END IF;
  INSERT INTO private.supplier_replay_validation_evidence(run_id,replay_class,idempotency_key,first_fingerprint,replay_fingerprint,result,source_operation,evidence)
  VALUES(p_run_id,lower(BTRIM(p_replay_class)),BTRIM(p_idempotency_key),BTRIM(p_first_fingerprint),BTRIM(p_replay_fingerprint),lower(BTRIM(p_result)),BTRIM(p_source_operation),COALESCE(p_evidence,'{}'::jsonb)) RETURNING id INTO v_id;
  RETURN v_id;
END; $$;
REVOKE ALL ON FUNCTION public.server_record_supplier_replay_validation_v1(uuid,text,text,text,text,text,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_record_supplier_replay_validation_v1(uuid,text,text,text,text,text,text,jsonb) TO service_role;

COMMENT ON TABLE private.supplier_simulator_validation_runs IS 'Phase N simulator-only validation evidence. Simulator PASS is not Pilot PASS.';
COMMENT ON TABLE private.supplier_replay_validation_evidence IS 'Phase N recovery/replay proof. This records validation evidence and never rewrites canonical commerce history.';;
