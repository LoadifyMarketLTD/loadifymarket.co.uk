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

export type AccountCapability = 'buyer' | 'seller';

/**
 * Service-role capability lookup used only after a live public.users account has
 * been established. Capability rows are server-governed and revocation-aware.
 */
export async function hasActiveAccountCapability(
  admin: SupabaseClient,
  userId: string,
  capability: AccountCapability,
): Promise<boolean> {
  const { data, error } = await admin
    .from('account_capabilities')
    .select('capability, revoked_at')
    .eq('user_id', userId)
    .eq('capability', capability)
    .maybeSingle<{ capability: string; revoked_at: string | null }>();

  if (error) {
    console.warn('activeAccountAuth: capability lookup failed closed:', error.message);
    return false;
  }
  return data?.capability === capability && data.revoked_at == null;
}

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

/**
 * Canonical ordinary-commerce guard. Admin is deliberately excluded even if a
 * stale capability row somehow exists: privileged platform authority must never
 * impersonate Buyer/Seller commerce authority.
 */
export async function authenticateActiveCapability(
  event: HandlerEvent,
  admin: SupabaseClient,
  capability: AccountCapability,
): Promise<ActiveAccountAuthResult> {
  const auth = await authenticateActiveAccount(event, admin);
  if (!auth.ok) return auth;
  if (auth.actor.role === 'admin') return { ok: false, status: 403 };
  if (!(await hasActiveAccountCapability(admin, auth.actor.id, capability))) {
    return { ok: false, status: 403 };
  }
  return auth;
}

/**
 * Seller-commerce guard for server boundaries that also permit explicit Admin
 * moderation/operations. Ordinary accounts must hold a live Seller capability;
 * Admin is allowed only as Admin, never by pretending to be a Seller.
 */
export async function authenticateSellerCapabilityOrAdmin(
  event: HandlerEvent,
  admin: SupabaseClient,
): Promise<ActiveAccountAuthResult> {
  const auth = await authenticateActiveAccount(event, admin);
  if (!auth.ok) return auth;
  if (auth.actor.role === 'admin') return auth;
  if (!(await hasActiveAccountCapability(admin, auth.actor.id, 'seller'))) {
    return { ok: false, status: 403 };
  }
  return auth;
}
