import { Preferences } from '@capacitor/preferences';
import type { ProductImageAsset, SupportedProductImageMime } from '@/lib/productImageStorage';

export const SELLER_LISTING_DRAFT_VERSION = 1 as const;
const SELLER_LISTING_DRAFT_KEY_PREFIX = `loadify:seller-listing-draft:v${SELLER_LISTING_DRAFT_VERSION}`;
const SUPPORTED_IMAGE_TYPES = new Set<SupportedProductImageMime>(['image/jpeg', 'image/png', 'image/webp']);

export interface SellerListingDraftPayload {
  photos: ProductImageAsset[];
  title: string;
  price: string;
  description: string;
  categoryId: string;
  subcategoryId: string;
  condition: string;
  shippingMethodIds: string[];
  dispatchTime: string;
  moreDetailsOpen: boolean;
}

export interface SellerListingDraftRecord extends SellerListingDraftPayload {
  version: typeof SELLER_LISTING_DRAFT_VERSION;
  userId: string;
  updatedAt: string;
}

export function sellerListingDraftKey(userId: string): string {
  return `${SELLER_LISTING_DRAFT_KEY_PREFIX}:${userId}`;
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isProductImageAsset(value: unknown): value is ProductImageAsset {
  if (!value || typeof value !== 'object') return false;
  const image = value as Partial<ProductImageAsset>;
  return isString(image.url)
    && isString(image.path)
    && isString(image.contentType)
    && SUPPORTED_IMAGE_TYPES.has(image.contentType as SupportedProductImageMime);
}

export function parseSellerListingDraft(raw: string | null, expectedUserId: string): SellerListingDraftRecord | null {
  if (!raw) return null;

  try {
    const candidate = JSON.parse(raw) as Partial<SellerListingDraftRecord>;
    if (!candidate || typeof candidate !== 'object') return null;
    if (candidate.version !== SELLER_LISTING_DRAFT_VERSION) return null;
    if (candidate.userId !== expectedUserId) return null;
    if (!isString(candidate.updatedAt)) return null;
    if (!Array.isArray(candidate.photos) || !candidate.photos.every(isProductImageAsset)) return null;
    if (!Array.isArray(candidate.shippingMethodIds) || !candidate.shippingMethodIds.every(isString)) return null;
    if (!isString(candidate.title)
      || !isString(candidate.price)
      || !isString(candidate.description)
      || !isString(candidate.categoryId)
      || !isString(candidate.subcategoryId)
      || !isString(candidate.condition)
      || !isString(candidate.dispatchTime)
      || typeof candidate.moreDetailsOpen !== 'boolean') {
      return null;
    }

    return candidate as SellerListingDraftRecord;
  } catch {
    return null;
  }
}

export function isSellerListingDraftEmpty(payload: SellerListingDraftPayload): boolean {
  return payload.photos.length === 0
    && payload.title.trim() === ''
    && payload.price.trim() === ''
    && payload.description.trim() === ''
    && payload.categoryId === ''
    && payload.subcategoryId === ''
    && payload.condition === ''
    && payload.shippingMethodIds.length === 0
    && payload.dispatchTime.trim() === '';
}

export async function loadSellerListingDraft(userId: string): Promise<SellerListingDraftRecord | null> {
  const { value } = await Preferences.get({ key: sellerListingDraftKey(userId) });
  return parseSellerListingDraft(value, userId);
}

export async function saveSellerListingDraft(userId: string, payload: SellerListingDraftPayload): Promise<void> {
  if (isSellerListingDraftEmpty(payload)) {
    await clearSellerListingDraft(userId);
    return;
  }

  const record: SellerListingDraftRecord = {
    ...payload,
    version: SELLER_LISTING_DRAFT_VERSION,
    userId,
    updatedAt: new Date().toISOString(),
  };

  await Preferences.set({
    key: sellerListingDraftKey(userId),
    value: JSON.stringify(record),
  });
}

export async function clearSellerListingDraft(userId: string): Promise<void> {
  await Preferences.remove({ key: sellerListingDraftKey(userId) });
}
