import { createClient } from '@supabase/supabase-js';
import type { Handler } from '@netlify/functions';
import { authenticateActiveAccount } from './_shared/activeAccountAuth';
import { jsonResponse, optionsResponse } from './_shared/http';

const METHODS = 'POST, OPTIONS';

type AdminAction =
  | { action: 'status'; orderId?: string }
  | { action: 'reconcile'; orderId: string };

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

  if (!body || (body.action !== 'status' && body.action !== 'reconcile')) {
    return jsonResponse(400, { error: 'Unsupported Phase L admin action' }, METHODS);
  }
  if (body.orderId !== undefined && (typeof body.orderId !== 'string' || !body.orderId.trim())) {
    return jsonResponse(400, { error: 'orderId must be a non-empty string when supplied' }, METHODS);
  }

  if (body.action === 'reconcile') {
    if (!body.orderId?.trim()) return jsonResponse(400, { error: 'orderId is required for reconciliation' }, METHODS);
    const { data, error } = await admin.rpc('server_reconcile_supplier_financials_v1', { p_order_id: body.orderId.trim() });
    if (error) return jsonResponse(500, { error: 'Unable to reconcile supplier financial truth' }, METHODS);
    return jsonResponse(200, { ok: true, result: data }, METHODS);
  }

  const { data, error } = await admin.rpc('server_admin_supplier_return_financial_status_v1', {
    p_actor_id: auth.actor.id,
    p_order_id: body.orderId?.trim() || null,
  });
  if (error) return jsonResponse(500, { error: 'Unable to read supplier return/recovery status' }, METHODS);
  return jsonResponse(200, { ok: true, result: data }, METHODS);
};
