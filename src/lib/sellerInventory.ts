export interface SellerInventoryListing {
  listingContext?: string | null;
  stockQuantity?: number | null;
  isUnique?: boolean | null;
}

/**
 * Service listings are reusable and do not participate in inventory warnings.
 */
export function isSellerInventoryTracked(listing: SellerInventoryListing): boolean {
  return listing.listingContext !== "service";
}

/**
 * A unique / one-of-a-kind listing with one available unit is healthy by design.
 * It should only become an inventory problem once that unit is gone.
 */
export function isSellerLowStock(listing: SellerInventoryListing): boolean {
  if (!isSellerInventoryTracked(listing)) return false;
  if (listing.isUnique === true) return false;
  const quantity = listing.stockQuantity;
  return quantity != null && quantity > 0 && quantity <= 5;
}

export function isSellerOutOfStock(listing: SellerInventoryListing): boolean {
  if (!isSellerInventoryTracked(listing)) return false;
  const quantity = listing.stockQuantity;
  return quantity != null && quantity <= 0;
}
