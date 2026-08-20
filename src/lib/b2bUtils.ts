/**
 * B2B Buyer Utilities
 *
 * B2B account classification is an account/customer fact. It is NOT, by
 * itself, sufficient evidence for a VAT reverse-charge decision.
 *
 * Marketplace tax treatment depends on the seller/supply route and other
 * transaction facts. Until that route is explicitly verified and versioned,
 * price helpers must preserve the seller-entered customer price unchanged.
 */

export interface BuyerB2BProfile {
  accountType?: string | null;
  companyName?: string | null;
  vatNumber?: string | null;
  isVatVerified?: boolean | null;
}

/**
 * Returns true if the buyer should be treated as a B2B account.
 * Rule: accountType is set AND is not 'individual'.
 */
export function isB2BBuyer(profile: BuyerB2BProfile): boolean {
  return Boolean(profile?.accountType) && profile.accountType !== 'individual';
}

/**
 * Generic buyer-only VAT reverse charge is deliberately disabled.
 *
 * A verified buyer VAT number is evidence about the buyer, not proof that the
 * current seller/supply route qualifies for reverse charge. The canonical
 * checkout/database boundary must decide tax treatment from the complete
 * transaction contract.
 */
export function applyVatReverseCharge(_profile: BuyerB2BProfile): boolean {
  return false;
}

/**
 * Preserve the seller-entered customer price. Tax must never be removed from a
 * price solely because the buyer account is B2B/VAT-verified.
 */
export function effectivePriceForBuyer(
  customerPrice: number,
  _profile: BuyerB2BProfile,
): number {
  return customerPrice;
}

/**
 * Buyer-facing generic price label. Do not assert 'inc VAT' or 'ex VAT' without
 * a verified transaction tax treatment.
 */
export function priceLabelForBuyer(
  customerPrice: number,
  _profile: BuyerB2BProfile,
): string {
  return customerPrice.toLocaleString('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
