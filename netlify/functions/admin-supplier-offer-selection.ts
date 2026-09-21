import { createClient } from '@supabase/supabase-js';
import type { Handler } from '@netlify/functions';
import { authenticateActiveAccount } from './_shared/activeAccountAuth';
import { jsonResponse, optionsResponse } from './_shared/http';
import { evaluateProjectionSupplierOffers } from './_shared/supplierOfferSelectionRuntime';

const METHODS = 'POST, OPTIONS';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return optionsResponse(METHODS);
  if (event.httpMethod !== 'POST') return jsonResponse(405, { error: 'Method not allowed' }, METHODS);

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return jsonResponse(500, { error: 'Server configuration error' }, METHODS);

  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const auth = await authenticateActiveAccount(event, admin, ['admin']);
  if (!auth.ok) return jsonResponse(auth.status, { error: 'Unauthorized' }, METHODS);

  let body: Record<string, unknown>;
  try {
    const parsed = JSON.parse(event.body || '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error();
    body = parsed as Record<string, unknown>;
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body' }, METHODS);
  }

  const action = typeof body.action === 'string' ? body.action.trim().toLowerCase() : '';
  const projectionId = typeof body.projectionId === 'string' ? body.projectionId.trim() : '';
  if (!UUID_RE.test(projectionId)) {
    return jsonResponse(400, { error: 'Valid projectionId is required' }, METHODS);
  }

  if (action === 'evaluate') {
    const requestedQuantity = Number(body.requestedQuantity ?? 1);
    if (!Number.isSafeInteger(requestedQuantity) || requestedQuantity < 1 || requestedQuantity > 100) {
      return jsonResponse(400, { error: 'requestedQuantity must be an integer between 1 and 100' }, METHODS);
    }
    const result = await evaluateProjectionSupplierOffers(admin, {
      projectionId,
      requestedQuantity,
      territory: typeof body.territory === 'string' ? body.territory : 'GB',
    });
    return jsonResponse(200, { ok: true, result }, METHODS);
  }

  if (!['bind', 'approve', 'disable'].includes(action)) {
    return jsonResponse(400, { error: 'Unsupported supplier offer selection action' }, METHODS);
  }

  const supplierOfferId = typeof body.supplierOfferId === 'string' ? body.supplierOfferId.trim() : '';
  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
  if (!UUID_RE.test(supplierOfferId) || reason.length < 3 || reason.length > 1000) {
    return jsonResponse(400, { error: 'Valid supplierOfferId and reason are required' }, METHODS);
  }

  const { data, error } = await admin.rpc('server_admin_supplier_projection_offer_binding_v1', {
    p_actor_id: auth.actor.id,
    p_action: action,
    p_projection_id: projectionId,
    p_supplier_offer_id: supplierOfferId,
    p_reason: reason,
    p_fallback_allowed: body.fallbackAllowed !== false,
  });

  if (error) return jsonResponse(409, { error: error.message || 'Supplier offer binding action failed' }, METHODS);
  return jsonResponse(200, { ok: true, result: data }, METHODS);
};
