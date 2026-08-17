import { beforeEach, describe, expect, it, vi } from 'vitest';

const preferenceMocks = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
  remove: vi.fn(),
}));

vi.mock('@capacitor/preferences', () => ({
  Preferences: preferenceMocks,
}));

import {
  SELLER_LISTING_DRAFT_VERSION,
  clearSellerListingDraft,
  isSellerListingDraftEmpty,
  loadSellerListingDraft,
  parseSellerListingDraft,
  saveSellerListingDraft,
  sellerListingDraftKey,
  type SellerListingDraftPayload,
} from '@/lib/sellerListingDraft';

const payload: SellerListingDraftPayload = {
  photos: [
    {
      url: 'https://cdn.example.test/sellers/seller-1/photo.jpg',
      path: 'sellers/seller-1/photo.jpg',
      contentType: 'image/jpeg',
    },
  ],
  title: 'Saved title',
  price: '19.99',
  description: 'Saved description',
  categoryId: 'category-1',
  subcategoryId: 'subcategory-1',
  condition: 'new',
  shippingMethodIds: ['shipping-1'],
  dispatchTime: '1-2 working days',
  moreDetailsOpen: true,
};

describe('sellerListingDraft', () => {
  beforeEach(() => {
    preferenceMocks.get.mockReset();
    preferenceMocks.set.mockReset();
    preferenceMocks.remove.mockReset();
    preferenceMocks.set.mockResolvedValue(undefined);
    preferenceMocks.remove.mockResolvedValue(undefined);
  });

  it('uses a versioned user-scoped storage key', () => {
    expect(sellerListingDraftKey('seller-1')).toBe('loadify:seller-listing-draft:v1:seller-1');
  });

  it('saves only serializable listing state with version and user ownership', async () => {
    await saveSellerListingDraft('seller-1', payload);

    expect(preferenceMocks.set).toHaveBeenCalledTimes(1);
    const [{ key, value }] = preferenceMocks.set.mock.calls[0] as [{ key: string; value: string }];
    expect(key).toBe('loadify:seller-listing-draft:v1:seller-1');

    const stored = JSON.parse(value) as Record<string, unknown>;
    expect(stored).toMatchObject({
      ...payload,
      version: SELLER_LISTING_DRAFT_VERSION,
      userId: 'seller-1',
    });
    expect(stored.updatedAt).toEqual(expect.any(String));
    expect(value).not.toContain('blob:');
  });

  it('loads and validates a draft for the expected user', async () => {
    const stored = JSON.stringify({
      ...payload,
      version: SELLER_LISTING_DRAFT_VERSION,
      userId: 'seller-1',
      updatedAt: '2026-08-17T12:00:00.000Z',
    });
    preferenceMocks.get.mockResolvedValue({ value: stored });

    await expect(loadSellerListingDraft('seller-1')).resolves.toMatchObject(payload);
  });

  it('rejects malformed, wrong-user and unsupported-version drafts', () => {
    expect(parseSellerListingDraft('{broken', 'seller-1')).toBeNull();
    expect(parseSellerListingDraft(JSON.stringify({ ...payload, version: 1, userId: 'seller-2', updatedAt: 'now' }), 'seller-1')).toBeNull();
    expect(parseSellerListingDraft(JSON.stringify({ ...payload, version: 999, userId: 'seller-1', updatedAt: 'now' }), 'seller-1')).toBeNull();
  });

  it('rejects invalid persisted photo metadata rather than hydrating unsafe state', () => {
    const invalid = JSON.stringify({
      ...payload,
      photos: [{ url: 'https://cdn.example.test/photo.heic', path: 'sellers/seller-1/photo.heic', contentType: 'image/heic' }],
      version: 1,
      userId: 'seller-1',
      updatedAt: 'now',
    });
    expect(parseSellerListingDraft(invalid, 'seller-1')).toBeNull();
  });

  it('treats an untouched form as empty and removes storage instead of persisting noise', async () => {
    const empty: SellerListingDraftPayload = {
      photos: [],
      title: '',
      price: '',
      description: '',
      categoryId: '',
      subcategoryId: '',
      condition: '',
      shippingMethodIds: [],
      dispatchTime: '',
      moreDetailsOpen: false,
    };

    expect(isSellerListingDraftEmpty(empty)).toBe(true);
    await saveSellerListingDraft('seller-1', empty);
    expect(preferenceMocks.set).not.toHaveBeenCalled();
    expect(preferenceMocks.remove).toHaveBeenCalledWith({ key: 'loadify:seller-listing-draft:v1:seller-1' });
  });

  it('clears only the current seller draft key', async () => {
    await clearSellerListingDraft('seller-1');
    expect(preferenceMocks.remove).toHaveBeenCalledWith({ key: 'loadify:seller-listing-draft:v1:seller-1' });
  });
});
