import { createClient } from '@supabase/supabase-js';
import type { Handler } from '@netlify/functions';
import { authenticateActiveAccount } from './_shared/activeAccountAuth';
import { jsonResponse, optionsResponse } from './_shared/http';
import { sendPushToUser } from './_shared/pushNotifications';

const METHODS = 'POST, OPTIONS';
type ReturnAction = 'approve' | 'reject' | 'received';

interface RequestBody {
  returnId?: string;
  action?: ReturnAction;
}

const transition: Record<ReturnAction, { from: string; to: string }> = {
  approve: { from: 'requested', to: 'approved' },
  reject: { from: 'requested', to: 'rejected' },
  received: { from: 'approved', to: 'received' },
};

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return optionsResponse(METHODS);
  if (event.httpMethod !== 'POST') return jsonResponse(405, { error: 'Method not allowed' }, METHODS);

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return jsonResponse(500, { error: 'Server configuration error' }, METHODS);

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const auth = await authenticateActiveAccount(event, admin);
  if (!auth.ok) return jsonResponse(auth.status, { error: 'Unauthorized' }, METHODS);

  let body: RequestBody;
  try { body = JSON.parse(event.body || '{}') as RequestBody; }
  catch { return jsonResponse(400, { error: 'Invalid JSON body' }, METHODS); }

  const returnId = typeof body.returnId === 'string' ? body.returnId.trim() : '';
  const action = body.action;
  if (!returnId || !action || !(action in transition)) {
    return jsonResponse(400, { error: 'returnId and a valid action are required' }, METHODS);
  }

  const { data: current, error: readError } = await admin
    .from('returns')
    .select('id, orderId, buyerId, sellerId, status, buyerTrackingNumber')
    .eq('id', returnId)
    .maybeSingle<{ id: string; orderId: string; buyerId: string; sellerId: string; status: string; buyerTrackingNumber: string | null }>();
  if (readError || !current) return jsonResponse(404, { error: 'Return request not found' }, METHODS);
  if (current.sellerId !== auth.actor.id) return jsonResponse(403, { error: 'Only the order seller can perform this action' }, METHODS);

  const expected = transition[action];
  if (current.status !== expected.from) {
    return jsonResponse(409, { error: `Return is already ${current.status}; expected ${expected.from}` }, METHODS);
  }
  if (action === 'received' && !current.buyerTrackingNumber?.trim()) {
    return jsonResponse(409, { error: 'Buyer return tracking is required before confirming receipt' }, METHODS);
  }
  const { data: updated, error: updateError } = await admin
    .from('returns')
    .update({ status: expected.to })
    .eq('id', current.id)
    .eq('sellerId', auth.actor.id)
    .eq('status', expected.from)
    .select('*')
    .maybeSingle();
  if (updateError) return jsonResponse(400, { error: updateError.message }, METHODS);
  if (!updated) return jsonResponse(409, { error: 'Return changed while this action was being processed' }, METHODS);

  const buyerMessage = action === 'approve'
    ? 'Your return request was approved. Add return tracking in the Resolution Centre.'
    : action === 'reject'
      ? 'Your return request was rejected. Open the Resolution Centre for details.'
      : 'The seller confirmed receipt. Your refund is awaiting controlled processing.';
  await sendPushToUser(admin, current.buyerId, {
    title: action === 'received' ? 'Return received' : `Return ${expected.to}`,
    body: buyerMessage,
    data: { path: `/orders?mode=buy&orderId=${encodeURIComponent(current.orderId)}`, type: 'return', orderId: current.orderId },
  });

  return jsonResponse(200, { ok: true, return: updated }, METHODS);
};
