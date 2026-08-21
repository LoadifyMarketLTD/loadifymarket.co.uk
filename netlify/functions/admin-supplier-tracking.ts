import { createClient } from '@supabase/supabase-js';
import type { Handler } from '@netlify/functions';
import { authenticateActiveAccount } from './_shared/activeAccountAuth';
import { jsonResponse, optionsResponse } from './_shared/http';

const METHODS = 'POST, OPTIONS';

type AdminAction =
  | { action: 'status'; orderId?: string }
  | { action: 'approve_mapping'; providerKey: string; providerStatus: string; canonicalStatus: string; evidence: Record<string, unknown>; effectiveFrom?: string }
  | { action: 'transition_exception'; exceptionId: string; state: string; ownerType: string; nextAction: string; reason: string; resolution?: string; metadata?: Record<string, unknown> };

const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';

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
  if (!body || typeof body !== 'object' || !('action' in body)) return jsonResponse(400, { error: 'Unsupported Phase K admin action' }, METHODS);

  if (body.action === 'status') {
    const orderId = body.orderId === undefined ? null : text(body.orderId);
    if (body.orderId !== undefined && !orderId) return jsonResponse(400, { error: 'orderId must be non-empty when supplied' }, METHODS);
    const { data, error } = await admin.rpc('server_admin_supplier_tracking_status_v1', {
      p_actor_id: auth.actor.id,
      p_order_id: orderId,
    });
    if (error) return jsonResponse(500, { error: 'Unable to read supplier tracking status' }, METHODS);
    return jsonResponse(200, { ok: true, result: data }, METHODS);
  }

  if (body.action === 'approve_mapping') {
    const providerKey = text(body.providerKey);
    const providerStatus = text(body.providerStatus);
    const canonicalStatus = text(body.canonicalStatus);
    if (!providerKey || !providerStatus || !canonicalStatus || !body.evidence || typeof body.evidence !== 'object' || Array.isArray(body.evidence)) {
      return jsonResponse(400, { error: 'Complete tracking mapping evidence is required' }, METHODS);
    }
    const { data, error } = await admin.rpc('server_admin_approve_supplier_tracking_mapping_v1', {
      p_actor_id: auth.actor.id,
      p_provider_key: providerKey,
      p_provider_status: providerStatus,
      p_canonical_status: canonicalStatus,
      p_evidence: body.evidence,
      p_effective_from: body.effectiveFrom ? text(body.effectiveFrom) : new Date().toISOString(),
    });
    if (error) return jsonResponse(400, { error: 'Unable to approve supplier tracking mapping' }, METHODS);
    return jsonResponse(200, { ok: true, mappingId: data }, METHODS);
  }

  if (body.action === 'transition_exception') {
    const exceptionId = text(body.exceptionId);
    const state = text(body.state);
    const ownerType = text(body.ownerType);
    const nextAction = text(body.nextAction);
    const reason = text(body.reason);
    if (!exceptionId || !state || !ownerType || !nextAction || !reason) return jsonResponse(400, { error: 'Incomplete exception transition' }, METHODS);
    const { data, error } = await admin.rpc('server_transition_supplier_order_exception_v1', {
      p_actor_id: auth.actor.id,
      p_exception_id: exceptionId,
      p_state: state,
      p_owner_type: ownerType,
      p_next_action: nextAction,
      p_reason: reason,
      p_resolution: body.resolution ? text(body.resolution) : null,
      p_metadata: body.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata) ? body.metadata : {},
    });
    if (error) return jsonResponse(400, { error: 'Unable to transition supplier exception' }, METHODS);
    return jsonResponse(200, { ok: true, result: data }, METHODS);
  }

  return jsonResponse(400, { error: 'Unsupported Phase K admin action' }, METHODS);
};
