import type { Handler, HandlerResponse } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { authenticateActiveAccount } from './activeAccountAuth';
import {
  buildSellerNonVatProductEvidence,
  hasExplicitSellerNonVatDeclaration,
  isOutsideP1GreatBritainPostcode,
  normaliseMarketplaceCountry,
} from './marketplaceTax';

type CheckoutBody = {
  items?: Array<{ productId?: unknown }>;
};

type ProductTaxRow = {
  id: string;
  sellerId: string;
  price: number;
  priceExVat: number | null;
  vatRate: number | null;
  taxTreatmentStatus: string | null;
  taxTreatmentSource: string | null;
  taxEvidenceVersion: number | null;
  taxEvidenceCapturedAt: string | null;
  listingContext: string | null;
  isActive: boolean;
};

type SellerTaxRow = {
  country: string | null;
  isVatRegistered: boolean | null;
  vatNumber: string | null;
  businessAddress: Record<string, unknown> | null;
  taxDeclarationConfirmed: boolean | null;
  taxDeclarationVersion: number | null;
  taxDeclarationSource: string | null;
  taxDeclarationCapturedAt: string | null;
  taxCountry: string | null;
  taxPostcode: string | null;
  taxCountrySource: string | null;
  taxCountryCapturedAt: string | null;
};

function moneyEqual(a: number | null, b: number): boolean {
  return typeof a === 'number'
    && Number.isFinite(a)
    && Math.round(a * 100) === Math.round(b * 100);
}

export function hasCurrentSellerNonVatProductEvidence(product: ProductTaxRow): boolean {
  return product.taxTreatmentStatus === 'seller_non_vat_declared'
    && product.taxTreatmentSource === 'seller_profile_non_vat_declaration_v1'
    && product.taxEvidenceVersion === 1
    && Boolean(product.taxEvidenceCapturedAt)
    && product.vatRate === 0
    && moneyEqual(product.priceExVat, product.price);
}

function hasAuthoritativeGbTaxLocation(seller: SellerTaxRow): boolean {
  const postcode = seller.taxPostcode?.trim().toUpperCase() || null;
  return normaliseMarketplaceCountry(seller.taxCountry) === 'GB'
    && seller.taxCountrySource === 'stripe_connect_account_v1'
    && Boolean(seller.taxCountryCapturedAt)
    && Boolean(postcode)
    && !isOutsideP1GreatBritainPostcode(postcode);
}

async function repairRequestedProductEvidence(
  event: Parameters<Handler>[0],
): Promise<HandlerResponse | null> {
  if (event.httpMethod !== 'POST') return null;

  const supabaseUrl = process.env.VITE_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !serviceRoleKey) return null;

  let body: CheckoutBody;
  try {
    body = JSON.parse(event.body ?? '{}') as CheckoutBody;
  } catch {
    return null;
  }

  const productIds = Array.isArray(body.items)
    ? [...new Set(
        body.items
          .map((item) => (typeof item?.productId === 'string' ? item.productId.trim() : ''))
          .filter(Boolean),
      )]
    : [];

  if (productIds.length === 0) return null;

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Never permit an unauthenticated request to mutate listing tax evidence.
  // The wrapped checkout/payment handler remains the canonical response owner;
  // failed authentication is delegated to it unchanged.
  const auth = await authenticateActiveAccount(event, supabase);
  if (!auth.ok) return null;

  const { data: products, error: productError } = await supabase
    .from('products')
    .select('id, sellerId, price, priceExVat, vatRate, taxTreatmentStatus, taxTreatmentSource, taxEvidenceVersion, taxEvidenceCapturedAt, listingContext, isActive')
    .in('id', productIds);

  if (productError || !products || products.length !== productIds.length) {
    // Let the canonical handler return its existing not-found/database response.
    return null;
  }

  const typedProducts = products as ProductTaxRow[];
  const sellerIds = [...new Set(typedProducts.map((product) => product.sellerId))];
  if (sellerIds.length !== 1) return null;
  const sellerId = sellerIds[0];

  const { data: seller, error: sellerError } = await supabase
    .from('seller_profiles')
    .select('country, isVatRegistered, vatNumber, businessAddress, taxDeclarationConfirmed, taxDeclarationVersion, taxDeclarationSource, taxDeclarationCapturedAt, taxCountry, taxPostcode, taxCountrySource, taxCountryCapturedAt')
    .eq('userId', sellerId)
    .maybeSingle<SellerTaxRow>();

  if (sellerError || !seller) return null;

  // Historical listings may predate the versioned P1 product-evidence columns.
  // Repair them only when both boundaries agree:
  // 1) Stripe-derived GB location evidence is authoritative, and
  // 2) the seller has an explicit current non-VAT self-declaration.
  if (
    normaliseMarketplaceCountry(seller.country) !== 'GB'
    || !hasAuthoritativeGbTaxLocation(seller)
    || !hasExplicitSellerNonVatDeclaration(seller)
  ) {
    return null;
  }

  for (const product of typedProducts) {
    if (product.listingContext !== 'product' || product.isActive !== true) continue;
    if (!Number.isFinite(product.price) || product.price <= 0) continue;
    if (hasCurrentSellerNonVatProductEvidence(product)) continue;

    const evidence = buildSellerNonVatProductEvidence(product.price);
    const { error: updateError } = await supabase
      .from('products')
      .update(evidence)
      .eq('id', product.id)
      .eq('sellerId', sellerId)
      .eq('listingContext', 'product')
      .eq('isActive', true);

    if (updateError) {
      console.error(
        'marketplaceTaxEvidenceRepair: failed to persist verified product evidence',
        product.id,
        updateError.message,
      );
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: 'Loadify could not prepare the verified tax evidence for this listing. Please try again.',
          code: 'TAX_PRODUCT_EVIDENCE_REPAIR_FAILED',
        }),
      };
    }
  }

  return null;
}

/**
 * Decorates the existing checkout/payment handler with a narrow historical-data
 * repair. It never invents seller tax status, never changes the customer-facing
 * price, and never broadens the P1 tax boundary. New/updated products already
 * materialise the same evidence in create-product/update-product; this only
 * brings older active physical listings to that canonical representation before
 * the authoritative checkout resolver re-reads them.
 */
export function withMarketplaceTaxEvidenceRepair(handler: Handler): Handler {
  return async (event, context) => {
    const repairFailure = await repairRequestedProductEvidence(event);
    if (repairFailure) return repairFailure;
    return handler(event, context);
  };
}
