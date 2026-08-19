import type { HandlerEvent } from '@netlify/functions';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getBearerToken } from './http';

export interface ActiveAccountActor {
  id: string;
  role: string;
  email: string | null;
  appMetadata: Record<string, unknown>;
}

export type ActiveAccountAuthResult =
  | { ok: true; actor: ActiveAccountActor }
  | { ok: false; status: 401 | 403 };

/**
 * Canonical guard for user-authenticated server functions that operate with a
 * service-role Supabase client. A valid JWT is necessary but is never sufficient:
 * authorization is always re-read from public.users and the account must be live.
 *
 * This closes the stale-access-token window after an account is suspended. RLS
 * cannot protect service-role operations, so every such boundary must establish
 * the current account state before touching protected data or performing a write.
 */
export async function authenticateActiveAccount(
  event: HandlerEvent,
  admin: SupabaseClient,
  allowedRoles?: readonly string[],
): Promise<ActiveAccountAuthResult> {
  const token = getBearerToken(event);
  if (!token) {
    return { ok: false, status: 401 };
  }

  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData?.user) {
    return { ok: false, status: 401 };
  }

  const { data: account, error: accountError } = await admin
    .from('users')
    .select('id, role, isActive')
    .eq('id', authData.user.id)
    .maybeSingle<{ id: string; role: string; isActive: boolean }>();

  if (accountError || !account || account.isActive !== true) {
    return { ok: false, status: 403 };
  }

  if (allowedRoles && !allowedRoles.includes(account.role)) {
    return { ok: false, status: 403 };
  }

  const email = typeof authData.user.email === 'string'
    ? authData.user.email.toLowerCase().trim() || null
    : null;

  return {
    ok: true,
    actor: {
      id: account.id,
      role: account.role,
      email,
      appMetadata: (authData.user.app_metadata as Record<string, unknown> | undefined) ?? {},
    },
  };
}
