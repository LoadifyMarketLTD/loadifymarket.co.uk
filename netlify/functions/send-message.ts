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
 *   - System messages (_t:"system") and offer JSON (_t:"offer") are NOT pushed
 *     here; they have dedicated push paths in offer-accept.ts / conversation-offer.ts.
 *   - This function is for plain-text messages sent by humans from the chat UI.
 */

import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { sendPushToUser } from './_shared/pushNotifications';

interface RequestBody {
  conversationId?: string;
  receiverId?: string;
  message?: string;
}

interface ConversationRow {
  id: string;
  user1Id: string;
  user2Id: string;
}

interface MessageRow {
  id: string;
  senderId: string;
  message: string;
  isRead: boolean;
  createdAt: string;
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

  // ── Verify caller is a conversation participant ─────────────────────────────
  const { data: conv, error: convError } = await supabase
    .from('conversations')
    .select('id, user1Id, user2Id')
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
  // Only for human plain-text messages.  System events (_t:"system") and offer
  // cards (_t:"offer") have their own dedicated push paths.
  const isStructuredJson = message.trim().startsWith('{');
  if (!isStructuredJson) {
    // Fetch sender name for the notification title.
    const { data: sender } = await supabase
      .from('users')
      .select('firstName, lastName, email')
      .eq('id', callerId)
      .maybeSingle<{ firstName: string | null; lastName: string | null; email: string }>();

    const senderName = sender
      ? ([sender.firstName, sender.lastName].filter(Boolean).join(' ') || sender.email)
      : 'New message';

    const preview = message.trim().length > 60
      ? message.trim().substring(0, 60) + '…'
      : message.trim();

    await sendPushToUser(supabase, receiverId, {
      title: senderName,
      body:  preview,
      data:  { type: 'new_message', conversationId },
    });
  }

  return {
    statusCode: 200,
    body: JSON.stringify(inserted),
  };
};
