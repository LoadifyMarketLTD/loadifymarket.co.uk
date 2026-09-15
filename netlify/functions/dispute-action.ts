import { createClient } from '@supabase/supabase-js';
import type { Handler } from '@netlify/functions';
import { authenticateActiveAccount } from './_shared/activeAccountAuth';
import { jsonResponse, optionsResponse } from './_shared/http';
import { sendPushToUser } from './_shared/pushNotifications';

const METHODS = 'POST, OPTIONS';
interface RequestBody {
  disputeId?: string;
  action?: 'respond' | 'escalate';
  response?: string;
  evidence?: string[];
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return optionsResponse(METHODS);
  if (event.httpMethod !== 'POST') return jsonResponse(405, { error: 'Method not allowed' }, METHODS);
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const authorization = event.headers.authorization || event.headers.Authorization;
  if (!url || !serviceKey || !anonKey || !authorization) return jsonResponse(500, { error: 'Server configuration error' }, METHODS);

  const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const auth = await authenticateActiveAccount(event, admin);
  if (!auth.ok) return jsonResponse(auth.status, { error: 'Unauthorized' }, METHODS);
  let body: RequestBody;
  try { body = JSON.parse(event.body || '{}') as RequestBody; }
  catch { return jsonResponse(400, { error: 'Invalid JSON body' }, METHODS); }
  const disputeId = typeof body.disputeId === 'string' ? body.disputeId.trim() : '';
  if (!disputeId || !body.action || !['respond', 'escalate'].includes(body.action)) {
    return jsonResponse(400, { error: 'disputeId and a valid action are required' }, METHODS);
  }

  const { data: dispute } = await admin.from('disputes')
    .select('id, orderId, buyerId, sellerId, status')
    .eq('id', disputeId)
    .maybeSingle<{ id: string; orderId: string; buyerId: string; sellerId: string; status: string }>();
  if (!dispute) return jsonResponse(404, { error: 'Dispute not found' }, METHODS);

  const isRespond = body.action === 'respond';
  if (isRespond && dispute.sellerId !== auth.actor.id) return jsonResponse(403, { error: 'Only the seller can respond' }, METHODS);
  if (!isRespond && dispute.buyerId !== auth.actor.id) return jsonResponse(403, { error: 'Only the buyer can escalate' }, METHODS);
  if (isRespond && (!body.response || body.response.trim().length < 10)) {
    return jsonResponse(400, { error: 'Response must contain at least 10 characters' }, METHODS);
  }

  const caller = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: authorization } },
  });
  const rpc = isRespond
    ? await caller.rpc('respond_to_dispute', {
        p_dispute_id: dispute.id,
        p_response: body.response!.trim(),
        p_evidence: Array.isArray(body.evidence) ? body.evidence : [],
      })
    : await caller.rpc('escalate_dispute', { p_dispute_id: dispute.id });
  if (rpc.error) return jsonResponse(400, { error: rpc.error.message }, METHODS);

  const targetId = isRespond ? dispute.buyerId : dispute.sellerId;
  await sendPushToUser(admin, targetId, {
    title: isRespond ? 'Seller responded to dispute' : 'Dispute escalated',
    body: isRespond ? 'Open the Resolution Centre to review the response and evidence.' : 'The buyer escalated this case for formal review.',
    data: {
      path: `/orders?mode=${isRespond ? 'buy' : 'sell'}&orderId=${encodeURIComponent(dispute.orderId)}`,
      type: 'dispute',
      orderId: dispute.orderId,
    },
  });

  return jsonResponse(200, { ok: true, dispute: rpc.data }, METHODS);
};
