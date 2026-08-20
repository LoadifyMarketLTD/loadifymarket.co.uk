export const MARKETPLACE_TAX_SNAPSHOT_VERSION = 1 as const;
export const MARKETPLACE_TAX_EVIDENCE_VERSION = 1 as const;
export const MARKETPLACE_SELLER_TAX_DECLARATION_VERSION = 1 as const;
export const MARKETPLACE_NON_VAT_TREATMENT = 'seller_non_vat_declared' as const;
export const MARKETPLACE_SELLER_TAX_DECLARATION_SOURCE = 'seller_profile_self_declaration_v1' as const;

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
  taxDeclarationVersion: number | null;
  taxDeclarationSource: string | null;
  taxDeclarationCapturedAt: string | null;
}

export interface MarketplaceTaxDecisionSnapshot {
  version: 1;
  jurisdiction: 'GB';
  destinationCountry: 'GB';
  treatment: typeof MARKETPLACE_NON_VAT_TREATMENT;
  sellerVatRegistered: false;
  sellerVatNumber: null;
  sellerTaxDeclarationVersion: 1;
  sellerTaxDeclarationSource: typeof MARKETPLACE_SELLER_TAX_DECLARATION_SOURCE;
  sellerTaxDeclarationCapturedAt: string;
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
        | 'TAX_SELLER_DECLARATION_INCOMPLETE'
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

export function hasExplicitSellerNonVatDeclaration(seller: MarketplaceTaxSellerEvidence): boolean {
  return seller.isVatRegistered === false
    && !seller.vatNumber?.trim()
    && seller.taxDeclarationVersion === MARKETPLACE_SELLER_TAX_DECLARATION_VERSION
    && seller.taxDeclarationSource === MARKETPLACE_SELLER_TAX_DECLARATION_SOURCE
    && Boolean(seller.taxDeclarationCapturedAt);
}

export function buildSellerNonVatProductEvidence(price: number) {
  const capturedAt = new Date().toISOString();
  return {
    priceExVat: price,
    vatRate: 0,
    taxTreatmentStatus: MARKETPLACE_NON_VAT_TREATMENT,
    taxTreatmentSource: 'seller_profile_non_vat_declaration_v1',
    taxEvidenceVersion: MARKETPLACE_TAX_EVIDENCE_VERSION,
    taxEvidenceCapturedAt: capturedAt,
  } as const;
}

/**
 * Narrow P1 marketplace tax boundary.
 * Only a GB-established seller with a current explicit non-VAT declaration,
 * physical product evidence derived from that declaration, and GB destination
 * can pass. Everything else fails closed for Gate B / the versioned tax engine.
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

  if (input.seller.taxDeclarationVersion !== MARKETPLACE_SELLER_TAX_DECLARATION_VERSION
      || input.seller.taxDeclarationSource !== MARKETPLACE_SELLER_TAX_DECLARATION_SOURCE
      || !input.seller.taxDeclarationCapturedAt) {
    return { ok: false, code: 'TAX_SELLER_DECLARATION_INCOMPLETE', message: 'This seller must confirm their current tax registration details before checkout can proceed.' };
  }

  if (input.seller.isVatRegistered !== false) {
    return { ok: false, code: 'TAX_SELLER_VAT_STATUS_UNSUPPORTED', message: 'This seller’s VAT treatment requires verification before payment can be accepted.' };
  }
  if (input.seller.vatNumber?.trim()) {
    return { ok: false, code: 'TAX_SELLER_VAT_CONFLICT', message: 'This seller’s VAT profile contains conflicting information and checkout is temporarily unavailable.' };
  }
  if (input.products.length === 0) {
    return { ok: false, code: 'TAX_PRODUCT_EVIDENCE_INCOMPLETE', message: 'Product tax evidence is missing. Checkout is temporarily unavailable.' };
  }

  for (const product of input.products) {
    if (product.listingContext !== 'product') {
      return { ok: false, code: 'TAX_SERVICE_UNSUPPORTED', message: 'Service tax treatment is not yet enabled for checkout.' };
    }
    const complete = product.taxTreatmentStatus === MARKETPLACE_NON_VAT_TREATMENT
      && product.taxEvidenceVersion === MARKETPLACE_TAX_EVIDENCE_VERSION
      && product.taxTreatmentSource === 'seller_profile_non_vat_declaration_v1'
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
      sellerTaxDeclarationVersion: MARKETPLACE_SELLER_TAX_DECLARATION_VERSION,
      sellerTaxDeclarationSource: MARKETPLACE_SELLER_TAX_DECLARATION_SOURCE,
      sellerTaxDeclarationCapturedAt: input.seller.taxDeclarationCapturedAt,
      reverseCharge: false,
      vatAmountPence: 0,
      evidenceSource: 'seller_profile_and_product_tax_evidence_v1',
      evidenceVersion: MARKETPLACE_TAX_EVIDENCE_VERSION,
    },
  };
}
