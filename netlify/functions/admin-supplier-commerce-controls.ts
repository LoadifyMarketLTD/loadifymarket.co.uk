import { createClient } from '@supabase/supabase-js';
import type { Handler } from '@netlify/functions';
import { authenticateActiveAccount } from './_shared/activeAccountAuth';
import { jsonResponse, optionsResponse } from './_shared/http';

const METHODS = 'GET, POST, OPTIONS';

interface ControlMutationBody {
  operation?: string;
  scopeType?: string;
  scopeRef?: string | null;
  enabled?: boolean;
  reason?: string;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return optionsResponse(METHODS);
  if (event.httpMethod !== 'GET' && event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' }, METHODS);
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(500, { error: 'Server configuration error' }, METHODS);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const auth = await authenticateActiveAccount(event, admin, ['admin']);
  if (!auth.ok) {
    return jsonResponse(auth.status, { error: 'Unauthorized' }, METHODS);
  }

  if (event.httpMethod === 'GET') {
    const { data, error } = await admin.rpc('server_list_supplier_commerce_controls_v1', {
      p_actor_id: auth.actor.id,
    });
    if (error) {
      console.error('admin-supplier-commerce-controls: list failed:', error.message);
      return jsonResponse(500, { error: 'Unable to load Supplier Commerce controls' }, METHODS);
    }
    return jsonResponse(200, data ?? { interfaceVersion: 1, controls: [] }, METHODS);
  }

  let body: ControlMutationBody;
  try {
    body = JSON.parse(event.body || '{}') as ControlMutationBody;
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body' }, METHODS);
  }

  const operation = typeof body.operation === 'string' ? body.operation.trim() : '';
  const scopeType = typeof body.scopeType === 'string' ? body.scopeType.trim() : '';
  const scopeRef = typeof body.scopeRef === 'string' ? body.scopeRef.trim() || null : null;
  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';

  if (!operation || !scopeType || typeof body.enabled !== 'boolean' || !reason) {
    return jsonResponse(400, {
      error: 'operation, scopeType, enabled and reason are required',
    }, METHODS);
  }

  const { data, error } = await admin.rpc('server_set_supplier_commerce_control_v1', {
    p_actor_id: auth.actor.id,
    p_operation: operation,
    p_scope_type: scopeType,
    p_scope_ref: scopeRef,
    p_enabled: body.enabled,
    p_reason: reason,
  });

  if (error) {
    const isValidation = error.code === '22023';
    const isForbidden = error.code === '42501';
    console.error('admin-supplier-commerce-controls: mutation failed:', error.message);
    return jsonResponse(
      isValidation ? 400 : isForbidden ? 403 : 500,
      { error: isValidation ? error.message : isForbidden ? 'Unauthorized' : 'Unable to update Supplier Commerce control' },
      METHODS,
    );
  }

  return jsonResponse(200, { ok: true, control: data }, METHODS);
};
