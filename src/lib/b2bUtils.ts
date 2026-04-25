/**
 * B2B Buyer Utilities
 *
 * Provides the canonical rule for B2B buyer determination:
 *   A buyer is B2B if accountType !== 'individual'
 *
 * Used in checkout, invoice generation, and price display.
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
 * Returns true if VAT reverse charge applies.
 * Requires: isB2B AND isVatVerified.
 * When true → invoice shows 0% VAT and Stripe is charged the ex-VAT amount.
 */
export function applyVatReverseCharge(profile: BuyerB2BProfile): boolean {
  return isB2BBuyer(profile) && Boolean(profile?.isVatVerified);
}

/**
 * Returns the effective price a buyer is charged given a VAT-inclusive price.
 *   B2B with verified VAT → ex-VAT price (price / 1.20)
 *   All others            → original VAT-inclusive price
 */
export function effectivePriceForBuyer(
  vatInclusivePrice: number,
  profile: BuyerB2BProfile,
): number {
  if (applyVatReverseCharge(profile)) {
    return vatInclusivePrice / 1.2;
  }
  return vatInclusivePrice;
}

/**
 * Returns a formatted price label for display.
 *   B2B with verified VAT → "£X.XX ex VAT"
 *   Others                → "£X.XX inc VAT"
 */
export function priceLabelForBuyer(
  vatInclusivePrice: number,
  profile: BuyerB2BProfile,
): string {
  const effective = effectivePriceForBuyer(vatInclusivePrice, profile);
  const formatted = effective.toLocaleString('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return applyVatReverseCharge(profile) ? `${formatted} ex VAT` : `${formatted} inc VAT`;
}
