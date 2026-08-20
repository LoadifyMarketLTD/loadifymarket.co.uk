export const MARKETPLACE_TAX_SNAPSHOT_VERSION = 1 as const;
export const MARKETPLACE_TAX_EVIDENCE_VERSION = 1 as const;
export const MARKETPLACE_NON_VAT_TREATMENT = 'seller_non_vat_declared' as const;

export interface MarketplaceTaxProductEvidence {
  id: string;
  price: number;
  priceExVat: number | null;
  vatRate: number | null;
  listingContext: string;
  taxTreatmentStatus: string | null;
  taxTreatmentSource: string | null;
  taxEvidenceVersion: number | null;
  taxEvidenceCapturedAt: string | null;
}

export interface MarketplaceTaxSellerEvidence {
  country: string | null;
  isVatRegistered: boolean | null;
  vatNumber: string | null;
  businessAddress: Record<string, unknown> | null;
}

export interface MarketplaceTaxDecisionSnapshot {
  version: 1;
  jurisdiction: 'GB';
  destinationCountry: 'GB';
  treatment: typeof MARKETPLACE_NON_VAT_TREATMENT;
  sellerVatRegistered: false;
  sellerVatNumber: null;
  reverseCharge: false;
  vatAmountPence: 0;
  evidenceSource: 'seller_profile_and_product_tax_evidence_v1';
  evidenceVersion: 1;
}

export type MarketplaceTaxDecision =
  | { ok: true; snapshot: MarketplaceTaxDecisionSnapshot; applyReverseCharge: false; vatAmountPence: 0 }
  | {
      ok: false;
      code:
        | 'TAX_SELLER_COUNTRY_UNSUPPORTED'
        | 'TAX_DESTINATION_UNSUPPORTED'
        | 'TAX_SELLER_VAT_STATUS_UNSUPPORTED'
        | 'TAX_SELLER_VAT_CONFLICT'
        | 'TAX_SERVICE_UNSUPPORTED'
        | 'TAX_PRODUCT_EVIDENCE_INCOMPLETE';
      message: string;
    };

export function normaliseMarketplaceCountry(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const raw = value.trim().toUpperCase();
  if (!raw) return null;
  if (['GB', 'GBR', 'UK', 'UNITED KINGDOM', 'GREAT BRITAIN'].includes(raw)) return 'GB';
  return raw;
}

function addressCountry(address: Record<string, string> | undefined): string | null {
  if (!address) return null;
  return normaliseMarketplaceCountry(address.countryCode ?? address.country ?? address.country_code);
}

function moneyEqual(a: number, b: number): boolean {
  return Math.abs(Math.round(a * 100) - Math.round(b * 100)) === 0;
}

export function buildSellerNonVatProductEvidence(price: number) {
  return {
    priceExVat: price,
    vatRate: 0,
    taxTreatmentStatus: MARKETPLACE_NON_VAT_TREATMENT,
    taxTreatmentSource: 'seller_profile_non_vat_declaration_v1',
    taxEvidenceVersion: MARKETPLACE_TAX_EVIDENCE_VERSION,
    taxEvidenceCapturedAt: new Date().toISOString(),
  } as const;
}

/**
 * Narrow P1 tax boundary. The existing isVatRegistered profile field is the
 * seller self-declaration contract already exposed by Loadify. P1 supports only
 * GB sellers who declare they are not VAT registered, physical products with a
 * versioned matching product tax snapshot, and GB destinations. Other cases
 * fail closed until Gate B authorises the versioned tax engine.
 */
export function resolveMarketplaceTaxV1(input: {
  seller: MarketplaceTaxSellerEvidence;
  products: MarketplaceTaxProductEvidence[];
  shippingAddress?: Record<string, string>;
  billingAddress?: Record<string, string>;
}): MarketplaceTaxDecision {
  if (normaliseMarketplaceCountry(input.seller.country) !== 'GB') {
    return { ok: false, code: 'TAX_SELLER_COUNTRY_UNSUPPORTED', message: 'This seller’s tax location is not yet supported for checkout. Please try another listing or contact support.' };
  }
  const destination = addressCountry(input.shippingAddress) ?? addressCountry(input.billingAddress);
  if (destination !== 'GB') {
    return { ok: false, code: 'TAX_DESTINATION_UNSUPPORTED', message: 'This checkout currently supports UK delivery/billing destinations only while tax rules are being verified.' };
  }
  if (input.seller.isVatRegistered !== false) {
    return { ok: false, code: 'TAX_SELLER_VAT_STATUS_UNSUPPORTED', message: 'This seller’s VAT treatment requires verification before payment can be accepted.' };
  }
  if (input.seller.vatNumber?.trim()) {
    return { ok: false, code: 'TAX_SELLER_VAT_CONFLICT', message: 'This seller’s VAT profile contains conflicting information and checkout is temporarily unavailable.' };
  }
  if (!input.products.length) {
    return { ok: false, code: 'TAX_PRODUCT_EVIDENCE_INCOMPLETE', message: 'Product tax evidence is missing. Checkout is temporarily unavailable.' };
  }
  for (const product of input.products) {
    if (product.listingContext !== 'product') {
      return { ok: false, code: 'TAX_SERVICE_UNSUPPORTED', message: 'Service tax treatment is not yet enabled for checkout.' };
    }
    const complete = product.taxTreatmentStatus === MARKETPLACE_NON_VAT_TREATMENT
      && product.taxTreatmentSource === 'seller_profile_non_vat_declaration_v1'
      && product.taxEvidenceVersion === MARKETPLACE_TAX_EVIDENCE_VERSION
      && Boolean(product.taxEvidenceCapturedAt)
      && product.vatRate === 0
      && typeof product.priceExVat === 'number'
      && Number.isFinite(product.priceExVat)
      && moneyEqual(product.priceExVat, product.price);
    if (!complete) {
      return { ok: false, code: 'TAX_PRODUCT_EVIDENCE_INCOMPLETE', message: 'This listing’s tax treatment has not been verified for checkout yet.' };
    }
  }
  return {
    ok: true,
    applyReverseCharge: false,
    vatAmountPence: 0,
    snapshot: {
      version: MARKETPLACE_TAX_SNAPSHOT_VERSION,
      jurisdiction: 'GB',
      destinationCountry: 'GB',
      treatment: MARKETPLACE_NON_VAT_TREATMENT,
      sellerVatRegistered: false,
      sellerVatNumber: null,
      reverseCharge: false,
      vatAmountPence: 0,
      evidenceSource: 'seller_profile_and_product_tax_evidence_v1',
      evidenceVersion: MARKETPLACE_TAX_EVIDENCE_VERSION,
    },
  };
}
