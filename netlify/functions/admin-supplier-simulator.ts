import { createClient } from '@supabase/supabase-js';
import type { Handler } from '@netlify/functions';
import { authenticateActiveAccount } from './_shared/activeAccountAuth';
import { jsonResponse, optionsResponse } from './_shared/http';

const METHODS = 'POST, OPTIONS';
const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';
const object = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const containsSecretMaterial = (value: unknown) => /(?:password|secret[_-]?key|api[_-]?key|access[_-]?token|refresh[_-]?token|private[_-]?key)/i.test(JSON.stringify(value ?? {}));

type Action =
  | { action: 'start'; runKey: string; simulatorVersion: string; summary?: Record<string, unknown> }
  | { action: 'record_check'; runId: string; checkKey: string; status: string; attempt?: number; idempotencyKey?: string; canonicalFingerprint?: string; observedFingerprint?: string; evidence?: Record<string, unknown> }
  | { action: 'record_replay'; runId: string; replayClass: string; idempotencyKey: string; firstFingerprint: string; replayFingerprint: string; result: string; sourceOperation: string; evidence?: Record<string, unknown> }
  | { action: 'complete'; runId: string; status: 'passed' | 'failed'; summary?: Record<string, unknown> }
  | { action: 'status'; runId?: string };

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return optionsResponse(METHODS);
  if (event.httpMethod !== 'POST') return jsonResponse(405, { error: 'Method not allowed' }, METHODS);
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return jsonResponse(500, { error: 'Server configuration error' }, METHODS);

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const auth = await authenticateActiveAccount(event, admin, ['admin']);
  if (!auth.ok) return jsonResponse(auth.status, { error: 'Unauthorized' }, METHODS);

  let body: Action;
  try { body = JSON.parse(event.body || '{}') as Action; }
  catch { return jsonResponse(400, { error: 'Invalid JSON body' }, METHODS); }
  if (!body || typeof body !== 'object' || !('action' in body)) return jsonResponse(400, { error: 'Unsupported Phase N simulator action' }, METHODS);
  if (containsSecretMaterial(body)) return jsonResponse(400, { error: 'Raw credentials or secrets are forbidden in simulator evidence' }, METHODS);

  if (body.action === 'start') {
    if (!text(body.runKey) || !text(body.simulatorVersion)) return jsonResponse(400, { error: 'runKey and simulatorVersion are required' }, METHODS);
    const { data, error } = await admin.rpc('server_admin_start_supplier_simulator_run_v1', {
      p_actor_id: auth.actor.id, p_run_key: text(body.runKey), p_simulator_version: text(body.simulatorVersion), p_summary: object(body.summary),
    });
    if (error) return jsonResponse(400, { error: 'Unable to start simulator validation run' }, METHODS);
    return jsonResponse(200, { ok: true, runId: data }, METHODS);
  }

  if (body.action === 'record_check') {
    if (!text(body.runId) || !text(body.checkKey) || !text(body.status)) return jsonResponse(400, { error: 'Complete simulator check evidence is required' }, METHODS);
    const { data, error } = await admin.rpc('server_record_supplier_simulator_check_v1', {
      p_run_id: text(body.runId), p_check_key: text(body.checkKey), p_status: text(body.status), p_attempt: Number.isInteger(body.attempt) ? body.attempt : 1,
      p_idempotency_key: text(body.idempotencyKey) || null, p_canonical_fingerprint: text(body.canonicalFingerprint) || null,
      p_observed_fingerprint: text(body.observedFingerprint) || null, p_evidence: object(body.evidence),
    });
    if (error) return jsonResponse(400, { error: 'Unable to record simulator check' }, METHODS);
    return jsonResponse(200, { ok: true, checkId: data }, METHODS);
  }

  if (body.action === 'record_replay') {
    if (![body.runId, body.replayClass, body.idempotencyKey, body.firstFingerprint, body.replayFingerprint, body.result, body.sourceOperation].every((v) => text(v))) {
      return jsonResponse(400, { error: 'Complete replay evidence is required' }, METHODS);
    }
    const { data, error } = await admin.rpc('server_record_supplier_replay_validation_v1', {
      p_run_id: text(body.runId), p_replay_class: text(body.replayClass), p_idempotency_key: text(body.idempotencyKey),
      p_first_fingerprint: text(body.firstFingerprint), p_replay_fingerprint: text(body.replayFingerprint), p_result: text(body.result),
      p_source_operation: text(body.sourceOperation), p_evidence: object(body.evidence),
    });
    if (error) return jsonResponse(400, { error: 'Unable to record replay validation evidence' }, METHODS);
    return jsonResponse(200, { ok: true, replayEvidenceId: data }, METHODS);
  }

  if (body.action === 'complete') {
    if (!text(body.runId) || !['passed', 'failed'].includes(body.status)) return jsonResponse(400, { error: 'runId and terminal status are required' }, METHODS);
    const { data, error } = await admin.rpc('server_admin_complete_supplier_simulator_run_v1', {
      p_actor_id: auth.actor.id, p_run_id: text(body.runId), p_status: body.status, p_summary: object(body.summary),
    });
    if (error) return jsonResponse(400, { error: 'Unable to complete simulator validation run' }, METHODS);
    return jsonResponse(200, { ok: true, result: data }, METHODS);
  }

  if (body.action === 'status') {
    const { data, error } = await admin.rpc('server_admin_supplier_simulator_status_v1', { p_actor_id: auth.actor.id, p_run_id: text(body.runId) || null });
    if (error) return jsonResponse(500, { error: 'Unable to read simulator validation status' }, METHODS);
    return jsonResponse(200, { ok: true, result: data }, METHODS);
  }

  return jsonResponse(400, { error: 'Unsupported Phase N simulator action' }, METHODS);
};
