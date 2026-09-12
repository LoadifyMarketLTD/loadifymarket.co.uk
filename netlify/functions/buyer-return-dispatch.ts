import { createClient } from '@supabase/supabase-js';
import type { Handler } from '@netlify/functions';
import { authenticateActiveAccount } from './_shared/activeAccountAuth';
import { checkRateLimit } from './_shared/rateLimiter';

type Carrier = 'Royal Mail' | 'Evri';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  const supabaseUrl = process.env.VITE_SUPABASE_URL ?? '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!supabaseUrl || !serviceRoleKey) return { statusCode: 500, body: JSON.stringify({ error: 'Server misconfiguration' }) };
  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const auth = await authenticateActiveAccount(event, supabase, ['buyer', 'seller', 'admin']);
  if (!auth.ok) return { statusCode: auth.status, body: JSON.stringify({ error: 'Authentication required' }) };
  const rl = await checkRateLimit({ supabase, tableName: 'buyer_return_dispatch_rate_limits', identifier: auth.actor.id, windowMinutes: 60, maxAttempts: 20 });
  if (rl.exceeded) return { statusCode: 429, body: JSON.stringify({ error: 'Too many return updates' }) };
  let body: { returnId?: string; carrier?: Carrier; trackingNumber?: string };
  try { body = JSON.parse(event.body ?? '{}'); } catch { return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) }; }
  if (!body.returnId || !body.trackingNumber?.trim() || !['Royal Mail','Evri'].includes(body.carrier ?? '')) {
    return { statusCode: 400, body: JSON.stringify({ error: 'returnId, approved carrier and tracking number are required' }) };
  }
  const { data: row, error } = await supabase.from('returns').select('id,buyerId,sellerId,status').eq('id', body.returnId).maybeSingle<{id:string;buyerId:string;sellerId:string;status:string}>();
  if (error || !row) return { statusCode: 404, body: JSON.stringify({ error: 'Return not found' }) };
  if (row.buyerId !== auth.actor.id) return { statusCode: 403, body: JSON.stringify({ error: 'Not authorized for this return' }) };
  if (row.status !== 'awaiting_buyer_dispatch') return { statusCode: 409, body: JSON.stringify({ error: `Return cannot be dispatched from status '${row.status}'` }) };
  const now = new Date().toISOString();
  const { error: updateError } = await supabase.from('returns').update({ status: 'awaiting_seller_reception', buyerReturnCarrier: body.carrier, buyerTrackingNumber: body.trackingNumber.trim(), updatedAt: now }).eq('id', row.id).eq('status','awaiting_buyer_dispatch');
  if (updateError) return { statusCode: 500, body: JSON.stringify({ error: 'Failed to register return shipment' }) };
  await supabase.from('notifications').insert({ userId: row.sellerId, type: 'return', title: 'Return parcel dispatched', message: `Buyer dispatched the return via ${body.carrier}. Tracking: ${body.trackingNumber.trim()}`, link: '/seller/returns', isRead: false });
  return { statusCode: 200, body: JSON.stringify({ success: true, status: 'awaiting_seller_reception' }) };
};
