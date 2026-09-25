import type { MarketCode } from './marketConfig';

export type MarketAddress = Record<string, unknown>;

export interface MarketAddressValidation {
  ok: boolean;
  market: MarketCode;
  countryCode: MarketCode | null;
  postalCode: string;
  errors: string[];
}

const GB_POSTCODE_RE = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;
const RO_POSTCODE_RE = /^\d{6}$/;

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function addressCountryCode(address: MarketAddress): MarketCode | null {
  const raw = text(address.countryCode || address.country_code || address.country).toUpperCase();
  if (raw === 'GB' || raw === 'UK' || raw === 'UNITED KINGDOM' || raw === 'GREAT BRITAIN') return 'GB';
  if (raw === 'RO' || raw === 'ROMANIA' || raw === 'ROMÂNIA') return 'RO';
  return null;
}

export function addressPostalCode(address: MarketAddress): string {
  return text(address.postal_code || address.postcode || address.postalCode || address.zip)
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function validateMarketAddress(
  address: MarketAddress,
  market: MarketCode,
): MarketAddressValidation {
  const errors: string[] = [];
  const countryCode = addressCountryCode(address);
  const postalCode = addressPostalCode(address);
  const line1 = text(address.line1 || address.address1 || address.addressLine1);
  const city = text(address.city || address.town || address.locality);

  if (!line1) errors.push('address_line1_required');
  if (!city) errors.push('city_required');
  if (!countryCode) errors.push('country_required');
  else if (countryCode !== market) errors.push('country_market_mismatch');

  if (!postalCode) {
    errors.push('postal_code_required');
  } else if (market === 'GB' && !GB_POSTCODE_RE.test(postalCode)) {
    errors.push('gb_postcode_invalid');
  } else if (market === 'RO' && !RO_POSTCODE_RE.test(postalCode)) {
    errors.push('ro_postcode_invalid');
  }

  return { ok: errors.length === 0, market, countryCode, postalCode, errors };
}

export function marketCountryName(market: MarketCode): string {
  return market === 'RO' ? 'Romania' : 'United Kingdom';
}
