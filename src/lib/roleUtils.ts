import type { User } from '../types';

/**
 * Returns true if the user has admin-level access.
 * Mirrors the is_admin() RLS helper in the database.
 * Admins bypass ALL restrictions on the platform.
 */
export function hasAdminAccess(user: User | null | undefined): boolean {
  return user?.role === 'admin';
}

/**
 * Returns true if the user has seller-level access (sellers only).
 * Mirrors the is_seller() RLS helper in the database.
 * Admins are NOT included here — they use hasAdminAccess() for their own bypass.
 */
export function hasSellerAccess(user: User | null | undefined): boolean {
  return user?.role === 'seller';
}
