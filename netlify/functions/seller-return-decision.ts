import { createClient } from '@supabase/supabase-js';
import type { Handler } from '@netlify/functions';
import { authenticateActiveAccount } from './_shared/activeAccountAuth';
import { checkRateLimit } from './_shared/rateLimiter';

type Decision = 'approve' | 'reject';

type ReturnAddress = {
  recipientOrBusinessName?: string;
  line1?: string;
  line2?: string;
  city?: string;
  county?: string;
  postcode?: string;
  country?: string;
  countryCode?: string;
};

function isCompleteAddress(address: ReturnAddress | null | undefined): address is ReturnAddress {
  return Boolean(address?.line1?.trim() && address?.city?.trim() && address?.postcode?.trim() && (address?.countryCode?.trim() || address?.country?.trim()));
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL ?? '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!supabaseUrl || !serviceRoleKey) return { statusCode: 500, body: JSON.stringify({ error: 'Server misconfiguration' }) };
  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const auth = await authenticateActiveAccount(event, supabase, ['seller', 'admin']);
  if (!auth.ok) return { statusCode: auth.status, body: JSON.stringify({ error: auth.status === 401 ? 'Authentication required' : 'Seller account required' }) };

  const rl = await checkRateLimit({
    supabase,
    tableName: 'seller_return_decision_rate_limits',
    identifier: auth.actor.id,
    windowMinutes: 60,
    maxAttempts: 60,
  });
  if (rl.exceeded) return { statusCode: 429, body: JSON.stringify({ error: 'Too many return updates. Please try again later.' }) };

  let body: { returnId?: string; decision?: Decision };
  try { body = JSON.parse(event.body ?? '{}') as { returnId?: string; decision?: Decision }; }
  catch { return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) }; }

  if (!body.returnId || (body.decision !== 'approve' && body.decision !== 'reject')) {
    return { statusCode: 400, body: JSON.stringify({ error: 'returnId and a valid decision are required' }) };
  }

  const { data: returnRow, error: returnError } = await supabase
    .from('returns')
    .select('id, orderId, buyerId, sellerId, status')
    .eq('id', body.returnId)
    .maybeSingle<{ id: string; orderId: string; buyerId: string; sellerId: string; status: string }>();

  if (returnError) return { statusCode: 500, body: JSON.stringify({ error: 'Failed to load return request' }) };
  if (!returnRow) return { statusCode: 404, body: JSON.stringify({ error: 'Return request not found' }) };
  if (auth.actor.role !== 'admin' && returnRow.sellerId !== auth.actor.id) {
    return { statusCode: 403, body: JSON.stringify({ error: 'Not authorized for this return' }) };
  }
  if (returnRow.status !== 'requested') {
    return { statusCode: 409, body: JSON.stringify({ error: `Return cannot be decided from status '${returnRow.status}'` }) };
  }

  if (body.decision === 'reject') {
    const { error } = await supabase.from('returns').update({
      status: 'rejected', resolvedBy: auth.actor.id, resolvedAt: new Date().toISOString(),
    }).eq('id', returnRow.id).eq('status', 'requested');
    if (error) return { statusCode: 500, body: JSON.stringify({ error: 'Failed to reject return request' }) };
    return { statusCode: 200, body: JSON.stringify({ success: true, status: 'rejected' }) };
  }

  const { data: fulfilment, error: fulfilmentError } = await supabase
    .from('seller_fulfilment_profiles')
    .select('shippingOriginAddress, returnAddress, useShippingOriginAsReturn')
    .eq('sellerId', returnRow.sellerId)
    .maybeSingle<{ shippingOriginAddress: ReturnAddress | null; returnAddress: ReturnAddress | null; useShippingOriginAsReturn: boolean }>();

  if (fulfilmentError) return { statusCode: 500, body: JSON.stringify({ error: 'Failed to load seller return settings' }) };
  const selectedAddress = fulfilment?.useShippingOriginAsReturn ? fulfilment.shippingOriginAddress : fulfilment?.returnAddress;
  if (!isCompleteAddress(selectedAddress)) {
    return { statusCode: 409, body: JSON.stringify({ error: 'A complete seller return address is required before approving a physical return.' }) };
  }
  const now = new Date().toISOString();
  const { data: updated, error: updateError } = await supabase
    .from('returns')
    .update({
      status: 'awaiting_buyer_dispatch',
      returnAddressSnapshot: selectedAddress,
      resolvedBy: auth.actor.id,
      resolvedAt: now,
    })
    .eq('id', returnRow.id)
    .eq('status', 'requested')
    .select('id, status')
    .maybeSingle<{ id: string; status: string }>();

  if (updateError) return { statusCode: 500, body: JSON.stringify({ error: 'Failed to approve return request' }) };
  if (!updated) return { statusCode: 409, body: JSON.stringify({ error: 'Return state changed. Refresh and try again.' }) };

  await supabase.from('notifications').insert({
    userId: returnRow.buyerId,
    type: 'return',
    title: 'Return approved',
    message: 'Your return was approved. Open the order to view the seller return address and dispatch instructions.',
    link: '/buyer/orders',
  });

  return { statusCode: 200, body: JSON.stringify({ success: true, status: updated.status }) };
};
