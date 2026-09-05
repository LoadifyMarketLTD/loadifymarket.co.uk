export interface ProductIdentifiers {
  brand?: string;
  gtin?: string;
  mpn?: string;
  identifierExists: boolean;
}

function nonEmptyString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed || undefined;
}

function specificationString(
  specifications: Record<string, unknown> | null | undefined,
  keys: readonly string[],
): string | undefined {
  if (!specifications) return undefined;
  for (const key of keys) {
    const value = nonEmptyString(specifications[key]);
    if (value) return value;
  }
  return undefined;
}

/** Validate a GTIN-8/12/13/14 using the GS1 modulo-10 check digit. */
export function normaliseGtin(value: unknown): string | undefined {
  const raw = nonEmptyString(value);
  if (!raw) return undefined;
  const digits = raw.replace(/[\s-]/g, '');
  if (!/^\d+$/.test(digits) || ![8, 12, 13, 14].includes(digits.length)) return undefined;

  const checkDigit = Number(digits[digits.length - 1]);
  const body = digits.slice(0, -1);
  let sum = 0;
  let weight = 3;
  for (let index = body.length - 1; index >= 0; index -= 1) {
    sum += Number(body[index]) * weight;
    weight = weight === 3 ? 1 : 3;
  }
  const expected = (10 - (sum % 10)) % 10;
  return expected === checkDigit ? digits : undefined;
}

export function getProductIdentifiers(
  specifications: Record<string, unknown> | null | undefined,
): ProductIdentifiers {
  const brand = specificationString(specifications, ['brand']);
  const rawGtin = specificationString(specifications, ['gtin', 'ean']);
  const gtin = normaliseGtin(rawGtin);
  const mpn = specificationString(specifications, ['mpn']);

  // Merchant platforms treat brand/GTIN/MPN as identifier evidence. We only
  // forward values actually supplied by the listing, and invalid GTINs are
  // ignored rather than fabricated or normalised into a different identifier.
  return {
    ...(brand ? { brand } : {}),
    ...(gtin ? { gtin } : {}),
    ...(mpn ? { mpn } : {}),
    identifierExists: Boolean(brand || gtin || mpn),
  };
}

export function schemaItemCondition(condition?: string | null): string | undefined {
  switch ((condition ?? '').trim().toLowerCase()) {
    case 'new':
      return 'https://schema.org/NewCondition';
    case 'used':
      return 'https://schema.org/UsedCondition';
    case 'refurbished':
      return 'https://schema.org/RefurbishedCondition';
    default:
      return undefined;
  }
}

export function merchantCondition(condition?: string | null): 'new' | 'used' | 'refurbished' {
  switch ((condition ?? '').trim().toLowerCase()) {
    case 'used':
      return 'used';
    case 'refurbished':
      return 'refurbished';
    default:
      return 'new';
  }
}

export function productAggregateRating(
  rating: unknown,
  reviewCount: unknown,
): { '@type': 'AggregateRating'; ratingValue: number; reviewCount: number } | undefined {
  const ratingValue = Number(rating);
  const count = Number(reviewCount);
  if (!Number.isFinite(ratingValue) || ratingValue <= 0 || ratingValue > 5) return undefined;
  if (!Number.isInteger(count) || count <= 0) return undefined;
  return {
    '@type': 'AggregateRating',
    ratingValue,
    reviewCount: count,
  };
}
