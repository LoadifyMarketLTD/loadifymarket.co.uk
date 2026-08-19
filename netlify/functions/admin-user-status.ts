import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { getBearerToken, jsonResponse, optionsResponse } from './_shared/http';
import { checkRateLimit } from './_shared/rateLimiter';

const METHODS = 'POST, OPTIONS';
const LONG_BAN_DURATION = '876000h';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type UserStatusOperation = 'suspend' | 'reactivate';

interface RequestBody {
  op?: unknown;
  userId?: unknown;
}

interface PublicUserRow {
  id: string;
  role: string;
  isActive: boolean;
}

async function writeAdminAudit(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  adminId: string,
  actionType: string,
  targetId: string,
  targetRole: string,
): Promise<string | null> {
  const { error } = await supabase.from('admin_actions').insert({
    adminId,
    actionType,
    targetType: 'user',
    targetId,
    metadata: { targetRole },
  });
  return error?.message ?? null;
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

  const token = getBearerToken(event);
  if (!token) {
    return jsonResponse(401, { error: 'Authentication required' }, METHODS);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Always validate against Supabase Auth. Banned callers are rejected by the
  // Auth service even if they still possess a pre-ban access token.
  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData?.user) {
    return jsonResponse(401, { error: 'Invalid or expired authentication' }, METHODS);
  }

  // public.users is the live authorization source of truth. Do not trust a
  // potentially stale app_metadata role claim for an admin operation.
  const { data: caller, error: callerError } = await supabase
    .from('users')
    .select('id, role, isActive')
    .eq('id', authData.user.id)
    .maybeSingle<PublicUserRow>();

  if (callerError || !caller || caller.role !== 'admin' || caller.isActive !== true) {
    return jsonResponse(403, { error: 'Admin access required' }, METHODS);
  }

  const rateLimit = await checkRateLimit({
    supabase,
    tableName: 'admin_sellers_rate_limits',
    identifier: caller.id,
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

  const op = body.op === 'suspend' || body.op === 'reactivate'
    ? body.op as UserStatusOperation
    : null;
  const userId = typeof body.userId === 'string' ? body.userId.trim() : '';

  if (!op) {
    return jsonResponse(400, { error: 'op must be suspend or reactivate' }, METHODS);
  }
  if (!UUID_RE.test(userId)) {
    return jsonResponse(400, { error: 'A valid userId is required' }, METHODS);
  }
  if (op === 'suspend' && userId === caller.id) {
    return jsonResponse(400, { error: 'You cannot suspend your own admin account' }, METHODS);
  }

  const { data: target, error: targetError } = await supabase
    .from('users')
    .select('id, role, isActive')
    .eq('id', userId)
    .maybeSingle<PublicUserRow>();

  if (targetError) {
    console.error('admin-user-status: target lookup failed:', targetError.message);
    return jsonResponse(500, { error: 'Failed to load target account' }, METHODS);
  }
  if (!target) {
    return jsonResponse(404, { error: 'User not found' }, METHODS);
  }

  // Standard Admin Users tooling must not become an admin-recovery mechanism.
  // With the current single-admin contract this also prevents accidental
  // lockout of the platform's administrative account.
  if (target.role === 'admin') {
    return jsonResponse(403, { error: 'Admin account status must be managed through the protected recovery process' }, METHODS);
  }

  if (op === 'suspend') {
    // Security first: ban Auth before changing database state. If a later write
    // fails, the account remains blocked rather than being silently re-opened.
    const { error: banError } = await supabase.auth.admin.updateUserById(userId, {
      ban_duration: LONG_BAN_DURATION,
    });
    if (banError) {
      console.error('admin-user-status: Auth ban failed:', banError.message);
      return jsonResponse(502, { error: 'Account suspension could not be secured in authentication' }, METHODS);
    }

    const { error: userError } = await supabase
      .from('users')
      .update({ isActive: false })
      .eq('id', userId);
    if (userError) {
      console.error('admin-user-status: users suspension write failed:', userError.message);
      return jsonResponse(500, { error: 'Account is blocked in authentication but database suspension requires retry' }, METHODS);
    }

    if (target.role === 'seller') {
      const { error: sellerError } = await supabase
        .from('seller_profiles')
        .update({ sellerStatus: 'suspended' })
        .eq('userId', userId);
      if (sellerError) {
        console.error('admin-user-status: seller suspension sync failed:', sellerError.message);
        return jsonResponse(500, { error: 'Account is suspended but seller status synchronization requires retry' }, METHODS);
      }
    }

    const { error: pushError } = await supabase
      .from('push_tokens')
      .update({ isActive: false })
      .eq('userId', userId)
      .eq('isActive', true);
    if (pushError) {
      console.error('admin-user-status: push token deactivation failed:', pushError.message);
      return jsonResponse(500, { error: 'Account is suspended but notification cleanup requires retry' }, METHODS);
    }

    const auditError = await writeAdminAudit(
      supabase,
      caller.id,
      'user_suspend',
      userId,
      target.role,
    );
    if (auditError) {
      console.error('admin-user-status: suspend audit failed:', auditError);
      return jsonResponse(500, { error: 'Account is suspended but audit persistence requires retry' }, METHODS);
    }

    return jsonResponse(200, { ok: true, userId, isActive: false }, METHODS);
  }

  // Reactivation starts by unbanning Auth while the database account remains
  // inactive. Migration 608 therefore keeps direct PostgREST access closed until
  // the database transition succeeds. If a DB step fails, re-ban as compensation.
  const { error: unbanError } = await supabase.auth.admin.updateUserById(userId, {
    ban_duration: 'none',
  });
  if (unbanError) {
    console.error('admin-user-status: Auth unban failed:', unbanError.message);
    return jsonResponse(502, { error: 'Account reactivation could not be secured in authentication' }, METHODS);
  }

  const rebanBestEffort = async () => {
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      ban_duration: LONG_BAN_DURATION,
    });
    if (error) {
      console.error('admin-user-status: compensating Auth re-ban failed:', error.message);
    }
  };

  if (target.role === 'seller') {
    const { error: sellerError } = await supabase
      .from('seller_profiles')
      .update({ sellerStatus: 'submitted' })
      .eq('userId', userId);
    if (sellerError) {
      await rebanBestEffort();
      console.error('admin-user-status: seller reactivation sync failed:', sellerError.message);
      return jsonResponse(500, { error: 'Account reactivation failed safely and remains blocked' }, METHODS);
    }
  }

  const { error: userError } = await supabase
    .from('users')
    .update({ isActive: true })
    .eq('id', userId);
  if (userError) {
    await rebanBestEffort();
    console.error('admin-user-status: users reactivation write failed:', userError.message);
    return jsonResponse(500, { error: 'Account reactivation failed safely and remains blocked' }, METHODS);
  }

  // Deliberately do not reactivate historical push tokens. A successfully
  // authenticated device must re-register its current token under the #511
  // ownership boundary.
  const auditError = await writeAdminAudit(
    supabase,
    caller.id,
    'user_reactivate',
    userId,
    target.role,
  );
  if (auditError) {
    // The account is already reactivated; record the operational inconsistency
    // explicitly instead of pretending the action was fully reconciled.
    console.error('admin-user-status: reactivate audit failed:', auditError);
    return jsonResponse(500, { error: 'Account is active but audit persistence requires retry' }, METHODS);
  }

  return jsonResponse(200, { ok: true, userId, isActive: true }, METHODS);
};
