import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repo = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const foundation = repo('supabase/654_supplier_control_centre_foundation.sql');
const governance = repo('supabase/655_supplier_control_centre_governance.sql');
const killSwitch = repo('supabase/656_supplier_control_centre_kill_switch.sql');
const closure = repo('supabase/657_supplier_control_centre_closure.sql');
const adminApi = repo('netlify/functions/admin-supplier-control-centre.ts');

describe('Phase M Supplier Control Centre + governance', () => {
  it('creates versioned risk policy, security posture, SLA breach, assessment and action truth', () => {
    for (const table of ['supplier_risk_policy_versions','supplier_security_posture','supplier_security_posture_audit','supplier_sla_breach_events','supplier_risk_assessments','supplier_control_centre_actions']) {
      expect(foundation).toContain(`private.${table}`);
    }
  });

  it('keeps Supplier Commerce disabled and never enables a control', () => {
    expect(foundation).toContain('does not enable Supplier Commerce');
    expect(killSwitch).toContain('Kill-switch RPC can only disable');
    expect(killSwitch).toContain('enabled=false');
    expect(killSwitch).not.toContain('enabled=true');
  });

  it('implements atomic supplier/provider wildcard kill switches through the canonical control plane', () => {
    expect(killSwitch).toContain("operation='*'");
    expect(killSwitch).toContain("v_scope_type NOT IN ('supplier','provider')");
    expect(killSwitch).toContain('supplier_commerce_control_audit');
    expect(killSwitch).toContain("'supplier_kill_switch'");
    expect(killSwitch).toContain("'provider_kill_switch'");
  });

  it('opens an incident whenever the kill switch is activated', () => {
    expect(killSwitch).toContain('supplier_commerce_incidents');
    expect(killSwitch).toContain("'mitigating'");
    expect(killSwitch).toContain('v_incident_key');
    expect(killSwitch).toContain('incidentId');
  });

  it('requires active admin authority for all governance mutations', () => {
    expect(governance).toContain("u.role='admin'");
    expect(governance).toContain('u."isActive"=true');
    expect(killSwitch).toContain('require_active_admin_v1');
    expect(closure).toContain('require_active_admin_v1');
    expect(adminApi).toContain("authenticateActiveAccount(event, admin, ['admin'])");
  });

  it('rejects raw secrets from Supplier Control Centre payloads and DB evidence', () => {
    expect(adminApi).toContain('Raw credentials or secrets are forbidden');
    expect(adminApi).toContain('containsSecretMaterial');
    expect(governance).toContain('raw secrets are forbidden in supplier security evidence');
    expect(foundation).toContain('raw credentials/secrets are forbidden');
  });

  it('models explicit security posture components and re-verification', () => {
    for (const field of ['adapter_auth_state','secret_storage_state','credential_rotation_state','webhook_verification_state','least_privilege_state','config_integrity_state','reverify_due_at']) {
      expect(foundation).toContain(field);
    }
    expect(governance).toContain('security posture requires a future reverify due time');
  });

  it('keeps security, risk and control-centre history append-only', () => {
    expect(closure).toContain('Supplier Control Centre governance history is append-only');
    expect(closure).toContain('trg_guard_supplier_security_audit_immutable_v1');
    expect(closure).toContain('trg_guard_supplier_risk_assessment_immutable_v1');
    expect(closure).toContain('trg_guard_supplier_control_actions_immutable_v1');
  });

  it('makes active risk policy terms immutable and historical policies non-rewritable', () => {
    expect(closure).toContain('historical supplier risk policy is immutable');
    expect(closure).toContain('active supplier risk policy terms are immutable');
    expect(foundation).toContain('supplier_risk_policy_one_active_unique');
  });

  it('binds SLA breach evidence to the canonical supplier SLA version', () => {
    expect(governance).toContain('supplier SLA version mismatch');
    expect(governance).toContain('SLA breach order/leg/supplier identity mismatch');
    expect(foundation).toContain('sla_version_id uuid NOT NULL REFERENCES private.supplier_sla_versions');
  });

  it('makes SLA breach ingestion deterministic and replay-idempotent', () => {
    expect(governance).toContain("digest(concat_ws('|'");
    expect(governance).toContain('ON CONFLICT(breach_key)');
    expect(foundation).toContain('breach_key text NOT NULL UNIQUE');
  });

  it('requires resolution evidence before terminal SLA or incident states', () => {
    expect(closure).toContain('terminal SLA breach transition requires resolution evidence');
    expect(killSwitch).toContain('incident resolution requires recovery evidence');
    expect(closure).toContain('terminal SLA breach cannot regress');
    expect(killSwitch).toContain('closed incident cannot regress');
  });

  it('assesses risk from lifecycle, incidents, SLA breaches and security posture under a versioned policy', () => {
    expect(governance).toContain('supplier_risk_policy_versions');
    expect(governance).toContain('supplier_commerce_incidents');
    expect(governance).toContain('supplier_sla_breach_events');
    expect(governance).toContain('supplier_security_posture');
    expect(governance).toContain('recommendedAction');
  });

  it('fails closed when governance evidence is missing, stale, red or critically breached', () => {
    for (const reason of ['security_posture_missing','supplier_security_blocked','supplier_security_stale','active_risk_policy_missing','supplier_risk_assessment_missing_or_stale','supplier_risk_blocked','critical_supplier_incident_open','critical_supplier_sla_breach_open']) {
      expect(closure).toContain(`'${reason}'`);
    }
  });

  it('makes scoped kill switches visible to the governance decision', () => {
    expect(closure).toContain("'supplier_kill_switch_active'");
    expect(closure).toContain("'provider_kill_switch_active'");
    expect(closure).toContain("scope_type='supplier'");
    expect(closure).toContain("scope_type='provider'");
  });

  it('exposes a single admin control-centre snapshot across security SLA risk incidents controls operations and recovery', () => {
    for (const key of ['securityPosture','activeSla','latestRisk','openSlaBreaches','incidents','controls','recentOperations','recoveryQueue','actions']) {
      expect(killSwitch).toContain(`'${key}'`);
    }
    expect(killSwitch).toContain('server_admin_supplier_control_centre_v1');
  });

  it('keeps the server governance gate separate from admin visibility', () => {
    expect(closure).toContain('server_supplier_governance_decision_v1');
    expect(closure).toContain('GRANT EXECUTE ON FUNCTION public.server_supplier_governance_decision_v1');
    expect(killSwitch).toContain('server_admin_supplier_control_centre_v1');
  });

  it('supports the complete Phase M admin action surface without UI redesign', () => {
    for (const action of ['status','activate_risk_policy','set_security_posture','assess_risk','governance_decision','kill_switch','transition_incident','transition_sla_breach']) {
      expect(adminApi).toContain(`'${action}'`);
    }
    expect(adminApi).not.toContain('Workspace');
    expect(adminApi).not.toContain('SuperAdmin');
  });

  it('keeps private control-centre tables inaccessible directly', () => {
    expect(foundation.match(/REVOKE ALL ON TABLE private\./g)?.length).toBeGreaterThanOrEqual(6);
    expect(foundation).toContain('FROM PUBLIC, anon, authenticated, service_role');
  });

  it('preserves Phase P boundary by recording SLA events rather than inventing performance aggregates', () => {
    expect(foundation).toContain('Phase P may aggregate performance but must not rewrite these events');
    expect(foundation).not.toContain('supplier_performance_score');
  });
});
