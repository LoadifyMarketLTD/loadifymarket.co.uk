import { createClient } from '@supabase/supabase-js';
import type { Handler } from '@netlify/functions';
import { authenticateActiveAccount } from './_shared/activeAccountAuth';
import { jsonResponse, optionsResponse } from './_shared/http';

const METHODS = 'POST, OPTIONS';
const ALLOWED_ACTIONS = new Set(['approve', 'complete', 'reject']);
const MAX_NOTES_LENGTH = 2000;

type AdminPayoutAction = {
  action?: 'approve' | 'complete' | 'reject';
  requestId?: string;
  notes?: string | null;
};

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return optionsResponse(METHODS);
  if (event.httpMethod !== 'POST') {
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

  let body: AdminPayoutAction;
  try {
    body = JSON.parse(event.body || '{}') as AdminPayoutAction;
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body' }, METHODS);
  }

  const action = typeof body.action === 'string' ? body.action.trim() : '';
  const requestId = typeof body.requestId === 'string' ? body.requestId.trim() : '';
  const notes = typeof body.notes === 'string' ? body.notes.trim() : null;

  if (!ALLOWED_ACTIONS.has(action)) {
    return jsonResponse(400, { error: 'Unsupported payout action' }, METHODS);
  }
  if (!requestId) {
    return jsonResponse(400, { error: 'requestId is required' }, METHODS);
  }
  if (notes && notes.length > MAX_NOTES_LENGTH) {
    return jsonResponse(400, { error: 'notes is too long' }, METHODS);
  }

  const { data, error } = await admin.rpc('server_admin_payout_action_v1', {
    p_actor_id: auth.actor.id,
    p_action: action,
    p_request_id: requestId,
    p_notes: action === 'reject' ? notes : null,
  });

  if (error) {
    console.error('admin-payout-action failed', {
      action,
      requestId,
      actorId: auth.actor.id,
      code: error.code,
    });
    return jsonResponse(
      409,
      { error: 'Payout action could not be completed for the current request state' },
      METHODS,
    );
  }

  return jsonResponse(200, { ok: true, result: data }, METHODS);
};
