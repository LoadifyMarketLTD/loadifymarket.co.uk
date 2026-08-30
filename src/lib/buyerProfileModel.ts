export type BuyerAccountType =
  | 'individual'
  | 'sole_trader'
  | 'limited_company'
  | 'partnership'
  | 'charity'
  | 'other';

export const BUYER_ACCOUNT_TYPES: ReadonlyArray<{
  value: BuyerAccountType;
  label: string;
}> = [
  { value: 'individual', label: 'Individual' },
  { value: 'sole_trader', label: 'Sole trader' },
  { value: 'limited_company', label: 'Limited company' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'charity', label: 'Charity / organisation' },
  { value: 'other', label: 'Other business / trader' },
];

export function isBuyerAccountType(value: unknown): value is BuyerAccountType {
  return BUYER_ACCOUNT_TYPES.some((option) => option.value === value);
}

export function isBusinessBuyerAccount(type: BuyerAccountType): boolean {
  return type !== 'individual';
}

/**
 * A sole trader can legally trade under their own personal name, so a separate
 * organisation/trading name is not universally required. Registered/organised
 * business forms do require a persisted organisation name in the current
 * Loadify buyer profile model.
 */
export function buyerAccountRequiresOrganisationName(
  type: BuyerAccountType,
): boolean {
  return ['limited_company', 'partnership', 'charity', 'other'].includes(type);
}

export interface BuyerProfileCompletenessInput {
  accountType: BuyerAccountType;
  firstName: string;
  lastName: string;
  shippingLine1: string;
  shippingCity: string;
  shippingPostcode: string;
  shippingCountry: string;
  companyName?: string | null;
}

/**
 * Canonical client-side readiness model for the editable Buyer profile.
 * Business-only fields never block an Individual profile.
 */
export function isBuyerProfileComplete(
  profile: BuyerProfileCompletenessInput,
): boolean {
  const personalAndAddressComplete = [
    profile.firstName,
    profile.lastName,
    profile.shippingLine1,
    profile.shippingCity,
    profile.shippingPostcode,
    profile.shippingCountry,
  ].every((value) => value.trim().length > 0);

  if (!personalAndAddressComplete) return false;

  if (buyerAccountRequiresOrganisationName(profile.accountType)) {
    return Boolean(profile.companyName?.trim());
  }

  return true;
}
