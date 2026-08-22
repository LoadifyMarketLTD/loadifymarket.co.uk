export const SELLER_TYPES = ['individual', 'sole_trader', 'company'] as const;
export type SellerType = (typeof SELLER_TYPES)[number];

export function parseSellerType(value: unknown): SellerType | null {
  return typeof value === 'string' && (SELLER_TYPES as readonly string[]).includes(value)
    ? (value as SellerType)
    : null;
}

export function legacyAccountTypeForSellerType(type: SellerType): 'individual' | 'business' {
  return type === 'individual' ? 'individual' : 'business';
}

export function buildStoreSlug(storeName: string, userId: string): string {
  const base = storeName
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  const suffix = userId.replace(/-/g, '').slice(0, 8).toLowerCase();
  return `${base || 'store'}-${suffix}`;
}

export interface SellerOnboardingFacts {
  sellerType: string | null;
  profileComplete: boolean;
  storeName: string | null;
  productCount: number;
  sellerStatus: string | null;
  stripeConnectStatus: string | null;
  stripeChargesEnabled: boolean;
  stripePayoutsEnabled: boolean;
  requiresAdminApproval: boolean;
  isApproved: boolean;
}

export interface SellerOnboardingReadiness {
  sellerTypeReady: boolean;
  profileReady: boolean;
  storeReady: boolean;
  catalogueReady: boolean;
  setupComplete: boolean;
  stripeReady: boolean;
  adminReviewPending: boolean;
  sellerActive: boolean;
  nextStep: 1 | 2 | 3 | 4 | 5;
}

export function deriveSellerOnboardingReadiness(
  facts: SellerOnboardingFacts,
): SellerOnboardingReadiness {
  const sellerTypeReady = parseSellerType(facts.sellerType) !== null;
  const profileReady = facts.profileComplete;
  const storeReady = Boolean(facts.storeName?.trim());
  const catalogueReady = facts.productCount > 0;
  const setupComplete = sellerTypeReady && profileReady && storeReady && catalogueReady;
  const stripeReady =
    facts.stripeConnectStatus === 'active' &&
    facts.stripeChargesEnabled &&
    facts.stripePayoutsEnabled;
  const adminReviewPending =
    facts.requiresAdminApproval &&
    !facts.isApproved &&
    facts.sellerStatus !== 'active';
  const sellerActive = facts.sellerStatus === 'active';

  const nextStep: 1 | 2 | 3 | 4 | 5 = !sellerTypeReady
    ? 1
    : !profileReady
      ? 2
      : !storeReady
        ? 3
        : !catalogueReady
          ? 4
          : 5;

  return {
    sellerTypeReady,
    profileReady,
    storeReady,
    catalogueReady,
    setupComplete,
    stripeReady,
    adminReviewPending,
    sellerActive,
    nextStep,
  };
}
