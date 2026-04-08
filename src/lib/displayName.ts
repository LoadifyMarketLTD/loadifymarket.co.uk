import type { User } from '../types';

/** Minimal seller fields needed to resolve a display name. */
export interface SellerIdentity {
  storeName?: string | null;
  businessName?: string | null;
}

/**
 * Returns the best display name for a logged-in user.
 *
 * Priority:
 *  1. admin role → 'Loadify Market Admin'
 *  2. storeName   (seller accounts with a store)
 *  3. businessName (company seller/buyer accounts)
 *  4. firstName + lastName
 *  5. 'Account' as last resort
 *
 * Email is NEVER used as a visible identity.
 */
export function getDisplayName(
  user: User | null,
  sellerProfile?: SellerIdentity | null,
): string {
  if (!user) return 'Account';
  if (user.role === 'admin') return 'Loadify Market Admin';
  if (sellerProfile?.storeName) return sellerProfile.storeName;
  if (sellerProfile?.businessName) return sellerProfile.businessName;
  const fullName = [user.firstName, user.lastName].map(s => s?.trim() ?? '').filter(Boolean).join(' ');
  if (fullName) return fullName;
  return 'Account';
}
