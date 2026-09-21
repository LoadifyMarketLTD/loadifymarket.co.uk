import { createClient } from '@supabase/supabase-js';
import type { Handler } from '@netlify/functions';
import { authenticateActiveAccount } from './_shared/activeAccountAuth';
import { jsonResponse, optionsResponse } from './_shared/http';

const METHODS = 'POST, OPTIONS';
const CONFIG_REF_RE = /^env:[A-Z][A-Z0-9_]{2,127}$/;

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

  let body: {
    supplierId?: string;
    enabled?: boolean;
    mode?: string;
    refreshMinutes?: number;
    configRef?: string;
  };
  try {
    body = JSON.parse(event.body || '{}') as typeof body;
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body' }, METHODS);
  }

  const supplierId = typeof body.supplierId === 'string' ? body.supplierId.trim() : '';
  const mode = body.mode === 'scheduled' ? 'scheduled' : body.mode === 'manual' ? 'manual' : '';
  const configRef = typeof body.configRef === 'string' ? body.configRef.trim() : '';
  if (!supplierId || !mode || typeof body.enabled !== 'boolean') {
    return jsonResponse(400, { error: 'supplierId, enabled and mode are required' }, METHODS);
  }
  if (body.enabled && !CONFIG_REF_RE.test(configRef)) {
    return jsonResponse(400, { error: 'Enabled acquisition requires configRef in env:VARIABLE_NAME format' }, METHODS);
  }
  if (mode === 'scheduled' && (!Number.isInteger(body.refreshMinutes) || Number(body.refreshMinutes) < 15 || Number(body.refreshMinutes) > 10080)) {
    return jsonResponse(400, { error: 'Scheduled refresh must be between 15 and 10080 minutes' }, METHODS);
  }

  const { data, error } = await admin.rpc('server_admin_supplier_acquisition_control_v1', {
    p_actor_id: auth.actor.id,
    p_supplier_id: supplierId,
    p_enabled: body.enabled,
    p_mode: mode,
    p_refresh_minutes: mode === 'scheduled' ? body.refreshMinutes : null,
    p_config_ref: configRef,
  });

  if (error) {
    const validation = /required|invalid|not found|approved|transport|acquisition/i.test(error.message);
    return jsonResponse(validation ? 400 : 500, {
      error: validation ? error.message : 'Unable to update supplier acquisition control',
    }, METHODS);
  }

  return jsonResponse(200, { ok: true, control: data }, METHODS);
};
