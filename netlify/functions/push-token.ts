/**
 * push-token
 *
 * Registers or unregisters an Expo push token for the authenticated user.
 *
 * POST body:
 *   { op: 'register',   token: string, platform: 'ios' | 'android' | 'web' }
 *   { op: 'unregister', token: string }
 *
 * Authentication: Bearer <supabase access token> (required)
 *
 * On register  → upserts push_tokens (userId, token, platform, isActive=true)
 * On unregister → sets isActive=false for the matching (userId, token) row
 */

import { createClient } from '@supabase/supabase-js';
import type { Handler } from '@netlify/functions';
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

  // Supabase guard
  const supabaseUrl = process.env.VITE_SUPABASE_URL ?? '';
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Database configuration is missing' }) };
  }

  // Authentication — required for all operations
  const authHeader = event.headers['authorization'];
  if (!authHeader?.startsWith('Bearer ')) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Authentication required' }) };
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
  const token = authHeader.substring(7);
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Invalid authentication token' }) };
  }

  // ── Rate limiting — 10 registrations per hour per user ─────────────────────
  const rl = await checkRateLimit({
    supabase,
    tableName:     'push_token_rate_limits',
    identifier:    user.id,
    windowMinutes: 60,
    maxAttempts:   10,
  });
  if (rl.exceeded) {
    return { statusCode: 429, body: JSON.stringify({ error: 'Too many token registration requests. Please try again later.' }) };
  }

  // Parse body
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

    // Upsert: create or reactivate token row for this user+token combination.
    const { error } = await supabase
      .from('push_tokens')
      .upsert(
        { userId: user.id, token: body.token, platform, isActive: true },
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
      .eq('userId', user.id)
      .eq('token', body.token);

    if (error) {
      console.error('push-token unregister: update failed:', error.message);
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to unregister push token' }) };
    }

    return { statusCode: 200, body: JSON.stringify({ unregistered: true }) };
  }

  return { statusCode: 400, body: JSON.stringify({ error: 'op must be register or unregister' }) };
};
