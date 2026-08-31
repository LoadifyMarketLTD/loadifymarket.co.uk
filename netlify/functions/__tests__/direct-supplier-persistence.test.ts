import { describe, expect, it } from 'vitest';
import type { DirectSupplierFeedBatchV1 } from '../_shared/directSupplierContract';
import type { DirectSupplierFeedAdmissionResult } from '../_shared/directSupplierFeedAdmission';
import { computeDirectSupplierStagingBatchDigest } from '../_shared/directSupplierPersistence';

const batch: DirectSupplierFeedBatchV1 = {
  contractVersion: 1,
  supplierKey: 'uk-maker-001',
  generatedAt: '2026-08-30T23:30:00.000Z',
  transport: 'json_api',
  variants: [],
};

const admitted: Extract<DirectSupplierFeedAdmissionResult, { ok: true }> = {
  ok: true,
  batchErrors: [],
  accepted: [{
    supplierKey: 'uk-maker-001',
    sourceGeneratedAt: '2026-08-30T23:30:00.000Z',
    sourceTransport: 'json_api',
    externalProductRef: 'product-1',
    externalVariantRef: 'variant-1',
    sku: 'SKU-1',
    title: 'Example product',
    currency: 'GBP',
    amountMinor: 1299,
    stockQuantity: 5,
    warehouseCountry: 'GB',
    imageUrls: ['https://example.test/image.jpg'],
    attributes: { colour: 'blue' },
    sourceRecordDigest: 'a'.repeat(64),
    ingestionState: 'staged_candidate',
    marketplaceListingAllowed: false,
  }],
  quarantined: [{
    index: 1,
    externalVariantRef: 'variant-2',
    reasons: ['INVALID_IMAGE_URL'],
  }],
  commercialActivationPerformed: false,
  capabilityPromotionPerformed: false,
  marketplaceListingPerformed: false,
};

describe('Direct Supplier staging digest', () => {
  it('computes a deterministic PII-free batch digest from admitted metadata', () => {
    const first = computeDirectSupplierStagingBatchDigest({
      batch,
      accepted: admitted.accepted,
      quarantined: admitted.quarantined,
    });
    const second = computeDirectSupplierStagingBatchDigest({
      batch,
      accepted: admitted.accepted,
      quarantined: [{
        ...admitted.quarantined[0],
        reasons: [...admitted.quarantined[0].reasons].reverse(),
      }],
    });

    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(second).toBe(first);
  });
});
