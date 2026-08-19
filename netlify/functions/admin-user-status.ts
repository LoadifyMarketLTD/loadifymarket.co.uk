import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { authenticateActiveAccount } from './_shared/activeAccountAuth';
import {
  applyAdminUserStatus,
  type AdminUserStatusOperation,
} from './_shared/adminUserStatus';
import { jsonResponse, optionsResponse } from './_shared/http';
import { checkRateLimit } from './_shared/rateLimiter';

const METHODS = 'POST, OPTIONS';

interface RequestBody {
  op?: unknown;
  userId?: unknown;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return optionsResponse(METHODS);
  }
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' }, METHODS);
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(500, { error: 'Server configuration error' }, METHODS);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // A stale JWT is never sufficient for an administrative mutation. The shared
  // account guard re-reads public.users and requires a live active admin.
  const auth = await authenticateActiveAccount(event, supabase, ['admin']);
  if (!auth.ok) {
    return jsonResponse(
      auth.status,
      { error: auth.status === 401 ? 'Authentication required' : 'Admin access required' },
      METHODS,
    );
  }

  const rateLimit = await checkRateLimit({
    supabase,
    tableName: 'admin_sellers_rate_limits',
    identifier: auth.actor.id,
    windowMinutes: 1,
    maxAttempts: 30,
    policy: 'fail-closed',
  });
  if (rateLimit.exceeded) {
    return jsonResponse(429, { error: 'Too many admin actions. Please try again shortly.' }, METHODS);
  }

  let body: RequestBody;
  try {
    body = JSON.parse(event.body || '{}') as RequestBody;
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body' }, METHODS);
  }

  const op: AdminUserStatusOperation | null =
    body.op === 'suspend' || body.op === 'reactivate' ? body.op : null;
  const userId = typeof body.userId === 'string' ? body.userId.trim() : '';

  if (!op) {
    return jsonResponse(400, { error: 'op must be suspend or reactivate' }, METHODS);
  }

  const result = await applyAdminUserStatus(
    supabase,
    auth.actor.id,
    op,
    userId,
  );

  return jsonResponse(result.status, result.body, METHODS);
};
