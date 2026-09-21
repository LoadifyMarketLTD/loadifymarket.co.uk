import { createClient } from '@supabase/supabase-js';
import type { Handler } from '@netlify/functions';
import { authenticateActiveAccount } from './_shared/activeAccountAuth';
import { jsonResponse, optionsResponse } from './_shared/http';

const METHODS = 'POST, OPTIONS';

interface Body {
  supplierKey?: string;
  territory?: string;
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

  let body: Body;
  try {
    body = JSON.parse(event.body || '{}') as Body;
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body' }, METHODS);
  }

  const supplierKey = typeof body.supplierKey === 'string' ? body.supplierKey.trim().toLowerCase() : '';
  const territory = typeof body.territory === 'string' ? body.territory.trim().toUpperCase() : 'GB';
  if (!supplierKey) return jsonResponse(400, { error: 'supplierKey is required' }, METHODS);

  const { data, error } = await admin.rpc('server_supplier_onboarding_readiness_v1', {
    p_actor_id: auth.actor.id,
    p_supplier_key: supplierKey,
    p_territory: territory,
  });
  if (error) {
    const validation = /required|invalid|territory/i.test(error.message);
    const forbidden = error.code === '42501';
    console.error('admin-supplier-onboarding-readiness: evaluation failed:', error.message);
    return jsonResponse(validation ? 400 : forbidden ? 403 : 500, {
      error: validation ? error.message : forbidden ? 'Unauthorized' : 'Unable to evaluate supplier onboarding readiness',
    }, METHODS);
  }

  return jsonResponse(200, { ok: true, readiness: data }, METHODS);
};
