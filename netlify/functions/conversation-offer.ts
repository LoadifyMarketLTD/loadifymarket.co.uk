/**
 * conversation-offer
 *
 * Creates a real offer record in the `offers` table for an existing
 * conversation, replacing the previous approach of inserting a JSON-encoded
 * offer as a plain chat message.
 *
 * Also inserts a display message into `messages` so the offer appears in the
 * chat thread immediately (the message type "_t":"offer" is rendered as an
 * OfferBubble in MobileChatPage).
 *
 * Enforces:
 *   - JWT authentication (buyer must be a conversation participant)
 *   - Only one pending offer per conversation at a time
 *   - Listing must be active
 *   - Amount must be positive and ≤ £99,999
 *
 * Body: { conversationId: string, amountPence: number }
 * Returns: { offerId: string }
 */

import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { sendPushToUser } from './_shared/pushNotifications';
import { checkRateLimit } from './_shared/rateLimiter';
import { buildOfferLink, buildOfferPushData } from './_shared/offerLinks';
import { expireStaleOffers } from './_shared/offerLifecycle';

interface RequestBody {
  conversationId?: string;
  amountPence?: number;
}

interface ConversationRow {
  id: string;
  user1Id: string;
  user2Id: string;
  productId: string | null;
  subject: string | null;
}

interface ProductRow {
  id: string;
  title: string;
  sellerId: string;
  listingStatus: string;
  listingContext: string;
}

interface UserProfileRow {
  id: string;
  email: string;
  role: string;
  firstName: string | null;
  lastName: string | null;
}

interface NotificationSettingsRow {
  orderConfirmation: boolean;
}

function isOffersTableMissing(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  return error.code === '42P01' || error.code === 'PGRST205';
}

async function sendInternalEmail(appUrl: string, payload: Record<string, unknown>): Promise<void> {
  const internalHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(process.env.NETLIFY_INTERNAL_SECRET
      ? { 'x-internal-secret': process.env.NETLIFY_INTERNAL_SECRET }
      : {}),
  };
  const response = await fetch(`${appUrl}/.netlify/functions/send-email`, {
    method: 'POST',
    headers: internalHeaders,
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`send-email returned ${response.status}: ${await response.text()}`);
  }
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  // ── Environment guards ──────────────────────────────────────────────────────
  const supabaseUrl = process.env.VITE_SUPABASE_URL ?? '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!supabaseUrl || !serviceRoleKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Server misconfiguration' }) };
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  // ── Auth ────────────────────────────────────────────────────────────────────
  const authHeader = event.headers['authorization'] ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Authentication required' }) };
  }
  const token = authHeader.substring(7);
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authUser) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Invalid authentication token' }) };
  }
  const callerId = authUser.id;
  const appUrl = (process.env.URL || process.env.VITE_APP_URL || 'https://loadifymarket.co.uk').replace(/\/$/, '');

  // ── Rate limiting — 10 offers per hour per user ─────────────────────────────
  const rl = await checkRateLimit({
    supabase,
    tableName:     'conversation_offer_rate_limits',
    identifier:    callerId,
    windowMinutes: 60,
    maxAttempts:   10,
  });
  if (rl.exceeded) {
    return { statusCode: 429, body: JSON.stringify({ error: 'Too many offers. Please wait before making another offer.' }) };
  }

  // ── Parse body ──────────────────────────────────────────────────────────────
  let body: RequestBody;
  try {
    body = JSON.parse(event.body ?? '{}') as RequestBody;
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const { conversationId, amountPence } = body;

  if (!conversationId || typeof conversationId !== 'string') {
    return { statusCode: 400, body: JSON.stringify({ error: 'conversationId is required' }) };
  }
  if (typeof amountPence !== 'number' || !Number.isInteger(amountPence) || amountPence <= 0) {
    return { statusCode: 400, body: JSON.stringify({ error: 'amountPence must be a positive integer (pence)' }) };
  }
  if (amountPence > 9_999_900) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Offer cannot exceed £99,999' }) };
  }

  // ── Fetch and validate conversation ────────────────────────────────────────
  const { data: conv, error: convError } = await supabase
    .from('conversations')
    .select('id, user1Id, user2Id, productId, subject')
    .eq('id', conversationId)
    .maybeSingle<ConversationRow>();

  if (convError || !conv) {
    return { statusCode: 404, body: JSON.stringify({ error: 'Conversation not found' }) };
  }

  const isParticipant = conv.user1Id === callerId || conv.user2Id === callerId;
  if (!isParticipant) {
    return { statusCode: 403, body: JSON.stringify({ error: 'You are not a participant of this conversation' }) };
  }

  if (!conv.productId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'This conversation is not linked to a listing' }) };
  }

  // ── Validate listing ────────────────────────────────────────────────────────
  const { data: listing, error: listingError } = await supabase
    .from('products')
    .select('id, title, sellerId, listingStatus, listingContext')
    .eq('id', conv.productId)
    .maybeSingle<ProductRow>();

  if (listingError || !listing) {
    return { statusCode: 404, body: JSON.stringify({ error: 'Listing not found' }) };
  }

  if (listing.listingStatus !== 'active') {
    return { statusCode: 409, body: JSON.stringify({ error: 'This listing is no longer available for offers' }) };
  }

  if (listing.sellerId === callerId) {
    return { statusCode: 403, body: JSON.stringify({ error: 'Sellers cannot send offers on their own listing' }) };
  }

  if (conv.user1Id !== listing.sellerId && conv.user2Id !== listing.sellerId) {
    return { statusCode: 409, body: JSON.stringify({ error: 'Conversation is not linked to the listing seller' }) };
  }

  const recipientId = listing.sellerId;

  await expireStaleOffers(supabase, { conversationId }).catch((err: unknown) => {
    console.warn('conversation-offer: expireStaleOffers failed (non-fatal):', err);
  });

  // ── Check for existing pending offer ───────────────────────────────────────
  const { data: existingOffer, error: existingOfferError } = await supabase
    .from('offers')
    .select('id, amountPence')
    .eq('conversationId', conversationId)
    .eq('status', 'pending')
    .maybeSingle<{ id: string; amountPence: number }>();

  if (isOffersTableMissing(existingOfferError)) {
    return {
      statusCode: 503,
      body: JSON.stringify({
        error: 'Offers engine is not available in this environment. Apply migration 480_offers_engine.sql.',
      }),
    };
  }
  if (existingOfferError) {
    console.error('conversation-offer: pending offer check failed:', existingOfferError.message);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to create offer' }) };
  }

  // resolvedOffer: the offer row used for the message and notifications below.
  // isNewOffer: true only when we inserted a fresh offer row; guards rollback.
  let resolvedOffer: { id: string; amountPence: number } | null = null;
  let isNewOffer = false;

  if (existingOffer) {
    // Check whether this is an orphan: offer row exists but no display message
    // was ever written (e.g. the function timed out between the offer insert and
    // the message insert, or the message rollback itself failed).  If it is an
    // orphan the buyer cannot make progress, so we auto-recover by removing the
    // stale record and allowing a fresh attempt.
    const { data: orphanMessageRows } = await supabase
      .from('messages')
      .select('id')
      .eq('conversationId', conversationId)
      .like('message', `%${existingOffer.id}%`)
      .limit(1);

    const isOrphan = !orphanMessageRows || orphanMessageRows.length === 0;

    if (isOrphan) {
      console.warn(
        'conversation-offer: orphan pending offer detected (no matching message) – auto-cleaning:',
        existingOffer.id,
      );
      const { error: orphanDeleteError } = await supabase
        .from('offers')
        .delete()
        .eq('id', existingOffer.id);
      if (orphanDeleteError) {
        console.error(
          'conversation-offer: failed to delete orphan offer, blocking retry:',
          orphanDeleteError.message,
          '| orphanOfferId:',
          existingOffer.id,
        );
        return {
          statusCode: 409,
          body: JSON.stringify({ error: 'There is already a pending offer in this conversation. Wait for the seller to respond before making another offer.' }),
        };
      }
      // Orphan cleaned up – fall through to create the new offer below.
    } else {
      // Option A: A non-orphan pending offer already exists.
      // Instead of returning 409, re-surface the existing offer to the seller
      // by inserting a fresh message and notification.  This ensures the seller
      // is notified even if a previous notification was missed.
      console.info(
        'conversation-offer: pending offer already exists – re-notifying seller:',
        existingOffer.id,
      );
      resolvedOffer = existingOffer;
    }
  }

  // ── Insert offer record (only when no existing pending offer) ───────────────
  if (!resolvedOffer) {
    const { data: offer, error: offerError } = await supabase
      .from('offers')
      .insert({
        conversationId,
        listingId:    conv.productId,
        proposedById: callerId,
        recipientId,
        amountPence,
      })
      .select('id')
      .single<{ id: string }>();

    if (offerError || !offer) {
      console.error('conversation-offer: insert failed:', offerError?.message);
      if (isOffersTableMissing(offerError)) {
        return {
          statusCode: 503,
          body: JSON.stringify({
            error: 'Offers engine is not available in this environment. Apply migration 480_offers_engine.sql.',
          }),
        };
      }
      // Unique violation on one_pending_offer_per_conversation — race condition.
      if (offerError?.code === '23505') {
        return {
          statusCode: 409,
          body: JSON.stringify({ error: 'There is already a pending offer in this conversation.' }),
        };
      }
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to create offer' }) };
    }

    resolvedOffer = { id: offer.id, amountPence };
    isNewOffer = true;
  }

  // ── Insert chat display message ─────────────────────────────────────────────
  // This preserves backwards-compatibility: OfferBubble in MobileChatPage.tsx
  // reads the "_t":"offer" JSON to display an offer card.
  const displayMessage = JSON.stringify({
    _t:          'offer',
    offerId:     resolvedOffer.id,
    amount_pence: resolvedOffer.amountPence,
    productTitle: listing.title,
  });

  const { data: insertedMessage, error: displayMessageError } = await supabase
    .from('messages')
    .insert({
      conversationId,
      senderId:   callerId,
      receiverId: recipientId,
      message:    displayMessage,
    })
    .select('id')
    .single<{ id: string }>();

  if (displayMessageError || !insertedMessage) {
    console.error('conversation-offer: display message insert failed:', displayMessageError?.message);
    // Only roll back the offer row if we created it in this request.
    if (isNewOffer) {
      const { error: rollbackError } = await supabase
        .from('offers')
        .delete()
        .eq('id', resolvedOffer.id);
      if (rollbackError) {
        console.error(
          'conversation-offer: CRITICAL – rollback of offer after message failure failed.',
          'Orphan offer left in DB.',
          '| offerId:', resolvedOffer.id,
          '| conversationId:', conversationId,
          '| rollbackError:', rollbackError.message,
        );
      }
    }

    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to create offer chat message' }) };
  }

  // ── Push notification to seller ─────────────────────────────────────────────
  const pounds = (resolvedOffer.amountPence / 100).toFixed(2);
  const offerLink = buildOfferLink({
    conversationId,
    offerId: resolvedOffer.id,
    listingId: conv.productId,
    buyerId: callerId,
    sellerId: recipientId,
    amountPence: resolvedOffer.amountPence,
    status: 'pending',
  });
  const { error: notificationError } = await supabase
    .from('notifications')
    .insert({
      userId: recipientId,
      type: 'offer_received',
      title: 'New offer received',
      message: `Offer £${pounds} received for ${listing.title}`,
      link: offerLink,
    })
    .select('id')
    .single<{ id: string }>();

  if (notificationError) {
    console.error('conversation-offer: notifications insert failed:', notificationError.message);
    const rollbackTargets: Promise<{ error: { message: string } | null }>[] = [
      supabase
        .from('messages')
        .delete()
        .eq('id', insertedMessage.id),
    ];
    // Only roll back the offer row if we created it in this request.
    if (isNewOffer) {
      rollbackTargets.push(
        supabase
          .from('offers')
          .delete()
          .eq('id', resolvedOffer.id),
      );
    }
    const rollbackResults = await Promise.allSettled(rollbackTargets);
    rollbackResults.forEach((result, idx) => {
      if (result.status === 'rejected') {
        console.error(
          `conversation-offer: CRITICAL – rollback step ${idx} failed after notification failure.`,
          'Orphan record may remain.',
          '| offerId:', resolvedOffer!.id,
          '| messageId:', insertedMessage.id,
          '| conversationId:', conversationId,
        );
      } else if (result.value?.error) {
        console.error(
          `conversation-offer: CRITICAL – rollback step ${idx} DB error after notification failure.`,
          'Orphan record may remain.',
          '| offerId:', resolvedOffer!.id,
          '| messageId:', insertedMessage.id,
          '| error:', result.value.error.message,
        );
      }
    });

    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to create seller notification' }) };
  }

  await sendPushToUser(supabase, recipientId, {
    title: 'New offer received',
    body:  `Someone offered £${pounds} for ${listing.title}`,
    data:  {
      ...buildOfferPushData({
        conversationId,
        offerId: resolvedOffer.id,
        listingId: conv.productId,
        buyerId: callerId,
        sellerId: recipientId,
        amountPence: resolvedOffer.amountPence,
        status: 'pending',
      }),
      type: 'offer_received',
    },
  });

  // Transactional seller email notification (respects notification_settings.orderConfirmation).
  const [{ data: recipient }, { data: buyer }] = await Promise.all([
    supabase
      .from('users')
      .select('id, email, role, firstName, lastName')
      .eq('id', recipientId)
      .maybeSingle<UserProfileRow>(),
    supabase
      .from('users')
      .select('id, email, role, firstName, lastName')
      .eq('id', callerId)
      .maybeSingle<UserProfileRow>(),
  ]);

  if (recipient?.role === 'seller' && recipient.email) {
    let allowEmail = true;
    const { data: settings } = await supabase
      .from('notification_settings')
      .select('orderConfirmation')
      .eq('userId', recipientId)
      .maybeSingle<NotificationSettingsRow>();
    if (settings && settings.orderConfirmation === false) {
      allowEmail = false;
    }

    if (allowEmail) {
      const sellerName = [recipient.firstName, recipient.lastName].filter(Boolean).join(' ') || recipient.email;
      const buyerName = buyer
        ? ([buyer.firstName, buyer.lastName].filter(Boolean).join(' ') || buyer.email)
        : 'A buyer';
      try {
        await sendInternalEmail(appUrl, {
          to: recipient.email,
          subject: `New offer received for ${listing.title}`,
          template: 'seller_new_offer',
          data: {
            sellerName,
            buyerName,
            productTitle: listing.title,
            offerAmount: pounds,
            conversationId,
            inboxUrl: `${appUrl}/inbox/${conversationId}`,
          },
        });
      } catch (err) {
        console.warn('conversation-offer: seller email send failed (non-fatal):', err);
      }
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ offerId: resolvedOffer.id }),
  };
};
