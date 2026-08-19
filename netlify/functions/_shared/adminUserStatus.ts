import type { SupabaseClient } from '@supabase/supabase-js';
import {
  deriveSellerStatus,
  isProfileComplete,
  type SellerProfileSnapshot,
} from './sellerActivation';

export const LONG_BAN_DURATION = '876000h';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type AdminUserStatusOperation = 'suspend' | 'reactivate';

interface PublicUserRow {
  id: string;
  role: string;
  isActive: boolean;
}

export type AdminUserStatusResult =
  | {
      ok: true;
      status: 200;
      body: {
        ok: true;
        userId: string;
        isActive: boolean;
        sellerStatus?: 'draft' | 'submitted' | 'active' | 'suspended';
      };
    }
  | {
      ok: false;
      status: 400 | 403 | 404 | 500 | 502;
      body: { error: string };
    };

interface ApplyAdminUserStatusOptions {
  requiredTargetRole?: string;
}

async function writeAdminAudit(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
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

/**
 * Canonical account-status mutation used by every admin surface.
 *
 * This function assumes the caller has already been authenticated as a live
 * admin. It owns the actual suspend/reactivate state transition so legacy admin
 * surfaces cannot bypass the Auth ban, public.users.isActive, seller state,
 * push-token cleanup or audit contract.
 */
export async function applyAdminUserStatus(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  callerId: string,
  op: AdminUserStatusOperation,
  userId: string,
  options: ApplyAdminUserStatusOptions = {},
): Promise<AdminUserStatusResult> {
  if (!UUID_RE.test(userId)) {
    return { ok: false, status: 400, body: { error: 'A valid userId is required' } };
  }
  if (op === 'suspend' && userId === callerId) {
    return { ok: false, status: 400, body: { error: 'You cannot suspend your own admin account' } };
  }

  const { data: target, error: targetError } = await supabase
    .from('users')
    .select('id, role, isActive')
    .eq('id', userId)
    .maybeSingle<PublicUserRow>();

  if (targetError) {
    console.error('admin-user-status: target lookup failed:', targetError.message);
    return { ok: false, status: 500, body: { error: 'Failed to load target account' } };
  }
  if (!target) {
    return { ok: false, status: 404, body: { error: 'User not found' } };
  }

  if (options.requiredTargetRole && target.role !== options.requiredTargetRole) {
    return {
      ok: false,
      status: 400,
      body: { error: `Target account must have role ${options.requiredTargetRole}` },
    };
  }

  // Standard admin tooling must not become an admin-recovery mechanism.
  if (target.role === 'admin') {
    return {
      ok: false,
      status: 403,
      body: { error: 'Admin account status must be managed through the protected recovery process' },
    };
  }

  if (op === 'suspend') {
    // Security first: revoke Auth before changing database state. A partial
    // database failure therefore leaves the account blocked, never silently open.
    const { error: banError } = await supabase.auth.admin.updateUserById(userId, {
      ban_duration: LONG_BAN_DURATION,
    });
    if (banError) {
      console.error('admin-user-status: Auth ban failed:', banError.message);
      return {
        ok: false,
        status: 502,
        body: { error: 'Account suspension could not be secured in authentication' },
      };
    }

    const { error: userError } = await supabase
      .from('users')
      .update({ isActive: false })
      .eq('id', userId);
    if (userError) {
      console.error('admin-user-status: users suspension write failed:', userError.message);
      return {
        ok: false,
        status: 500,
        body: { error: 'Account is blocked in authentication but database suspension requires retry' },
      };
    }

    if (target.role === 'seller') {
      const { error: sellerError } = await supabase
        .from('seller_profiles')
        .update({ sellerStatus: 'suspended' })
        .eq('userId', userId);
      if (sellerError) {
        console.error('admin-user-status: seller suspension sync failed:', sellerError.message);
        return {
          ok: false,
          status: 500,
          body: { error: 'Account is suspended but seller status synchronization requires retry' },
        };
      }
    }

    const { error: pushError } = await supabase
      .from('push_tokens')
      .update({ isActive: false })
      .eq('userId', userId)
      .eq('isActive', true);
    if (pushError) {
      console.error('admin-user-status: push token deactivation failed:', pushError.message);
      return {
        ok: false,
        status: 500,
        body: { error: 'Account is suspended but notification cleanup requires retry' },
      };
    }

    const auditError = await writeAdminAudit(
      supabase,
      callerId,
      'user_suspend',
      userId,
      target.role,
    );
    if (auditError) {
      console.error('admin-user-status: suspend audit failed:', auditError);
      return {
        ok: false,
        status: 500,
        body: { error: 'Account is suspended but audit persistence requires retry' },
      };
    }

    return {
      ok: true,
      status: 200,
      body: {
        ok: true,
        userId,
        isActive: false,
        ...(target.role === 'seller' ? { sellerStatus: 'suspended' as const } : {}),
      },
    };
  }

  // Unban while public.users remains inactive. Migration 608 keeps direct
  // PostgREST authority closed until the database activation succeeds.
  const { error: unbanError } = await supabase.auth.admin.updateUserById(userId, {
    ban_duration: 'none',
  });
  if (unbanError) {
    console.error('admin-user-status: Auth unban failed:', unbanError.message);
    return {
      ok: false,
      status: 502,
      body: { error: 'Account reactivation could not be secured in authentication' },
    };
  }

  const rebanBestEffort = async () => {
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      ban_duration: LONG_BAN_DURATION,
    });
    if (error) {
      console.error('admin-user-status: compensating Auth re-ban failed:', error.message);
    }
  };

  let sellerStatus: 'draft' | 'submitted' | 'active' | 'suspended' | undefined;

  if (target.role === 'seller') {
    const { data: profile, error: profileError } = await supabase
      .from('seller_profiles')
      .select(
        'userId, sellerStatus, storeName, businessName, contactPhone, businessAddress, stripeConnectStatus, sellerType, companyRegistrationNumber, vatNumber, isVatRegistered, requiresAdminApproval, isApproved',
      )
      .eq('userId', userId)
      .maybeSingle<SellerProfileSnapshot>();

    if (profileError || !profile) {
      await rebanBestEffort();
      console.error('admin-user-status: seller reactivation profile lookup failed:', profileError?.message);
      return {
        ok: false,
        status: 500,
        body: { error: 'Account reactivation failed safely and remains blocked' },
      };
    }

    // Suspension is sticky inside deriveSellerStatus by design. Admin reactivation
    // explicitly lifts that sticky state, then derives the seller's legitimate
    // current status from profile/Stripe/approval readiness instead of blindly
    // demoting every previously-active seller to `submitted`.
    const profileComplete = isProfileComplete(profile, profile.sellerType);
    sellerStatus = deriveSellerStatus(
      'submitted',
      profileComplete,
      profile.stripeConnectStatus === 'active',
      profile.requiresAdminApproval,
      profile.isApproved,
    );

    const { error: sellerError } = await supabase
      .from('seller_profiles')
      .update({ sellerStatus })
      .eq('userId', userId);
    if (sellerError) {
      await rebanBestEffort();
      console.error('admin-user-status: seller reactivation sync failed:', sellerError.message);
      return {
        ok: false,
        status: 500,
        body: { error: 'Account reactivation failed safely and remains blocked' },
      };
    }
  }

  const { error: userError } = await supabase
    .from('users')
    .update({ isActive: true })
    .eq('id', userId);
  if (userError) {
    if (target.role === 'seller') {
      const { error: restoreError } = await supabase
        .from('seller_profiles')
        .update({ sellerStatus: 'suspended' })
        .eq('userId', userId);
      if (restoreError) {
        console.error('admin-user-status: compensating seller re-suspension failed:', restoreError.message);
      }
    }
    await rebanBestEffort();
    console.error('admin-user-status: users reactivation write failed:', userError.message);
    return {
      ok: false,
      status: 500,
      body: { error: 'Account reactivation failed safely and remains blocked' },
    };
  }

  // Historical push tokens deliberately stay inactive. A successfully
  // authenticated device must register its current token through the #511 owner
  // reconciliation boundary.
  const auditError = await writeAdminAudit(
    supabase,
    callerId,
    'user_reactivate',
    userId,
    target.role,
  );
  if (auditError) {
    console.error('admin-user-status: reactivate audit failed:', auditError);
    return {
      ok: false,
      status: 500,
      body: { error: 'Account is active but audit persistence requires retry' },
    };
  }

  return {
    ok: true,
    status: 200,
    body: {
      ok: true,
      userId,
      isActive: true,
      ...(sellerStatus ? { sellerStatus } : {}),
    },
  };
}
