import { createClient } from '@supabase/supabase-js';
import type { Handler } from '@netlify/functions';
import { authenticateActiveAccount } from './_shared/activeAccountAuth';
import { jsonResponse, optionsResponse } from './_shared/http';

const METHODS = 'POST, OPTIONS';

interface Body {
  supplierId?: string;
  territory?: string;
  capability?: string;
  status?: string;
  sourceRefs?: string[];
  evidenceSummary?: string;
  evidenceHash?: string;
  expiresAt?: string;
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

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return jsonResponse(400, { error: 'Object payload is required' }, METHODS);
  }
  if (!body.supplierId || !body.capability || !body.status || !Array.isArray(body.sourceRefs)) {
    return jsonResponse(400, { error: 'supplierId, capability, status and sourceRefs are required' }, METHODS);
  }

  const { data, error } = await admin.rpc('server_admin_supplier_onboarding_capability_v1', {
    p_actor_id: auth.actor.id,
    p_payload: {
      supplierId: body.supplierId,
      territory: body.territory ?? 'GB',
      capability: body.capability,
      status: body.status,
      sourceRefs: body.sourceRefs,
      evidenceSummary: body.evidenceSummary ?? null,
      evidenceHash: body.evidenceHash ?? null,
      expiresAt: body.expiresAt ?? null,
    },
  });

  if (error) {
    const validation = /required|invalid|unsupported|not found|sourceRefs|capability/i.test(error.message);
    const forbidden = error.code === '42501';
    console.error('admin-supplier-onboarding-capability: mutation failed:', error.message);
    return jsonResponse(validation ? 400 : forbidden ? 403 : 500, {
      error: validation ? error.message : forbidden ? 'Unauthorized' : 'Unable to update supplier capability evidence',
    }, METHODS);
  }

  return jsonResponse(200, { ok: true, result: data }, METHODS);
};
