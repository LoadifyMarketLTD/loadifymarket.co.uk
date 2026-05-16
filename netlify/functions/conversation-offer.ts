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
  await fetch(`${appUrl}/.netlify/functions/send-email`, {
    method: 'POST',
    headers: internalHeaders,
    body: JSON.stringify(payload),
  });
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

  // The proposer is the buyer (caller); recipient is the other participant (seller).
  const recipientId = conv.user1Id === callerId ? conv.user2Id : conv.user1Id;

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

  // ── Check for existing pending offer ───────────────────────────────────────
  const { data: existingOffer, error: existingOfferError } = await supabase
    .from('offers')
    .select('id')
    .eq('conversationId', conversationId)
    .eq('status', 'pending')
    .maybeSingle<{ id: string }>();

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

  if (existingOffer) {
    return {
      statusCode: 409,
      body: JSON.stringify({ error: 'There is already a pending offer in this conversation. Wait for the seller to respond before making another offer.' }),
    };
  }

  // ── Insert offer record ─────────────────────────────────────────────────────
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
      return await sendLegacyOfferMessage();
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

  // ── Insert chat display message ─────────────────────────────────────────────
  // This preserves backwards-compatibility: OfferBubble in MobileChatPage.tsx
  // reads the "_t":"offer" JSON to display an offer card.
  const displayMessage = JSON.stringify({
    _t:          'offer',
    offerId:     offer.id,
    amount_pence: amountPence,
    productTitle: listing.title,
  });

  await supabase
    .from('messages')
    .insert({
      conversationId,
      senderId:   callerId,
      receiverId: recipientId,
      message:    displayMessage,
    })
    .then(({ error }) => {
      if (error) console.warn('conversation-offer: display message insert failed (non-fatal):', error.message);
    });

  // ── Push notification to seller ─────────────────────────────────────────────
  const pounds = (amountPence / 100).toFixed(2);
  await sendPushToUser(supabase, recipientId, {
    title: 'New offer received',
    body:  `Someone offered £${pounds} for ${listing.title}`,
    data:  { type: 'offer_received', offerId: offer.id, conversationId },
  });

  // In-app notification in website account.
  await supabase
    .from('notifications')
    .insert({
      userId: recipientId,
      type: 'new_offer',
      title: 'New offer received',
      message: `Offer £${pounds} received for ${listing.title}`,
      link: `/inbox/${conversationId}`,
    })
    .then(({ error }) => {
      if (error) console.warn('conversation-offer: notifications insert failed (non-fatal):', error.message);
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
      void sendInternalEmail(appUrl, {
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
      }).catch((err) => console.warn('conversation-offer: seller email send failed (non-fatal):', err));
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ offerId: offer.id }),
  };
};
