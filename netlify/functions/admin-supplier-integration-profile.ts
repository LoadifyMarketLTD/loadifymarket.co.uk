import { createClient } from '@supabase/supabase-js';
import type { Handler } from '@netlify/functions';
import { authenticateActiveAccount } from './_shared/activeAccountAuth';
import { jsonResponse, optionsResponse } from './_shared/http';

const METHODS = 'POST, OPTIONS';

interface Body {
  action?: 'list' | 'upsert';
  supplierId?: string;
  territory?: string;
  capability?: string;
  transport?: string;
  executionMode?: 'manual_only' | 'automated_read' | 'automated_write';
  configRef?: string;
  mapping?: Record<string, unknown>;
  contractRef?: string;
  status?: 'draft' | 'verified' | 'blocked' | 'stale';
  notes?: string;
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
  if (!body.supplierId || !body.action) {
    return jsonResponse(400, { error: 'supplierId and action are required' }, METHODS);
  }
  if (body.mapping !== undefined && (!body.mapping || typeof body.mapping !== 'object' || Array.isArray(body.mapping))) {
    return jsonResponse(400, { error: 'mapping must be an object' }, METHODS);
  }

  const payload = {
    supplierId: body.supplierId,
    territory: body.territory ?? 'GB',
    capability: body.capability ?? '',
    transport: body.transport ?? '',
    executionMode: body.executionMode ?? 'manual_only',
    configRef: body.configRef ?? null,
    mapping: body.mapping ?? {},
    contractRef: body.contractRef ?? null,
    status: body.status ?? 'draft',
    notes: body.notes ?? null,
  };

  const { data, error } = await admin.rpc('server_admin_supplier_integration_profile_v1', {
    p_actor_id: auth.actor.id,
    p_action: body.action,
    p_payload: payload,
  });

  if (error) {
    const validation = /required|unsupported|invalid|supplier not found|matching current|plain FTP|credentials|secret material|contractRef|configRef/i.test(error.message);
    const forbidden = error.code === '42501';
    console.error('admin-supplier-integration-profile: rpc failed:', error.message);
    return jsonResponse(validation ? 400 : forbidden ? 403 : 500, {
      error: validation ? error.message : forbidden ? 'Unauthorized' : 'Unable to update supplier integration profile',
    }, METHODS);
  }

  return jsonResponse(200, { ok: true, result: data }, METHODS);
};
