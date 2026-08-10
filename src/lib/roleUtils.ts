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
 * Seller-role helper used for onboarding paths. Server endpoints remain the
 * authority for every mutation.
 */
export function hasSellerAccess(user: User | null | undefined): boolean {
  return user?.role === 'seller';
}

/**
 * Full seller-workspace access requires the canonical seller profile to be
 * active. Missing/draft/submitted status is never treated as active.
 */
export function isActiveSellerAccess(user: User | null | undefined): boolean {
  return (
    user?.role === 'seller' &&
    user?.isActive === true &&
    user?.sellerStatus === 'active'
  );
}

export function hasBuyerAccess(user: User | null | undefined): boolean {
  return user?.role === 'buyer';
}
