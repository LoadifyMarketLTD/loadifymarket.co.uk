import type { User } from '../types';

/**
 * Returns true if the user has admin-level access (admin or owner role).
 * Mirrors the is_admin_or_owner() RLS helper in the database.
 */
export function hasAdminAccess(user: User | null | undefined): boolean {
  return user?.role === 'admin' || user?.role === 'owner';
}

/**
 * Returns true if the user has seller-level access (seller, admin, or owner role).
 * Mirrors the is_seller() RLS helper in the database.
 */
export function hasSellerAccess(user: User | null | undefined): boolean {
  return user?.role === 'seller' || user?.role === 'admin' || user?.role === 'owner';
}
