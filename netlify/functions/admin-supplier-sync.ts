import { createClient } from '@supabase/supabase-js';
import type { Handler } from '@netlify/functions';
import { authenticateActiveAccount } from './_shared/activeAccountAuth';
import { jsonResponse, optionsResponse } from './_shared/http';
import { mutateSupplierSyncPolicy, type SupplierSyncPolicyInput } from './_shared/supplierSync';

const METHODS = 'POST, OPTIONS';

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return optionsResponse(METHODS);
  if (event.httpMethod !== 'POST') return jsonResponse(405, { error: 'Method not allowed' }, METHODS);

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return jsonResponse(500, { error: 'Server configuration error' }, METHODS);

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const auth = await authenticateActiveAccount(event, admin, ['admin']);
  if (!auth.ok) return jsonResponse(auth.status, { error: 'Unauthorized' }, METHODS);

  let body: SupplierSyncPolicyInput;
  try { body = JSON.parse(event.body || '{}') as SupplierSyncPolicyInput; }
  catch { return jsonResponse(400, { error: 'Invalid JSON body' }, METHODS); }

  if (!body || typeof body !== 'object' || Array.isArray(body) || typeof body.supplierOfferId !== 'string'
    || !Number.isInteger(body.stockMaxAgeSeconds) || !Number.isInteger(body.priceMaxAgeSeconds)
    || !Number.isInteger(body.policyVersion) || !['draft', 'approved'].includes(body.status)
    || !body.evidence || typeof body.evidence !== 'object' || Array.isArray(body.evidence)) {
    return jsonResponse(400, { error: 'A complete sync policy payload is required' }, METHODS);
  }

  const serialized = JSON.stringify(body);
  if (/password|secret|access[_-]?token|refresh[_-]?token|api[_-]?key|card(number)?/i.test(serialized)) {
    return jsonResponse(400, { error: 'Secrets or payment credentials are not accepted in Supplier Sync payloads' }, METHODS);
  }

  const result = await mutateSupplierSyncPolicy(admin, auth.actor.id, body);
  if (!result.ok) {
    const validation = /required|invalid|policy|seconds|quantity|offer|evidence|retire|status/i.test(result.error);
    const forbidden = /authority|admin|permission/i.test(result.error);
    console.error('admin-supplier-sync: mutation failed:', result.error);
    return jsonResponse(validation ? 400 : forbidden ? 403 : 500, {
      error: validation ? result.error : forbidden ? 'Unauthorized' : 'Unable to update Supplier Sync policy',
    }, METHODS);
  }

  return jsonResponse(200, { ok: true, result: result.data }, METHODS);
};
