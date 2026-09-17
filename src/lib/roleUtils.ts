import type { AccountCapability, User } from '../types';

/**
 * Admin access is granted only after the profile has been hydrated from the
 * authoritative public.users row. App.tsx sets isAdmin=true from that DB role.
 * A user-editable auth user_metadata.role value can therefore never unlock the
 * admin UI during a profile-fetch fallback.
 */
export function hasAdminAccess(user: User | null | undefined): boolean {
  return user?.role === 'admin' && user?.isAdmin === true;
}

function explicitCapability(
  user: User | null | undefined,
  capability: AccountCapability,
): boolean | null {
  if (!user) return false;
  if (!Array.isArray(user.capabilities)) return null;
  return user.capabilities.includes(capability);
}

/**
 * Seller access is capability-first. The role fallback exists only for sessions
 * hydrated before the capability projection was added. An Admin is never treated
 * as a Seller merely because it is privileged.
 */
export function hasSellerAccess(user: User | null | undefined): boolean {
  if (hasAdminAccess(user)) return false;
  const explicit = explicitCapability(user, 'seller');
  if (explicit !== null) return explicit;
  return user?.role === 'seller';
}

/**
 * Full seller-workspace access still requires the canonical seller profile to
 * be active. Capability/role presence alone never unlocks the workspace.
 */
export function isActiveSellerAccess(user: User | null | undefined): boolean {
  return (
    hasSellerAccess(user) &&
    user?.isActive === true &&
    user?.sellerStatus === 'active'
  );
}

/**
 * Ordinary Marketplace Sellers retain Buyer capability under the same identity.
 * Trusted Admins may also use Buyer tools for their own purchases; admin authority
 * never grants Seller capability or ownership of another user's commerce data.
 *
 * The live database capability table is the authorization foundation; this UI
 * helper remains compatible with pre-migration sessions by deriving the same
 * Buyer+Seller relationship from the temporary users.role default context.
 */
export function hasBuyerAccess(user: User | null | undefined): boolean {
  if (hasAdminAccess(user)) return true;
  const explicit = explicitCapability(user, 'buyer');
  if (explicit !== null) return explicit;
  return user?.role === 'buyer' || user?.role === 'seller';
}
