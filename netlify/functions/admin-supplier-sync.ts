import { createClient } from '@supabase/supabase-js';
import type { Handler } from '@netlify/functions';
import { authenticateActiveAccount } from './_shared/activeAccountAuth';
import { jsonResponse, optionsResponse } from './_shared/http';
import {
  mutateSupplierSyncPolicy,
  readSupplierSyncStatus,
  retireSupplierSyncPolicy,
  type SupplierSyncPolicyInput,
} from './_shared/supplierSync';

const METHODS = 'POST, OPTIONS';
type Action = 'set_policy' | 'retire_policy' | 'get_status';
interface RequestBody {
  action?: Action;
  policy?: SupplierSyncPolicyInput;
  supplierOfferId?: string;
  reason?: string;
  commercialMode?: 'marketplace_seller' | 'loadify_supplier_fulfilled' | 'loadify_direct';
  territory?: string;
  externalVariantRef?: string;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return optionsResponse(METHODS);
  if (event.httpMethod !== 'POST') return jsonResponse(405, { error: 'Method not allowed' }, METHODS);

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return jsonResponse(500, { error: 'Server configuration error' }, METHODS);

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const auth = await authenticateActiveAccount(event, admin, ['admin']);
  if (!auth.ok) return jsonResponse(auth.status, { error: 'Unauthorized' }, METHODS);

  let body: RequestBody;
  try { body = JSON.parse(event.body || '{}') as RequestBody; }
  catch { return jsonResponse(400, { error: 'Invalid JSON body' }, METHODS); }

  const serialized = JSON.stringify(body);
  if (/password|secret|access[_-]?token|refresh[_-]?token|api[_-]?key|card(number)?/i.test(serialized)) {
    return jsonResponse(400, { error: 'Secrets or payment credentials are not accepted in Supplier Sync payloads' }, METHODS);
  }

  if (body.action === 'set_policy') {
    const policy = body.policy;
    if (!policy || typeof policy !== 'object' || Array.isArray(policy) || typeof policy.supplierOfferId !== 'string'
      || !Number.isInteger(policy.stockMaxAgeSeconds) || !Number.isInteger(policy.priceMaxAgeSeconds)
      || !Number.isInteger(policy.policyVersion) || !['draft', 'approved'].includes(policy.status)
      || !policy.evidence || typeof policy.evidence !== 'object' || Array.isArray(policy.evidence)) {
      return jsonResponse(400, { error: 'A complete sync policy payload is required' }, METHODS);
    }
    const result = await mutateSupplierSyncPolicy(admin, auth.actor.id, policy);
    if (!result.ok) return mapFailure(result.error);
    return jsonResponse(200, { ok: true, result: result.data }, METHODS);
  }

  if (body.action === 'retire_policy') {
    if (typeof body.supplierOfferId !== 'string' || !body.supplierOfferId.trim() || typeof body.reason !== 'string' || !body.reason.trim()) {
      return jsonResponse(400, { error: 'supplierOfferId and retirement reason are required' }, METHODS);
    }
    const result = await retireSupplierSyncPolicy(admin, auth.actor.id, body.supplierOfferId, body.reason);
    if (!result.ok) return mapFailure(result.error);
    return jsonResponse(200, { ok: true, result: result.data }, METHODS);
  }

  if (body.action === 'get_status') {
    if (typeof body.supplierOfferId !== 'string' || !body.supplierOfferId.trim()
      || !body.commercialMode || !['marketplace_seller', 'loadify_supplier_fulfilled', 'loadify_direct'].includes(body.commercialMode)) {
      return jsonResponse(400, { error: 'supplierOfferId and commercialMode are required' }, METHODS);
    }
    const result = await readSupplierSyncStatus(admin, auth.actor.id, {
      supplierOfferId: body.supplierOfferId,
      commercialMode: body.commercialMode,
      territory: body.territory,
      externalVariantRef: body.externalVariantRef,
    });
    if (!result.ok) return mapFailure(result.error);
    return jsonResponse(200, { ok: true, result: result.data }, METHODS);
  }

  return jsonResponse(400, { error: 'Unsupported Supplier Sync action' }, METHODS);
};

function mapFailure(error: string) {
  const validation = /required|invalid|policy|seconds|quantity|offer|evidence|retire|status|not found/i.test(error);
  const forbidden = /authority|admin|permission/i.test(error);
  console.error('admin-supplier-sync: operation failed:', error);
  return jsonResponse(validation ? 400 : forbidden ? 403 : 500, {
    error: validation ? error : forbidden ? 'Unauthorized' : 'Unable to process Supplier Sync request',
  }, METHODS);
}
