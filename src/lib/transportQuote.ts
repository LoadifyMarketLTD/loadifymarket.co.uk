import type { Product } from '../types';

/**
 * Subset of Product fields consumed by the transport quote URL builder.
 * Extend the optional fields here rather than adding new overloads.
 */
export type TransportQuoteProduct = Pick<Product, 'id' | 'title' | 'weight'> & {
  palletInfo?: { palletCount?: number } | null;
  sellerId?: string;
  categoryId?: string;
  stockQuantity?: number;
  seller?: {
    businessName?: string;
    storeName?: string;
    location?: string;
    storeSlug?: string;
  } | null;
  logisticsInfo?: {
    pickupLocation?: string;
    deliveryLocation?: string;
  } | null;
};

/**
 * Builds the URL for the /transport-quote page, prefilling all available
 * listing and seller context so the receiving form is fully pre-populated.
 * Always appends source=loadify-market so requests can be attributed.
 */
export function buildTransportQuoteUrl(product: TransportQuoteProduct): string {
  const params = new URLSearchParams();

  // Core listing identity
  params.set('listing', product.id);
  params.set('title', product.title);

  // Pallet / weight
  if (product.palletInfo?.palletCount != null) {
    params.set('pallets', String(product.palletInfo.palletCount));
  }
  if (product.weight != null) {
    params.set('weight', String(product.weight));
  }

  // Category
  if (product.categoryId) {
    params.set('category', product.categoryId);
  }

  // Quantity available (used as a transport size signal)
  if (product.stockQuantity != null && product.stockQuantity > 0) {
    params.set('qty', String(product.stockQuantity));
  }

  // Seller context
  if (product.sellerId) {
    params.set('sellerId', product.sellerId);
  }
  const sellerDisplayName =
    product.seller?.businessName || product.seller?.storeName;
  if (sellerDisplayName) {
    params.set('sellerName', sellerDisplayName);
  }
  if (product.seller?.location) {
    params.set('pickup', product.seller.location);
  }

  // Pickup / delivery from logistics info (overrides seller location for pickup)
  if (product.logisticsInfo?.pickupLocation) {
    params.set('pickup', product.logisticsInfo.pickupLocation);
  }
  if (product.logisticsInfo?.deliveryLocation) {
    params.set('dropoff', product.logisticsInfo.deliveryLocation);
  }

  // Attribution
  params.set('source', 'loadify-market');

  return `/transport-quote?${params.toString()}`;
}

/**
 * Builds a structured deep-link URL into the XDrive Logistics app,
 * passing the same context as a query string so XDrive can pre-fill
 * its own request form.
 */
export function buildXDriveAppUrl(params: Record<string, string | undefined>): string {
  const base = 'https://app.xdrivelogistics.co.uk/';
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') qs.set(k, v);
  });
  const query = qs.toString();
  return query ? `${base}?${query}` : base;
}
