import { createClient } from '@supabase/supabase-js';
import type { Handler } from '@netlify/functions';
import { authenticateActiveAccount } from './_shared/activeAccountAuth';
import { jsonResponse, optionsResponse } from './_shared/http';

const METHODS = 'POST, OPTIONS';
const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';
const object = (value: unknown): Record<string, unknown> | null => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
const positiveInteger = (value: unknown) => Number.isSafeInteger(value) && Number(value) > 0;
const secretPattern = /(password|secret[_-]?key|api[_-]?key|access[_-]?token|refresh[_-]?token|private[_-]?key)\s*["']?\s*:/i;

const containsSecretMaterial = (value: unknown) => {
  try { return secretPattern.test(JSON.stringify(value)); }
  catch { return true; }
};

type PilotAction =
  | { action: 'status'; pilotId?: string }
  | { action: 'create'; pilotKey: string; supplierId: string; providerKey: string; cohortKey: string; maximumOrderCount: number; maximumOrderValueMinor: number; acceptanceThresholds: Record<string, unknown>; simulatorEvidenceRef: string; evidence?: Record<string, unknown> }
  | { action: 'add_offer'; pilotId: string; supplierOfferId: string; externalVariantRef?: string; selectionEvidence: Record<string, unknown> }
  | { action: 'add_cohort_member'; pilotId: string; buyerId: string; evidence: Record<string, unknown> }
  | { action: 'readiness'; pilotId: string }
  | { action: 'prepare'; pilotId: string; reason: string }
  | { action: 'activate'; pilotId: string; reason: string }
  | { action: 'record_evidence'; pilotId: string; orderId?: string; evidenceType: string; evidenceRef: string; summary: string; observedAt: string; evidence?: Record<string, unknown> }
  | { action: 'acceptance'; pilotId: string }
  | { action: 'pause'; pilotId: string; reason: string }
  | { action: 'complete'; pilotId: string; reason: string };

const requiredThresholds = (value: Record<string, unknown>) => {
  const ack = value.acknowledgementRateMinPct;
  const duplicate = value.duplicateSideEffectsMax;
  const oversell = value.oversellMax;
  const financial = value.unreconciledFinancialExceptionsMax;
  const critical = value.criticalIncidentMax;
  return typeof ack === 'number' && Number.isFinite(ack) && ack >= 0 && ack <= 100
    && Number.isInteger(duplicate) && duplicate === 0
    && Number.isInteger(oversell) && Number(oversell) >= 0
    && Number.isInteger(financial) && financial === 0
    && Number.isInteger(critical) && critical === 0;
};

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return optionsResponse(METHODS);
  if (event.httpMethod !== 'POST') return jsonResponse(405, { error: 'Method not allowed' }, METHODS);

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return jsonResponse(500, { error: 'Server configuration error' }, METHODS);

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const auth = await authenticateActiveAccount(event, admin, ['admin']);
  if (!auth.ok) return jsonResponse(auth.status, { error: 'Unauthorized' }, METHODS);

  let body: PilotAction;
  try { body = JSON.parse(event.body || '{}') as PilotAction; }
  catch { return jsonResponse(400, { error: 'Invalid JSON body' }, METHODS); }
  if (!body || typeof body !== 'object' || !('action' in body)) return jsonResponse(400, { error: 'Unsupported Phase O pilot action' }, METHODS);
  if (containsSecretMaterial(body)) return jsonResponse(400, { error: 'Raw credentials or secrets are forbidden in controlled pilot payloads' }, METHODS);

  if (body.action === 'status') {
    const pilotId = body.pilotId === undefined ? null : text(body.pilotId);
    if (body.pilotId !== undefined && !pilotId) return jsonResponse(400, { error: 'pilotId must be non-empty when supplied' }, METHODS);
    const { data, error } = await admin.rpc('server_admin_supplier_pilot_status_v1', { p_actor_id: auth.actor.id, p_pilot_id: pilotId });
    if (error) return jsonResponse(500, { error: 'Unable to read controlled pilot status' }, METHODS);
    return jsonResponse(200, { ok: true, result: data }, METHODS);
  }

  if (body.action === 'create') {
    const pilotKey = text(body.pilotKey); const supplierId = text(body.supplierId); const providerKey = text(body.providerKey); const cohortKey = text(body.cohortKey);
    const simulatorEvidenceRef = text(body.simulatorEvidenceRef); const thresholds = object(body.acceptanceThresholds); const evidence = object(body.evidence ?? {});
    if (!pilotKey || !supplierId || !providerKey || !cohortKey || !simulatorEvidenceRef || !positiveInteger(body.maximumOrderCount)
      || !positiveInteger(body.maximumOrderValueMinor) || !thresholds || !requiredThresholds(thresholds) || !evidence) {
      return jsonResponse(400, { error: 'Complete bounded controlled pilot definition is required' }, METHODS);
    }
    const { data, error } = await admin.rpc('server_admin_create_supplier_pilot_v1', {
      p_actor_id: auth.actor.id, p_pilot_key: pilotKey, p_supplier_id: supplierId, p_provider_key: providerKey,
      p_cohort_key: cohortKey, p_maximum_order_count: body.maximumOrderCount, p_maximum_order_value_minor: body.maximumOrderValueMinor,
      p_acceptance_thresholds: thresholds, p_simulator_evidence_ref: simulatorEvidenceRef, p_evidence: evidence,
    });
    if (error) return jsonResponse(400, { error: 'Unable to create controlled pilot' }, METHODS);
    return jsonResponse(200, { ok: true, pilotId: data }, METHODS);
  }

  if (body.action === 'add_offer') {
    const pilotId = text(body.pilotId); const supplierOfferId = text(body.supplierOfferId); const variantRef = body.externalVariantRef === undefined ? '' : text(body.externalVariantRef);
    const selectionEvidence = object(body.selectionEvidence);
    if (!pilotId || !supplierOfferId || !selectionEvidence || Object.keys(selectionEvidence).length === 0) return jsonResponse(400, { error: 'Pilot offer and low-risk selection evidence are required' }, METHODS);
    const { data, error } = await admin.rpc('server_admin_add_supplier_pilot_offer_v1', {
      p_actor_id: auth.actor.id, p_pilot_id: pilotId, p_supplier_offer_id: supplierOfferId,
      p_external_variant_ref: variantRef, p_selection_evidence: selectionEvidence,
    });
    if (error) return jsonResponse(400, { error: 'Unable to add controlled pilot offer' }, METHODS);
    return jsonResponse(200, { ok: true, pilotOfferId: data }, METHODS);
  }

  if (body.action === 'add_cohort_member') {
    const pilotId = text(body.pilotId); const buyerId = text(body.buyerId); const evidence = object(body.evidence);
    if (!pilotId || !buyerId || !evidence || Object.keys(evidence).length === 0) {
      return jsonResponse(400, { error: 'Pilot, buyer and cohort membership evidence are required' }, METHODS);
    }
    const { data, error } = await admin.rpc('server_admin_add_supplier_pilot_cohort_member_v1', {
      p_actor_id: auth.actor.id, p_pilot_id: pilotId, p_buyer_id: buyerId, p_evidence: evidence,
    });
    if (error) return jsonResponse(400, { error: 'Unable to add controlled pilot cohort member' }, METHODS);
    return jsonResponse(200, { ok: true, cohortMemberId: data }, METHODS);
  }

  if (body.action === 'readiness' || body.action === 'acceptance') {
    const pilotId = text(body.pilotId);
    if (!pilotId) return jsonResponse(400, { error: 'pilotId is required' }, METHODS);
    const rpc = body.action === 'readiness' ? 'server_supplier_pilot_activation_readiness_v1' : 'server_supplier_pilot_acceptance_v1';
    const { data, error } = await admin.rpc(rpc, { p_pilot_id: pilotId });
    if (error) return jsonResponse(400, { error: body.action === 'readiness' ? 'Unable to evaluate pilot activation readiness' : 'Unable to evaluate pilot acceptance' }, METHODS);
    return jsonResponse(200, { ok: true, result: data }, METHODS);
  }

  if (body.action === 'prepare' || body.action === 'activate' || body.action === 'pause' || body.action === 'complete') {
    const pilotId = text(body.pilotId); const reason = text(body.reason);
    if (!pilotId || !reason) return jsonResponse(400, { error: 'pilotId and reason are required' }, METHODS);
    const rpc = body.action === 'prepare' ? 'server_admin_prepare_supplier_pilot_v1'
      : body.action === 'activate' ? 'server_admin_activate_supplier_pilot_v1'
        : body.action === 'pause' ? 'server_admin_pause_supplier_pilot_v1'
          : 'server_admin_complete_supplier_pilot_v1';
    const { data, error } = await admin.rpc(rpc, { p_actor_id: auth.actor.id, p_pilot_id: pilotId, p_reason: reason });
    if (error) return jsonResponse(400, { error: `Unable to ${body.action} controlled pilot` }, METHODS);
    return jsonResponse(200, { ok: true, result: data }, METHODS);
  }

  if (body.action === 'record_evidence') {
    const pilotId = text(body.pilotId); const orderId = body.orderId === undefined ? null : text(body.orderId);
    const evidenceType = text(body.evidenceType); const evidenceRef = text(body.evidenceRef); const summary = text(body.summary); const observedAt = text(body.observedAt);
    const evidence = object(body.evidence ?? {});
    if (!pilotId || (body.orderId !== undefined && !orderId) || !evidenceType || !evidenceRef || !summary || !observedAt || Number.isNaN(Date.parse(observedAt)) || !evidence) {
      return jsonResponse(400, { error: 'Complete controlled pilot evidence is required' }, METHODS);
    }
    const { data, error } = await admin.rpc('server_admin_record_supplier_pilot_evidence_v1', {
      p_actor_id: auth.actor.id, p_pilot_id: pilotId, p_order_id: orderId, p_evidence_type: evidenceType,
      p_evidence_ref: evidenceRef, p_summary: summary, p_observed_at: observedAt, p_evidence: evidence,
    });
    if (error) return jsonResponse(400, { error: 'Unable to record controlled pilot evidence' }, METHODS);
    return jsonResponse(200, { ok: true, evidenceId: data }, METHODS);
  }

  return jsonResponse(400, { error: 'Unsupported Phase O pilot action' }, METHODS);
};