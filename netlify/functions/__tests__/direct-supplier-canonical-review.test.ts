import { describe, expect, it } from 'vitest';
import type { DirectSupplierStagingCandidateV1 } from '../_shared/directSupplierFeedAdmission';
import { prepareDirectSupplierCanonicalReviewPackage } from '../_shared/directSupplierCanonicalReview';

const BATCH_DIGEST = 'a'.repeat(64);
const RECORD_DIGEST = 'b'.repeat(64);

function candidate(overrides: Partial<DirectSupplierStagingCandidateV1> = {}): DirectSupplierStagingCandidateV1 {
  return {
    supplierKey: 'uk-maker-001',
    sourceGeneratedAt: '2026-08-31T08:00:00.000Z',
    sourceTransport: 'json_api',
    externalProductRef: 'product-001',
    externalVariantRef: 'variant-001',
    sku: 'SKU-001',
    gtin: '05012345678901',
    title: 'Supplier Product Title',
    currency: 'GBP',
    amountMinor: 1299,
    stockQuantity: 8,
    warehouseCountry: 'GB',
    imageUrls: ['https://supplier.example.test/image-1.jpg'],
    attributes: {
      Colour: 'Blue',
      Material: 'Steel',
    },
    sourceRecordDigest: RECORD_DIGEST,
    ingestionState: 'staged_candidate',
    marketplaceListingAllowed: false,
    ...overrides,
  };
}

function prepare(accepted: DirectSupplierStagingCandidateV1[] = [candidate()]) {
  return prepareDirectSupplierCanonicalReviewPackage({
    supplierKey: 'uk-maker-001',
    sourceBatchDigest: BATCH_DIGEST,
    sourceGeneratedAt: '2026-08-31T08:00:00.000Z',
    sourceTransport: 'json_api',
    accepted,
    quarantined: [],
  });
}

describe('prepareDirectSupplierCanonicalReviewPackage', () => {
  it('prepares identity evidence without performing canonical writes or commercial activation', () => {
    const result = prepare();

    expect(result).toMatchObject({
      interfaceVersion: 1,
      supplierKey: 'uk-maker-001',
      acceptedCount: 1,
      quarantinedCount: 0,
      requiresAdminReview: true,
      canonicalImportBatchCreationPerformed: false,
      canonicalIdentityMutationPerformed: false,
      commercialActivationPerformed: false,
      capabilityPromotionPerformed: false,
      marketplaceListingPerformed: false,
    });

    expect(result.items[0]).toMatchObject({
      workingLabelProposal: 'Supplier Product Title',
      requiresAdminIdentityReview: true,
      canonicalIdentityWriteAllowed: false,
      marketplaceListingAllowed: false,
    });

    expect(result.items[0].identifierEvidence).toEqual([
      expect.objectContaining({
        identifierType: 'gtin',
        identifierNamespace: 'global',
        rawValue: '05012345678901',
        verificationStatus: 'observed',
      }),
      expect.objectContaining({
        identifierType: 'internal',
        identifierNamespace: 'direct-supplier:uk-maker-001',
        rawValue: 'SKU-001',
        normalizedValue: 'sku-001',
        verificationStatus: 'observed',
      }),
    ]);
  });

  it('keeps price and stock as review-only commercial observations rather than canonical identity facts', () => {
    const result = prepare();
    const item = result.items[0];

    expect(item.commercialObservation).toEqual({
      currency: 'GBP',
      amountMinor: 1299,
      stockQuantity: 8,
      warehouseCountry: 'GB',
      disposition: 'review_only',
      canonicalIdentityWriteAllowed: false,
      marketplaceListingAllowed: false,
    });

    const identityEvidence = JSON.stringify({
      workingLabelProposal: item.workingLabelProposal,
      identifierEvidence: item.identifierEvidence,
      attributeEvidence: item.attributeEvidence,
      assetEvidence: item.assetEvidence,
    });

    expect(identityEvidence).not.toContain('amountMinor');
    expect(identityEvidence).not.toContain('stockQuantity');
  });

  it('never upgrades supplier images to verified rights', () => {
    const result = prepare();

    expect(result.items[0].assetEvidence).toEqual([
      expect.objectContaining({
        assetType: 'image',
        rightsStatus: 'unknown',
        reviewRequired: true,
      }),
    ]);
  });

  it('keeps quarantined records out of canonical review items', () => {
    const result = prepareDirectSupplierCanonicalReviewPackage({
      supplierKey: 'uk-maker-001',
      sourceBatchDigest: BATCH_DIGEST,
      sourceGeneratedAt: '2026-08-31T08:00:00.000Z',
      sourceTransport: 'json_api',
      accepted: [candidate()],
      quarantined: [
        {
          index: 1,
          externalVariantRef: 'variant-bad',
          reasons: ['INVALID_IMAGE_URL'],
        },
      ],
    });

    expect(result.items).toHaveLength(1);
    expect(result.quarantined).toEqual([
      {
        index: 1,
        externalVariantRef: 'variant-bad',
        reasons: ['INVALID_IMAGE_URL'],
      },
    ]);
    expect(JSON.stringify(result.items)).not.toContain('variant-bad');
  });

  it('fails closed when an accepted record belongs to a different supplier or source batch', () => {
    expect(() => prepare([candidate({ supplierKey: 'other-supplier' })]))
      .toThrow('accepted candidate supplierKey must match review package supplierKey');

    expect(() => prepare([candidate({ sourceGeneratedAt: '2026-08-31T08:00:01.000Z' })]))
      .toThrow('accepted candidate sourceGeneratedAt must match review package sourceGeneratedAt');

    expect(() => prepare([candidate({ sourceTransport: 'csv' })]))
      .toThrow('accepted candidate sourceTransport must match review package sourceTransport');
  });

  it('fails closed for malformed evidence digests', () => {
    expect(() => prepare([candidate({ sourceRecordDigest: 'not-a-digest' })]))
      .toThrow('sourceRecordDigest must be a SHA-256 hex digest');

    expect(() => prepareDirectSupplierCanonicalReviewPackage({
      supplierKey: 'uk-maker-001',
      sourceBatchDigest: 'bad-digest',
      sourceGeneratedAt: '2026-08-31T08:00:00.000Z',
      sourceTransport: 'json_api',
      accepted: [candidate()],
      quarantined: [],
    })).toThrow('sourceBatchDigest must be a SHA-256 hex digest');
  });
});
