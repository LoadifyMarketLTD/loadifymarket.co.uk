/**
 * push-token
 *
 * Registers or unregisters a push token for the authenticated active user.
 */

import { createClient } from '@supabase/supabase-js';
import type { Handler } from '@netlify/functions';
import { authenticateActiveAccount } from './_shared/activeAccountAuth';
import { checkRateLimit } from './_shared/rateLimiter';

interface RegisterBody {
  op: 'register';
  token: string;
  platform: 'ios' | 'android' | 'web';
}

interface UnregisterBody {
  op: 'unregister';
  token: string;
}

type PushTokenBody = RegisterBody | UnregisterBody;

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL ?? '';
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Database configuration is missing' }) };
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const auth = await authenticateActiveAccount(event, supabase);
  if (!auth.ok) {
    return {
      statusCode: auth.status,
      body: JSON.stringify({ error: auth.status === 401 ? 'Authentication required' : 'Account is suspended' }),
    };
  }
  const userId = auth.actor.id;

  const rl = await checkRateLimit({
    supabase,
    tableName: 'push_token_rate_limits',
    identifier: userId,
    windowMinutes: 60,
    maxAttempts: 10,
  });
  if (rl.exceeded) {
    return { statusCode: 429, body: JSON.stringify({ error: 'Too many token registration requests. Please try again later.' }) };
  }

  let body: PushTokenBody;
  try {
    body = JSON.parse(event.body ?? '{}') as PushTokenBody;
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) };
  }

  if (!body?.token) {
    return { statusCode: 400, body: JSON.stringify({ error: 'token is required' }) };
  }

  if (body.op === 'register') {
    const platform = body.platform;
    if (!['ios', 'android', 'web'].includes(platform)) {
      return { statusCode: 400, body: JSON.stringify({ error: 'platform must be ios, android, or web' }) };
    }

    const { error: deactivateError } = await supabase
      .from('push_tokens')
      .update({ isActive: false })
      .eq('token', body.token)
      .neq('userId', userId)
      .eq('isActive', true);

    if (deactivateError) {
      console.error('push-token register: failed to deactivate prior token owner:', deactivateError.message);
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to register push token' }) };
    }

    const { error } = await supabase
      .from('push_tokens')
      .upsert(
        { userId, token: body.token, platform, isActive: true },
        { onConflict: 'userId,token' },
      );

    if (error) {
      console.error('push-token register: upsert failed:', error.message);
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to register push token' }) };
    }

    return { statusCode: 200, body: JSON.stringify({ registered: true }) };
  }

  if (body.op === 'unregister') {
    const { error } = await supabase
      .from('push_tokens')
      .update({ isActive: false })
      .eq('userId', userId)
      .eq('token', body.token);

    if (error) {
      console.error('push-token unregister: update failed:', error.message);
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to unregister push token' }) };
    }

    return { statusCode: 200, body: JSON.stringify({ unregistered: true }) };
  }

  return { statusCode: 400, body: JSON.stringify({ error: 'op must be register or unregister' }) };
};
