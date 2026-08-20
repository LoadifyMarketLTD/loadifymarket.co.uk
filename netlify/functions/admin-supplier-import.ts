import { createClient } from '@supabase/supabase-js';
import type { Handler } from '@netlify/functions';
import { authenticateActiveAccount } from './_shared/activeAccountAuth';
import { jsonResponse, optionsResponse } from './_shared/http';
import { mutateSupplierImport, type SupplierImportAdminAction } from './_shared/supplierImport';

const METHODS = 'POST, OPTIONS';
const ACTIONS = new Set<SupplierImportAdminAction>([
  'create_import_batch',
  'record_import_item',
  'record_normalized_fact',
  'review_normalized_fact',
  'record_asset_rights',
  'record_compliance_review',
  'set_import_item_status',
]);

interface Body {
  action?: string;
  payload?: Record<string, unknown>;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return optionsResponse(METHODS);
  if (event.httpMethod !== 'POST') return jsonResponse(405, { error: 'Method not allowed' }, METHODS);

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(500, { error: 'Server configuration error' }, METHODS);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const auth = await authenticateActiveAccount(event, admin, ['admin']);
  if (!auth.ok) return jsonResponse(auth.status, { error: 'Unauthorized' }, METHODS);

  let body: Body;
  try {
    body = JSON.parse(event.body || '{}') as Body;
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body' }, METHODS);
  }

  const action = typeof body.action === 'string' ? body.action.trim() as SupplierImportAdminAction : null;
  const payload = body.payload;
  if (!action || !ACTIONS.has(action) || !payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return jsonResponse(400, { error: 'A supported action and object payload are required' }, METHODS);
  }

  // Phase F accepts evidence references/hashes, never provider credentials or payment secrets.
  const serialized = JSON.stringify(payload);
  if (/password|secret|access[_-]?token|refresh[_-]?token|api[_-]?key|card(number)?/i.test(serialized)) {
    return jsonResponse(400, { error: 'Secrets or payment credentials are not accepted in Supplier Import payloads' }, METHODS);
  }

  const result = await mutateSupplierImport(admin, auth.actor.id, action, payload);
  if (!result.ok) {
    const validation = /required|invalid|incomplete|must|not found|blocked|cannot|lock|evidence|supplier/i.test(result.error);
    const forbidden = /authority|required admin|permission/i.test(result.error);
    console.error('admin-supplier-import: mutation failed:', result.error);
    return jsonResponse(validation ? 400 : forbidden ? 403 : 500, {
      error: validation ? result.error : forbidden ? 'Unauthorized' : 'Unable to update Supplier Import',
    }, METHODS);
  }

  return jsonResponse(200, { ok: true, result: result.data }, METHODS);
};
