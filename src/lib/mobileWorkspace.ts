import type { User } from '@/types';
import { safeLocalStorage } from '@/lib/safeStorage';
import { hasAdminAccess, hasBuyerAccess, hasSellerAccess } from '@/lib/roleUtils';

export type MobileWorkspace = 'buying' | 'selling';
export const MOBILE_WORKSPACE_KEY = 'loadify:mobile-workspace';

function storageKey(userId: string): string {
  return `${MOBILE_WORKSPACE_KEY}:${userId}`;
}

export function getMobileWorkspace(user: User | null | undefined): MobileWorkspace {
  if (!user || hasAdminAccess(user)) return 'buying';
  const canBuy = hasBuyerAccess(user);
  const canSell = hasSellerAccess(user);
  if (canSell && !canBuy) return 'selling';
  const saved = safeLocalStorage.getItem(storageKey(user.id));
  return saved === 'selling' && canSell ? 'selling' : 'buying';
}

export function setMobileWorkspace(user: User | null | undefined, workspace: MobileWorkspace): MobileWorkspace {
  if (!user || hasAdminAccess(user)) return 'buying';
  const canBuy = hasBuyerAccess(user);
  const canSell = hasSellerAccess(user);
  const next = workspace === 'selling' && canSell ? 'selling' : canBuy ? 'buying' : 'selling';
  safeLocalStorage.setItem(storageKey(user.id), next);
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('loadify:mobile-workspace-change', { detail: { userId: user.id, workspace: next } }));
  return next;
}
