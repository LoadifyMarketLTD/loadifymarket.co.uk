/**
 * send-message
 *
 * Sends a plain-text chat message to a conversation participant and fires a
 * push notification to the receiver.
 *
 * Using a Netlify function (rather than a direct Supabase client insert) allows
 * the server to deliver a "new_message" push notification without requiring a
 * database trigger or a background job.
 *
 * Authentication: Bearer <supabase access token> (required)
 *
 * Body:
 *   { conversationId: string, receiverId: string, message: string }
 *
 * Returns the inserted message row:
 *   { id, senderId, message, isRead, createdAt }
 *
 * Notes:
 *   - Structured system messages are not pushed from here.
 *   - This function is for plain-text messages sent by humans from the chat UI.
 */

import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { sendPushToUser } from './_shared/pushNotifications';
import { checkRateLimit } from './_shared/rateLimiter';

interface RequestBody {
  conversationId?: string;
  receiverId?: string;
  message?: string;
}

interface ConversationRow {
  id: string;
  user1Id: string;
  user2Id: string;
  subject: string | null;
}

interface MessageRow {
  id: string;
  senderId: string;
  message: string;
  isRead: boolean;
  createdAt: string;
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

const EMAIL_PREVIEW_MAX_LEN = 120;

function safeMessagePreview(message: string): string {
  const compact = message.replace(/\s+/g, ' ').trim();
  if (compact.length <= EMAIL_PREVIEW_MAX_LEN) return compact;
  return compact.substring(0, EMAIL_PREVIEW_MAX_LEN) + '…';
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

  // ── Rate limiting — 60 messages per minute per user ────────────────────────
  const rl = await checkRateLimit({
    supabase,
    tableName:     'send_message_rate_limits',
    identifier:    callerId,
    windowMinutes: 1,
    maxAttempts:   60,
  });
  if (rl.exceeded) {
    return { statusCode: 429, body: JSON.stringify({ error: 'Too many messages. Please slow down.' }) };
  }

  // ── Parse body ──────────────────────────────────────────────────────────────
  let body: RequestBody;
  try {
    body = JSON.parse(event.body ?? '{}') as RequestBody;
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const { conversationId, receiverId, message } = body;

  if (!conversationId || typeof conversationId !== 'string') {
    return { statusCode: 400, body: JSON.stringify({ error: 'conversationId is required' }) };
  }
  if (!receiverId || typeof receiverId !== 'string') {
    return { statusCode: 400, body: JSON.stringify({ error: 'receiverId is required' }) };
  }
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return { statusCode: 400, body: JSON.stringify({ error: 'message is required' }) };
  }
  if (message.length > 4000) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Message is too long (max 4000 characters)' }) };
  }

  // Reject messages containing HTML tags to prevent stored XSS.
  // Structured system messages use a JSON envelope; plain-text human messages must never contain markup.
  if (/<[a-z!/?][^>]{0,2000}>/i.test(message)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Message must not contain HTML markup' }) };
  }

  // ── Verify caller is a conversation participant ─────────────────────────────
  const { data: conv, error: convError } = await supabase
    .from('conversations')
    .select('id, user1Id, user2Id, subject')
    .eq('id', conversationId)
    .maybeSingle<ConversationRow>();

  if (convError || !conv) {
    return { statusCode: 404, body: JSON.stringify({ error: 'Conversation not found' }) };
  }

  if (conv.user1Id !== callerId && conv.user2Id !== callerId) {
    return { statusCode: 403, body: JSON.stringify({ error: 'You are not a participant of this conversation' }) };
  }

  if (conv.user1Id !== receiverId && conv.user2Id !== receiverId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Receiver is not a participant of this conversation' }) };
  }

  // ── Insert the message ──────────────────────────────────────────────────────
  const { data: inserted, error: insertError } = await supabase
    .from('messages')
    .insert({
      conversationId,
      senderId:   callerId,
      receiverId,
      message:    message.trim(),
    })
    .select('id, senderId, message, isRead, createdAt')
    .single<MessageRow>();

  if (insertError || !inserted) {
    console.error('send-message: insert failed:', insertError?.message);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to send message' }) };
  }

  // ── Push notification to receiver ───────────────────────────────────────────
  // Only for human plain-text messages. Structured system events are ignored here.
  const isStructuredJson = message.trim().startsWith('{');
  if (!isStructuredJson) {
    // Fetch sender name for the notification title.
    const { data: sender } = await supabase
      .from('users')
      .select('id, firstName, lastName, email, role')
      .eq('id', callerId)
      .maybeSingle<UserProfileRow>();

    const { data: receiver } = await supabase
      .from('users')
      .select('id, firstName, lastName, email, role')
      .eq('id', receiverId)
      .maybeSingle<UserProfileRow>();

    const senderName = sender
      ? ([sender.firstName, sender.lastName].filter(Boolean).join(' ') || sender.email)
      : 'New message';

    const preview = message.trim().length > 60
      ? message.trim().substring(0, 60) + '…'
      : message.trim();

    await sendPushToUser(supabase, receiverId, {
      title: senderName,
      body:  preview,
      data:  { type: 'new_message', conversationId, path: `/inbox/${conversationId}` },
    });

    // In-app notification in website account.
    await supabase
      .from('notifications')
      .insert({
        userId: receiverId,
        type: 'message',
        title: `New message from ${senderName}`,
        message: preview,
        link: `/inbox/${conversationId}`,
      })
      .then(({ error }) => {
        if (error) console.warn('send-message: notifications insert failed (non-fatal):', error.message);
      });

    // Transactional email for sellers (opt-in gate via notification_settings.orderConfirmation).
    if (receiver?.role === 'seller' && receiver.email) {
      let allowEmail = true;
      const { data: settings } = await supabase
        .from('notification_settings')
        .select('orderConfirmation')
        .eq('userId', receiverId)
        .maybeSingle<NotificationSettingsRow>();
      if (settings && settings.orderConfirmation === false) {
        allowEmail = false;
      }

      if (allowEmail) {
        const receiverName = [receiver.firstName, receiver.lastName].filter(Boolean).join(' ') || receiver.email;
        const subjectListing = conv.subject ? ` · ${conv.subject}` : '';
        try {
          await sendInternalEmail(appUrl, {
            to: receiver.email,
            subject: `New message from ${senderName}${subjectListing}`,
            template: 'seller_new_message',
            data: {
              sellerName: receiverName,
              senderName,
              productTitle: conv.subject,
              messagePreview: safeMessagePreview(message),
              conversationId,
              inboxUrl: `${appUrl}/inbox/${conversationId}`,
            },
          });
        } catch (err) {
          console.warn('send-message: seller email send failed (non-fatal):', err);
        }
      }
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify(inserted),
  };
};
