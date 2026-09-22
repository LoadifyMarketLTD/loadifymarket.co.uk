import { createClient } from '@supabase/supabase-js';
import type { Handler } from '@netlify/functions';
import { authenticateActiveAccount } from './_shared/activeAccountAuth';
import { jsonResponse, optionsResponse } from './_shared/http';

const METHODS = 'POST, OPTIONS';
const ACTIONS = new Set(['list', 'get', 'update']);
const FORBIDDEN_KEYS = /^(password|secret|access[_-]?token|refresh[_-]?token|api[_-]?key|credential|card(number)?|private[_-]?key)$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function containsForbiddenKey(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsForbiddenKey);
  if (!isRecord(value)) return false;
  return Object.entries(value).some(([key, child]) => FORBIDDEN_KEYS.test(key) || containsForbiddenKey(child));
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return optionsResponse(METHODS);
  if (event.httpMethod !== 'POST') return jsonResponse(405, { error: 'Method not allowed' }, METHODS);

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return jsonResponse(500, { error: 'Server configuration error' }, METHODS);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const auth = await authenticateActiveAccount(event, admin, ['admin']);
  if (!auth.ok) return jsonResponse(auth.status, { error: 'Unauthorized' }, METHODS);

  let body: unknown;
  try {
    body = JSON.parse(event.body || '{}') as unknown;
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body' }, METHODS);
  }
  if (!isRecord(body)) return jsonResponse(400, { error: 'Invalid request' }, METHODS);

  const action = typeof body.action === 'string' ? body.action.trim().toLowerCase() : '';
  const payload = isRecord(body.payload) ? body.payload : {};
  if (!ACTIONS.has(action)) return jsonResponse(400, { error: 'Unsupported supplier application action' }, METHODS);
  if (containsForbiddenKey(payload)) {
    return jsonResponse(400, { error: 'Secrets, credentials and payment data are not accepted' }, METHODS);
  }

  const { data, error } = await admin.rpc('server_admin_supplier_application_v1', {
    p_actor_id: auth.actor.id,
    p_action: action,
    p_payload: payload,
  });
  if (error) {
    const forbidden = /authority|permission/i.test(error.message);
    const validation = /required|invalid|unknown|not found|existing Supplier Foundation/i.test(error.message);
    console.error('admin-supplier-applications:', error.message);
    return jsonResponse(forbidden ? 403 : validation ? 400 : 500, {
      error: forbidden ? 'Unauthorized' : validation ? error.message : 'Unable to manage supplier applications',
    }, METHODS);
  }

  return jsonResponse(200, { ok: true, result: data }, METHODS);
};
