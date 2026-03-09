import type { Product } from '../types';

/**
 * Builds the URL for the /transport-quote page, prefilling relevant listing data
 * from the given product. Used on product cards and product detail pages.
 */
export function buildTransportQuoteUrl(product: Pick<Product, 'id' | 'title' | 'weight'> & {
  palletInfo?: { palletCount?: number } | null;
}): string {
  const params = new URLSearchParams();
  params.set('listing', product.id);
  params.set('title', product.title);
  if (product.palletInfo?.palletCount != null) {
    params.set('pallets', String(product.palletInfo.palletCount));
  }
  if (product.weight != null) {
    params.set('weight', String(product.weight));
  }
  return `/transport-quote?${params.toString()}`;
}
