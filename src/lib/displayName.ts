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
 *  1. storeName   (seller accounts)
 *  2. businessName (seller accounts)
 *  3. firstName + lastName
 *  4. email
 *  5. 'Account' as last resort
 */
export function getDisplayName(
  user: User | null,
  sellerProfile?: SellerIdentity | null,
): string {
  if (!user) return 'Account';
  if (sellerProfile?.storeName) return sellerProfile.storeName;
  if (sellerProfile?.businessName) return sellerProfile.businessName;
  const fullName = [user.firstName, user.lastName].map(s => s?.trim() ?? '').filter(Boolean).join(' ');
  if (fullName) return fullName;
  if (user.email) return user.email;
  return 'Account';
}
