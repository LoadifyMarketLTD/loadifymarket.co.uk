import { createClient } from '@supabase/supabase-js';
import type { Handler } from '@netlify/functions';
import { authenticateActiveAccount } from './_shared/activeAccountAuth';
import { jsonResponse, optionsResponse } from './_shared/http';

const METHODS = 'POST, OPTIONS';
const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';
const object = (value: unknown): Record<string, unknown> | null => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
const secretPattern = /(password|secret[_-]?key|api[_-]?key|access[_-]?token|refresh[_-]?token|private[_-]?key)\s*["']?\s*:/i;

const containsSecretMaterial = (value: unknown) => {
  try { return secretPattern.test(JSON.stringify(value)); }
  catch { return true; }
};

type AdminAction =
  | { action: 'status'; supplierId?: string; providerRef?: string }
  | { action: 'activate_risk_policy'; version: number; amberScore: number; redScore: number; maxOpenHighIncidents: number; maxOpenCriticalIncidents: number; maxSlaBreaches30d: number; staleSecurityHours: number; evidence: Record<string, unknown> }
  | { action: 'set_security_posture'; supplierId: string; state: string; adapterAuthState: string; secretStorageState: string; credentialRotationState: string; webhookVerificationState: string; leastPrivilegeState: string; configIntegrityState: string; reverifyDueAt: string; evidence: Record<string, unknown> }
  | { action: 'assess_risk'; supplierId: string }
  | { action: 'governance_decision'; supplierId: string; providerRef?: string }
  | { action: 'kill_switch'; scopeType: 'supplier' | 'provider'; scopeRef: string; reason: string; severity?: string }
  | { action: 'transition_incident'; incidentId: string; status: string; mitigation?: string; recoveryEvidence?: string }
  | { action: 'transition_sla_breach'; breachId: string; state: string; resolution?: string };

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return optionsResponse(METHODS);
  if (event.httpMethod !== 'POST') return jsonResponse(405, { error: 'Method not allowed' }, METHODS);

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return jsonResponse(500, { error: 'Server configuration error' }, METHODS);

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const auth = await authenticateActiveAccount(event, admin, ['admin']);
  if (!auth.ok) return jsonResponse(auth.status, { error: 'Unauthorized' }, METHODS);

  let body: AdminAction;
  try { body = JSON.parse(event.body || '{}') as AdminAction; }
  catch { return jsonResponse(400, { error: 'Invalid JSON body' }, METHODS); }
  if (!body || typeof body !== 'object' || !('action' in body)) return jsonResponse(400, { error: 'Unsupported Phase M admin action' }, METHODS);
  if (containsSecretMaterial(body)) return jsonResponse(400, { error: 'Raw credentials or secrets are forbidden in Supplier Control Centre payloads' }, METHODS);

  if (body.action === 'status') {
    const supplierId = body.supplierId === undefined ? null : text(body.supplierId);
    const providerRef = body.providerRef === undefined ? null : text(body.providerRef);
    if (body.supplierId !== undefined && !supplierId) return jsonResponse(400, { error: 'supplierId must be non-empty when supplied' }, METHODS);
    if (body.providerRef !== undefined && !providerRef) return jsonResponse(400, { error: 'providerRef must be non-empty when supplied' }, METHODS);
    const { data, error } = await admin.rpc('server_admin_supplier_control_centre_v1', { p_actor_id: auth.actor.id, p_supplier_id: supplierId, p_provider_ref: providerRef });
    if (error) return jsonResponse(500, { error: 'Unable to read Supplier Control Centre' }, METHODS);
    return jsonResponse(200, { ok: true, result: data }, METHODS);
  }

  if (body.action === 'activate_risk_policy') {
    if (![body.version, body.amberScore, body.redScore, body.maxOpenHighIncidents, body.maxOpenCriticalIncidents, body.maxSlaBreaches30d, body.staleSecurityHours].every(Number.isInteger) || !object(body.evidence)) {
      return jsonResponse(400, { error: 'Complete versioned risk policy is required' }, METHODS);
    }
    const { data, error } = await admin.rpc('server_admin_activate_supplier_risk_policy_v1', {
      p_actor_id: auth.actor.id, p_version: body.version, p_amber_score: body.amberScore, p_red_score: body.redScore,
      p_max_open_high_incidents: body.maxOpenHighIncidents, p_max_open_critical_incidents: body.maxOpenCriticalIncidents,
      p_max_sla_breaches_30d: body.maxSlaBreaches30d, p_stale_security_hours: body.staleSecurityHours, p_evidence: body.evidence,
    });
    if (error) return jsonResponse(400, { error: 'Unable to activate supplier risk policy' }, METHODS);
    return jsonResponse(200, { ok: true, policyId: data }, METHODS);
  }

  if (body.action === 'set_security_posture') {
    const supplierId = text(body.supplierId); const reverifyDueAt = text(body.reverifyDueAt); const evidence = object(body.evidence);
    const fields = [body.state, body.adapterAuthState, body.secretStorageState, body.credentialRotationState, body.webhookVerificationState, body.leastPrivilegeState, body.configIntegrityState].map(text);
    if (!supplierId || !reverifyDueAt || !evidence || fields.some((v) => !v) || Number.isNaN(Date.parse(reverifyDueAt))) return jsonResponse(400, { error: 'Complete supplier security posture is required' }, METHODS);
    const { data, error } = await admin.rpc('server_admin_set_supplier_security_posture_v1', {
      p_actor_id: auth.actor.id, p_supplier_id: supplierId, p_state: fields[0], p_adapter_auth_state: fields[1],
      p_secret_storage_state: fields[2], p_credential_rotation_state: fields[3], p_webhook_verification_state: fields[4],
      p_least_privilege_state: fields[5], p_config_integrity_state: fields[6], p_reverify_due_at: reverifyDueAt, p_evidence: evidence,
    });
    if (error) return jsonResponse(400, { error: 'Unable to update supplier security posture' }, METHODS);
    return jsonResponse(200, { ok: true, result: data }, METHODS);
  }

  if (body.action === 'assess_risk' || body.action === 'governance_decision') {
    const supplierId = text(body.supplierId);
    if (!supplierId) return jsonResponse(400, { error: 'supplierId is required' }, METHODS);
    const rpc = body.action === 'assess_risk' ? 'server_supplier_risk_assessment_v1' : 'server_supplier_governance_decision_v1';
    const args = body.action === 'assess_risk' ? { p_supplier_id: supplierId } : { p_supplier_id: supplierId, p_provider_ref: body.providerRef ? text(body.providerRef) : null };
    const { data, error } = await admin.rpc(rpc, args);
    if (error) return jsonResponse(400, { error: body.action === 'assess_risk' ? 'Unable to assess supplier risk' : 'Unable to evaluate supplier governance' }, METHODS);
    return jsonResponse(200, { ok: true, result: data }, METHODS);
  }

  if (body.action === 'kill_switch') {
    const scopeRef = text(body.scopeRef); const reason = text(body.reason); const severity = body.severity ? text(body.severity) : 'high';
    if (!['supplier','provider'].includes(body.scopeType) || !scopeRef || !reason) return jsonResponse(400, { error: 'Complete supplier/provider kill switch request is required' }, METHODS);
    const { data, error } = await admin.rpc('server_admin_supplier_kill_switch_v1', { p_actor_id: auth.actor.id, p_scope_type: body.scopeType, p_scope_ref: scopeRef, p_reason: reason, p_severity: severity });
    if (error) return jsonResponse(400, { error: 'Unable to activate Supplier Commerce kill switch' }, METHODS);
    return jsonResponse(200, { ok: true, result: data }, METHODS);
  }

  if (body.action === 'transition_incident') {
    const incidentId = text(body.incidentId); const status = text(body.status);
    if (!incidentId || !status) return jsonResponse(400, { error: 'incidentId and status are required' }, METHODS);
    const { data, error } = await admin.rpc('server_admin_transition_supplier_commerce_incident_v1', { p_actor_id: auth.actor.id, p_incident_id: incidentId, p_status: status, p_mitigation: body.mitigation ? text(body.mitigation) : null, p_recovery_evidence: body.recoveryEvidence ? text(body.recoveryEvidence) : null });
    if (error) return jsonResponse(400, { error: 'Unable to transition Supplier Commerce incident' }, METHODS);
    return jsonResponse(200, { ok: true, result: data }, METHODS);
  }

  if (body.action === 'transition_sla_breach') {
    const breachId = text(body.breachId); const state = text(body.state);
    if (!breachId || !state) return jsonResponse(400, { error: 'breachId and state are required' }, METHODS);
    const { data, error } = await admin.rpc('server_admin_transition_supplier_sla_breach_v1', { p_actor_id: auth.actor.id, p_breach_id: breachId, p_state: state, p_resolution: body.resolution ? text(body.resolution) : null });
    if (error) return jsonResponse(400, { error: 'Unable to transition supplier SLA breach' }, METHODS);
    return jsonResponse(200, { ok: true, result: data }, METHODS);
  }

  return jsonResponse(400, { error: 'Unsupported Phase M admin action' }, METHODS);
};
