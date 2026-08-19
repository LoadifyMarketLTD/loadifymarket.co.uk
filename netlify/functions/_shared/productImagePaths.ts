export const PRODUCT_IMAGES_BUCKET = 'product-images';

export function extractOwnedProductImagePath(
  rawUrl: string,
  supabaseUrl: string,
  sellerId: string,
): string | null {
  try {
    const url = new URL(rawUrl);
    const storageOrigin = new URL(supabaseUrl).origin;
    const publicPrefix = `/storage/v1/object/public/${PRODUCT_IMAGES_BUCKET}/`;
    if (url.origin !== storageOrigin || !url.pathname.startsWith(publicPrefix)) return null;

    const path = decodeURIComponent(url.pathname.slice(publicPrefix.length));
    return path.startsWith(`sellers/${sellerId}/`) ? path : null;
  } catch {
    return null;
  }
}
