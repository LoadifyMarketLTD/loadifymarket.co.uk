import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { expireStaleOffers } from './_shared/offerLifecycle';

interface RequestBody {
  conversationId?: string;
}

interface ConversationRow {
  id: string;
  user1Id: string;
  user2Id: string;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL ?? '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
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

  let body: RequestBody;
  try {
    body = JSON.parse(event.body ?? '{}') as RequestBody;
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const { conversationId } = body;

  if (conversationId) {
    const { data: conversation, error } = await supabase
      .from('conversations')
      .select('id, user1Id, user2Id')
      .eq('id', conversationId)
      .maybeSingle<ConversationRow>();

    if (error || !conversation) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Conversation not found' }) };
    }

    if (conversation.user1Id !== authUser.id && conversation.user2Id !== authUser.id) {
      return { statusCode: 403, body: JSON.stringify({ error: 'You are not a participant of this conversation' }) };
    }
  }

  const expiredOfferIds = await expireStaleOffers(supabase, { conversationId }).catch((error: unknown) => {
    console.error('offer-sync: expireStaleOffers failed:', error);
    throw error;
  });

  return {
    statusCode: 200,
    body: JSON.stringify({ expiredOfferIds, expiredCount: expiredOfferIds.length }),
  };
};
