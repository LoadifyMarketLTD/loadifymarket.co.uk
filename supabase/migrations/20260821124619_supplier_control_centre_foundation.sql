-- 654_supplier_control_centre_foundation.sql
-- Phase M — Supplier Control Centre + Security + Risk/SLA Governance + Kill Switch + Incident Visibility.
-- This migration adds governance truth only. It does not enable Supplier Commerce.

CREATE SCHEMA IF NOT EXISTS private;

CREATE TABLE IF NOT EXISTS private.supplier_risk_policy_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version integer NOT NULL UNIQUE CHECK (version > 0),
  status text NOT NULL DEFAULT 'draft',
  effective_from timestamptz NOT NULL,
  effective_to timestamptz,
  amber_score integer NOT NULL CHECK (amber_score BETWEEN 1 AND 99),
  red_score integer NOT NULL CHECK (red_score BETWEEN 2 AND 100),
  max_open_high_incidents integer NOT NULL DEFAULT 1 CHECK (max_open_high_incidents >= 0),
  max_open_critical_incidents integer NOT NULL DEFAULT 0 CHECK (max_open_critical_incidents >= 0),
  max_sla_breaches_30d integer NOT NULL DEFAULT 3 CHECK (max_sla_breaches_30d >= 0),
  stale_security_hours integer NOT NULL DEFAULT 24 CHECK (stale_security_hours > 0),
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  approved_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  CONSTRAINT supplier_risk_policy_status_check CHECK (status IN ('draft','active','superseded','retired')),
  CONSTRAINT supplier_risk_policy_threshold_check CHECK (red_score > amber_score),
  CONSTRAINT supplier_risk_policy_dates_check CHECK (effective_to IS NULL OR effective_to > effective_from),
  CONSTRAINT supplier_risk_policy_evidence_check CHECK (jsonb_typeof(evidence)='object'),
  CONSTRAINT supplier_risk_policy_active_approval_check CHECK (status <> 'active' OR (approved_by IS NOT NULL AND approved_at IS NOT NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS supplier_risk_policy_one_active_unique
  ON private.supplier_risk_policy_versions((1)) WHERE status='active';

CREATE TABLE IF NOT EXISTS private.supplier_security_posture (
  supplier_id uuid PRIMARY KEY REFERENCES private.supplier_foundation_suppliers(id) ON DELETE RESTRICT,
  state text NOT NULL DEFAULT 'unknown',
  adapter_auth_state text NOT NULL DEFAULT 'unknown',
  secret_storage_state text NOT NULL DEFAULT 'unknown',
  credential_rotation_state text NOT NULL DEFAULT 'unknown',
  webhook_verification_state text NOT NULL DEFAULT 'unknown',
  least_privilege_state text NOT NULL DEFAULT 'unknown',
  config_integrity_state text NOT NULL DEFAULT 'unknown',
  last_verified_at timestamptz,
  reverify_due_at timestamptz,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplier_security_state_check CHECK (state IN ('unknown','green','amber','red','blocked')),
  CONSTRAINT supplier_security_component_check CHECK (
    adapter_auth_state IN ('unknown','pass','warn','fail') AND
    secret_storage_state IN ('unknown','pass','warn','fail') AND
    credential_rotation_state IN ('unknown','pass','warn','fail') AND
    webhook_verification_state IN ('unknown','pass','warn','fail','not_applicable') AND
    least_privilege_state IN ('unknown','pass','warn','fail') AND
    config_integrity_state IN ('unknown','pass','warn','fail')
  ),
  CONSTRAINT supplier_security_evidence_check CHECK (jsonb_typeof(evidence)='object'),
  CONSTRAINT supplier_security_verified_check CHECK (
    state='unknown' OR (last_verified_at IS NOT NULL AND reverify_due_at IS NOT NULL AND reverify_due_at > last_verified_at)
  )
);

CREATE TABLE IF NOT EXISTS private.supplier_security_posture_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES private.supplier_foundation_suppliers(id) ON DELETE RESTRICT,
  actor_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  previous_state text,
  new_state text NOT NULL,
  previous_version integer,
  new_version integer NOT NULL,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplier_security_audit_evidence_check CHECK (jsonb_typeof(evidence)='object')
);
CREATE INDEX IF NOT EXISTS supplier_security_posture_audit_idx
  ON private.supplier_security_posture_audit(supplier_id, created_at DESC);

CREATE TABLE IF NOT EXISTS private.supplier_sla_breach_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  breach_key text NOT NULL UNIQUE,
  supplier_id uuid NOT NULL REFERENCES private.supplier_foundation_suppliers(id) ON DELETE RESTRICT,
  sla_version_id uuid NOT NULL REFERENCES private.supplier_sla_versions(id) ON DELETE RESTRICT,
  order_id uuid REFERENCES public.orders(id) ON DELETE RESTRICT,
  fulfilment_leg_id uuid REFERENCES private.supplier_fulfilment_legs(id) ON DELETE RESTRICT,
  breach_type text NOT NULL,
  severity text NOT NULL,
  state text NOT NULL DEFAULT 'open',
  threshold_value numeric,
  observed_value numeric,
  occurred_at timestamptz NOT NULL,
  customer_impact text,
  financial_impact text,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  resolution text,
  resolved_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplier_sla_breach_type_check CHECK (breach_type IN (
    'acknowledgement','dispatch','stock_freshness','price_freshness','tracking_deadline','refund_response','reimbursement_deadline','defect','stock_accuracy','cancellation'
  )),
  CONSTRAINT supplier_sla_breach_severity_check CHECK (severity IN ('low','medium','high','critical')),
  CONSTRAINT supplier_sla_breach_state_check CHECK (state IN ('open','acknowledged','mitigating','resolved','waived')),
  CONSTRAINT supplier_sla_breach_evidence_check CHECK (jsonb_typeof(evidence)='object'),
  CONSTRAINT supplier_sla_breach_resolved_check CHECK ((state IN ('resolved','waived') AND resolved_at IS NOT NULL) OR state NOT IN ('resolved','waived'))
);
CREATE INDEX IF NOT EXISTS supplier_sla_breach_open_idx
  ON private.supplier_sla_breach_events(supplier_id, severity, occurred_at DESC)
  WHERE state NOT IN ('resolved','waived');

CREATE TABLE IF NOT EXISTS private.supplier_risk_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_key text NOT NULL UNIQUE,
  supplier_id uuid NOT NULL REFERENCES private.supplier_foundation_suppliers(id) ON DELETE RESTRICT,
  policy_version_id uuid NOT NULL REFERENCES private.supplier_risk_policy_versions(id) ON DELETE RESTRICT,
  score integer NOT NULL CHECK (score BETWEEN 0 AND 100),
  risk_class text NOT NULL,
  recommended_action text NOT NULL,
  inputs jsonb NOT NULL,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  assessed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplier_risk_assessment_class_check CHECK (risk_class IN ('green','amber','red')),
  CONSTRAINT supplier_risk_assessment_action_check CHECK (recommended_action IN ('monitor','review','restrict','suspend','kill_switch')),
  CONSTRAINT supplier_risk_assessment_inputs_check CHECK (jsonb_typeof(inputs)='object'),
  CONSTRAINT supplier_risk_assessment_evidence_check CHECK (jsonb_typeof(evidence)='object')
);
CREATE INDEX IF NOT EXISTS supplier_risk_assessment_latest_idx
  ON private.supplier_risk_assessments(supplier_id, assessed_at DESC);

CREATE TABLE IF NOT EXISTS private.supplier_control_centre_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_key text NOT NULL UNIQUE,
  actor_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  supplier_id uuid REFERENCES private.supplier_foundation_suppliers(id) ON DELETE RESTRICT,
  provider_ref text,
  action_type text NOT NULL,
  reason text NOT NULL,
  incident_id uuid REFERENCES private.supplier_commerce_incidents(id) ON DELETE SET NULL,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplier_control_centre_action_type_check CHECK (action_type IN (
    'security_posture_update','risk_policy_activate','risk_assessment','sla_breach_recorded','sla_breach_transition',
    'supplier_kill_switch','provider_kill_switch','incident_transition','manual_review'
  )),
  CONSTRAINT supplier_control_centre_action_reason_check CHECK (NULLIF(BTRIM(reason),'') IS NOT NULL),
  CONSTRAINT supplier_control_centre_action_evidence_check CHECK (jsonb_typeof(evidence)='object')
);
CREATE INDEX IF NOT EXISTS supplier_control_centre_actions_idx
  ON private.supplier_control_centre_actions(supplier_id, created_at DESC);

REVOKE ALL ON TABLE private.supplier_risk_policy_versions FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE private.supplier_security_posture FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE private.supplier_security_posture_audit FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE private.supplier_sla_breach_events FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE private.supplier_risk_assessments FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE private.supplier_control_centre_actions FROM PUBLIC, anon, authenticated, service_role;

COMMENT ON TABLE private.supplier_security_posture IS 'Phase M security posture stores governance state and evidence only; raw credentials/secrets are forbidden.';
COMMENT ON TABLE private.supplier_risk_assessments IS 'Append-only policy-version-bound Supplier Commerce risk assessment truth.';
COMMENT ON TABLE private.supplier_sla_breach_events IS 'Canonical supplier SLA breach evidence. Phase P may aggregate performance but must not rewrite these events.';;
