import type { User } from '../types';

/**
 * Admin access is granted only after the profile has been hydrated from the
 * authoritative public.users row. App.tsx sets isAdmin=true from that DB role.
 * A user-editable auth user_metadata.role value can therefore never unlock the
 * admin UI during a profile-fetch fallback.
 */
export function hasAdminAccess(user: User | null | undefined): boolean {
  return user?.role === 'admin' && user?.isAdmin === true;
}

/**
 * Compatibility helper for Marketplace Seller context. During the Stage 2
 * capability migration, every Seller-capable account keeps users.role='seller'
 * as its default context, while DB authorization is moving to the server-governed
 * account_capabilities table.
 */
export function hasSellerAccess(user: User | null | undefined): boolean {
  return user?.role === 'seller';
}

/**
 * Full seller-workspace access still requires the canonical seller profile to
 * be active. Capability/role presence alone never unlocks the workspace.
 */
export function isActiveSellerAccess(user: User | null | undefined): boolean {
  return (
    user?.role === 'seller' &&
    user?.isActive === true &&
    user?.sellerStatus === 'active'
  );
}

/**
 * Ordinary Marketplace Sellers also retain Buyer capability under the same
 * identity. Admin stays isolated from normal commerce workspaces.
 *
 * The live database capability table is the authorization foundation; this UI
 * helper remains compatible with pre-migration sessions by deriving the same
 * Buyer+Seller relationship from the temporary users.role default context.
 */
export function hasBuyerAccess(user: User | null | undefined): boolean {
  return user?.role === 'buyer' || user?.role === 'seller';
}
