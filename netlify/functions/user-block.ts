import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { authenticateActiveAccount } from './_shared/activeAccountAuth';
import { getUserBlockRelationship } from './_shared/userBlocks';

type BlockAction = 'status' | 'block' | 'unblock';

interface RequestBody {
  userId?: string;
  action?: BlockAction;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const auth = await authenticateActiveAccount(event, supabase);
  if (!auth.ok) {
    return {
      statusCode: auth.status,
      body: JSON.stringify({ error: auth.status === 401 ? 'Authentication required' : 'Account is suspended' }),
    };
  }

  let body: RequestBody;
  try {
    body = JSON.parse(event.body ?? '{}') as RequestBody;
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const targetUserId = body.userId;
  const action = body.action ?? 'status';
  if (!targetUserId || !UUID_RE.test(targetUserId)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'A valid userId is required' }) };
  }
  if (!['status', 'block', 'unblock'].includes(action)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Unsupported block action' }) };
  }
  if (targetUserId === auth.actor.id) {
    return { statusCode: 400, body: JSON.stringify({ error: 'You cannot block your own account' }) };
  }

  const relationship = await getUserBlockRelationship(supabase, auth.actor.id, targetUserId);
  if (!relationship.available) {
    return {
      statusCode: 503,
      body: JSON.stringify({ error: 'Blocking is not available until the required database migration is applied.' }),
    };
  }

  if (action === 'status') {
    return {
      statusCode: 200,
      body: JSON.stringify({
        available: true,
        blockedByMe: relationship.blockedByFirst,
        messagingBlocked: relationship.blocked,
      }),
    };
  }

  const { data: target, error: targetError } = await supabase
    .from('users')
    .select('id')
    .eq('id', targetUserId)
    .maybeSingle<{ id: string }>();
  if (targetError || !target) {
    return { statusCode: 404, body: JSON.stringify({ error: 'User not found' }) };
  }

  if (action === 'block') {
    const { error } = await supabase
      .from('user_blocks')
      .upsert(
        { blockerId: auth.actor.id, blockedId: targetUserId },
        { onConflict: 'blockerId,blockedId', ignoreDuplicates: true },
      );
    if (error) {
      console.error('user-block: block failed:', error.message);
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to block user' }) };
    }
  } else {
    const { error } = await supabase
      .from('user_blocks')
      .delete()
      .eq('blockerId', auth.actor.id)
      .eq('blockedId', targetUserId);
    if (error) {
      console.error('user-block: unblock failed:', error.message);
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to unblock user' }) };
    }
  }

  const updated = await getUserBlockRelationship(supabase, auth.actor.id, targetUserId);
  return {
    statusCode: 200,
    body: JSON.stringify({
      available: updated.available,
      blockedByMe: updated.blockedByFirst,
      messagingBlocked: updated.blocked,
    }),
  };
};
