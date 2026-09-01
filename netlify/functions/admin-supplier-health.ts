import { createClient } from '@supabase/supabase-js';
import type { Handler } from '@netlify/functions';
import { authenticateActiveAccount } from './_shared/activeAccountAuth';
import { deriveSupplierHealthFromControlCentre } from './_shared/supplierHealthSnapshot';
import { jsonResponse, optionsResponse } from './_shared/http';

const METHODS = 'POST, OPTIONS';

interface RequestBody {
  supplierId?: string;
  providerRef?: string;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Active-admin-only read surface for the explainable Supplier Health snapshot.
 * It reuses the existing Supplier Control Centre RPC and performs no mutation.
 */
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

  let body: RequestBody;
  try { body = JSON.parse(event.body || '{}') as RequestBody; }
  catch { return jsonResponse(400, { error: 'Invalid JSON body' }, METHODS); }

  const supplierId = text(body.supplierId);
  const providerRef = body.providerRef === undefined ? null : text(body.providerRef);
  if (!supplierId) return jsonResponse(400, { error: 'supplierId is required' }, METHODS);
  if (body.providerRef !== undefined && !providerRef) {
    return jsonResponse(400, { error: 'providerRef must be non-empty when supplied' }, METHODS);
  }

  const { data, error } = await admin.rpc('server_admin_supplier_control_centre_v1', {
    p_actor_id: auth.actor.id,
    p_supplier_id: supplierId,
    p_provider_ref: providerRef,
  });
  if (error) return jsonResponse(500, { error: 'Unable to read Supplier Control Centre' }, METHODS);

  let supplierHealth;
  try {
    supplierHealth = deriveSupplierHealthFromControlCentre({
      result: data,
      providerRef,
    });
  } catch (caught) {
    console.error('admin-supplier-health: health derivation failed', caught instanceof Error ? caught.message : 'unknown error');
    return jsonResponse(500, { error: 'Unable to derive Supplier Health' }, METHODS);
  }

  if (!supplierHealth) {
    return jsonResponse(409, { error: 'Supplier Health requires a resolved supplier scope' }, METHODS);
  }

  return jsonResponse(200, {
    ok: true,
    supplierHealth,
    controlMutationPerformed: false,
    externalMutationPerformed: false,
  }, METHODS);
};
