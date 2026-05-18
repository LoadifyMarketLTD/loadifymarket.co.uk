import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { sendPushToUser } from './_shared/pushNotifications';
import { checkRateLimit } from './_shared/rateLimiter';
import { buildOfferLink, buildOfferPushData } from './_shared/offerLinks';
import { expireStaleOffers } from './_shared/offerLifecycle';

interface RequestBody {
  offerId?: string;
  amountPence?: number;
  message?: string;
}

interface OfferRow {
  id: string;
  conversationId: string;
  listingId: string;
  proposedById: string;
  recipientId: string;
  amountPence: number;
  status: string;
  expiresAt?: string | null;
}

interface ProductRow {
  id: string;
  title: string;
  sellerId: string;
  listingStatus: string;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const supabaseUrl = (process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '').trim();
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();
  if (!supabaseUrl || !serviceRoleKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Server misconfiguration' }) };
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const authHeader = event.headers.authorization ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Authentication required' }) };
  }

  const token = authHeader.substring(7);
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authUser) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Invalid authentication token' }) };
  }
  const callerId = authUser.id;

  const rl = await checkRateLimit({
    supabase,
    tableName: 'offer_counter_rate_limits',
    identifier: callerId,
    windowMinutes: 60,
    maxAttempts: 40,
  });
  if (rl.exceeded) {
    return { statusCode: 429, body: JSON.stringify({ error: 'Too many requests. Please try again later.' }) };
  }

  let body: RequestBody;
  try {
    body = JSON.parse(event.body ?? '{}') as RequestBody;
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const { offerId, amountPence } = body;
  const counterMessage = (body.message ?? '').trim();

  if (!offerId || typeof offerId !== 'string') {
    return { statusCode: 400, body: JSON.stringify({ error: 'offerId is required' }) };
  }
  if (typeof amountPence !== 'number' || !Number.isInteger(amountPence) || amountPence <= 0) {
    return { statusCode: 400, body: JSON.stringify({ error: 'amountPence must be a positive integer (pence)' }) };
  }
  if (amountPence > 9_999_900) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Offer cannot exceed £99,999' }) };
  }
  if (counterMessage.length > 500) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Counter message must be 500 characters or less' }) };
  }

  const { data: originalOffer, error: offerError } = await supabase
    .from('offers')
    .select('id, conversationId, listingId, proposedById, recipientId, amountPence, status, expiresAt')
    .eq('id', offerId)
    .maybeSingle<OfferRow>();

  if (offerError || !originalOffer) {
    return { statusCode: 404, body: JSON.stringify({ error: 'Offer not found' }) };
  }
  if (originalOffer.recipientId !== callerId) {
    return { statusCode: 403, body: JSON.stringify({ error: 'Only the offer recipient can send a counter offer' }) };
  }
  if (originalOffer.status === 'pending' && originalOffer.expiresAt && new Date(originalOffer.expiresAt).getTime() <= Date.now()) {
    await expireStaleOffers(supabase, { conversationId: originalOffer.conversationId }).catch((err: unknown) => {
      console.warn('offer-counter: expireStaleOffers failed (non-fatal):', err);
    });
    return { statusCode: 409, body: JSON.stringify({ error: 'Offer has already expired' }) };
  }
  if (originalOffer.status !== 'pending') {
    return { statusCode: 409, body: JSON.stringify({ error: `Offer cannot be countered (current status: ${originalOffer.status})` }) };
  }

  const { data: listing, error: listingError } = await supabase
    .from('products')
    .select('id, title, sellerId, listingStatus')
    .eq('id', originalOffer.listingId)
    .maybeSingle<ProductRow>();
  if (listingError || !listing) {
    return { statusCode: 404, body: JSON.stringify({ error: 'Listing not found' }) };
  }
  if (listing.listingStatus !== 'active') {
    return { statusCode: 409, body: JSON.stringify({ error: 'Listing is no longer available for offers' }) };
  }

  const { data: previousPending, error: updateError } = await supabase
    .from('offers')
    .update({ status: 'countered' })
    .eq('id', originalOffer.id)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle<{ id: string }>();
  if (updateError) {
    console.error('offer-counter: update original offer failed:', updateError.code, updateError.message, updateError.details, updateError.hint);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to update original offer' }) };
  }
  if (!previousPending) {
    return { statusCode: 409, body: JSON.stringify({ error: 'Offer is no longer pending' }) };
  }

  const recipientId = originalOffer.proposedById;

  const { data: counterOffer, error: counterInsertError } = await supabase
    .from('offers')
    .insert({
      conversationId: originalOffer.conversationId,
      listingId: originalOffer.listingId,
      proposedById: callerId,
      recipientId,
      amountPence,
      parentOfferId: originalOffer.id,
      status: 'pending',
    })
    .select('id')
    .single<{ id: string }>();
  if (counterInsertError || !counterOffer) {
    console.error('offer-counter: counter insert failed:', counterInsertError?.code, counterInsertError?.message, counterInsertError?.details, counterInsertError?.hint);
    await supabase
      .from('offers')
      .update({ status: 'pending' })
      .eq('id', originalOffer.id);
    if (counterInsertError?.code === '23505') {
      return { statusCode: 409, body: JSON.stringify({ error: 'There is already a pending offer in this conversation' }) };
    }
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to create counter offer' }) };
  }

  const displayMessage = JSON.stringify({
    _t: 'offer',
    offerId: counterOffer.id,
    amount_pence: amountPence,
    productTitle: listing.title,
    note: counterMessage || undefined,
    parentOfferId: originalOffer.id,
  });

  const { error: messageError } = await supabase
    .from('messages')
    .insert({
      conversationId: originalOffer.conversationId,
      senderId: callerId,
      receiverId: recipientId,
      message: displayMessage,
    });
  if (messageError) {
    console.error('offer-counter: message insert failed:', messageError.code, messageError.message, messageError.details, messageError.hint);
    await Promise.allSettled([
      supabase.from('offers').delete().eq('id', counterOffer.id),
      supabase.from('offers').update({ status: 'pending' }).eq('id', originalOffer.id),
    ]);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to create counter offer message' }) };
  }

  const pounds = (amountPence / 100).toFixed(2);
  const buyerId = listing.sellerId === recipientId ? callerId : recipientId;
  const sellerId = listing.sellerId;
  const link = buildOfferLink({
    conversationId: originalOffer.conversationId,
    offerId: counterOffer.id,
    listingId: originalOffer.listingId,
    buyerId,
    sellerId,
    amountPence,
    status: 'pending',
  });

  const { error: notificationError } = await supabase
    .from('notifications')
    .insert({
      userId: recipientId,
      type: 'offer_received',
      title: 'Counter offer received',
      message: `Counter offer £${pounds} received for ${listing.title}`,
      link,
    });
  if (notificationError) {
    await Promise.allSettled([
      supabase.from('messages').delete().eq('conversationId', originalOffer.conversationId).eq('message', displayMessage),
      supabase.from('offers').delete().eq('id', counterOffer.id),
      supabase.from('offers').update({ status: 'pending' }).eq('id', originalOffer.id),
    ]);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to notify recipient about counter offer' }) };
  }

  await sendPushToUser(supabase, recipientId, {
    title: 'Counter offer received',
    body: `Counter offer £${pounds} received for ${listing.title}`,
    data: {
      ...buildOfferPushData({
        conversationId: originalOffer.conversationId,
        offerId: counterOffer.id,
        listingId: originalOffer.listingId,
        buyerId,
        sellerId,
        amountPence,
        status: 'pending',
      }),
      type: 'offer_received',
    },
  });

  return {
    statusCode: 200,
    body: JSON.stringify({ offerId: counterOffer.id }),
  };
};
