import { createClient } from '@supabase/supabase-js';
import type { Handler } from '@netlify/functions';
import { authenticateActiveAccount } from './_shared/activeAccountAuth';
import { jsonResponse, optionsResponse } from './_shared/http';

const METHODS = 'POST, OPTIONS';
const containsSecretMaterial = (value: unknown) =>
  /(?:password|secret[_-]?key|api[_-]?key|access[_-]?token|refresh[_-]?token|private[_-]?key)/i.test(JSON.stringify(value ?? {}));

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return optionsResponse(METHODS);
  if (event.httpMethod !== 'POST') return jsonResponse(405, { error: 'Method not allowed' }, METHODS);

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return jsonResponse(500, { error: 'Server configuration error' }, METHODS);

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const auth = await authenticateActiveAccount(event, admin, ['admin']);
  if (!auth.ok) return jsonResponse(auth.status, { error: 'Unauthorized' }, METHODS);

  let body: { action?: unknown; payload?: unknown };
  try {
    body = JSON.parse(event.body || '{}') as { action?: unknown; payload?: unknown };
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body' }, METHODS);
  }
  const action = typeof body.action === 'string' ? body.action.trim() : '';
  const payload = body.payload && typeof body.payload === 'object' && !Array.isArray(body.payload)
    ? body.payload as Record<string, unknown>
    : {};
  if (!action) return jsonResponse(400, { error: 'action is required' }, METHODS);
  if (containsSecretMaterial(payload)) {
    return jsonResponse(400, { error: 'Raw credentials or secrets are forbidden in commercial compatibility payloads' }, METHODS);
  }

  const { data, error } = await admin.rpc('server_admin_supplier_commercial_compatibility_v2', {
    p_actor_id: auth.actor.id,
    p_action: action,
    p_payload: payload,
  });
  if (error) {
    const validation = error.code === '22023' || /required|invalid|unsupported|not found|draft|enabled/i.test(error.message || '');
    return jsonResponse(validation ? 400 : 409, { error: error.message || 'Unable to update commercial compatibility' }, METHODS);
  }

  return jsonResponse(200, {
    ok: true,
    result: data,
    supplierCommerceActivated: false,
    checkoutEnabledByThisEndpoint: false,
  }, METHODS);
};