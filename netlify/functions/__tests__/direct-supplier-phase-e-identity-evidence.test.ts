import { describe, expect, it } from 'vitest';
import type {
  DirectSupplierCanonicalReviewItemV1,
  DirectSupplierCanonicalReviewPackageV1,
} from '../_shared/directSupplierCanonicalReview';
import type { DirectSupplierFoundationBindingV1 } from '../_shared/directSupplierFoundationBinding';
import {
  DIRECT_SUPPLIER_PHASE_E_IDENTITY_HASH_SEMANTICS,
  computeDirectSupplierPhaseEIdentityEvidenceHash,
  prepareDirectSupplierPhaseECatalogCapturePlan,
} from '../_shared/directSupplierPhaseEIdentityEvidence';

const SUPPLIER_ID = '11111111-1111-4111-8111-111111111111';
const BATCH_DIGEST = 'a'.repeat(64);
const RECORD_DIGEST = 'b'.repeat(64);

function reviewItem(overrides: Partial<DirectSupplierCanonicalReviewItemV1> = {}): DirectSupplierCanonicalReviewItemV1 {
  return {
    supplierKey: 'uk-maker-001',
    sourceRecordDigest: RECORD_DIGEST,
    sourceRef: `direct-supplier-staging:uk-maker-001:${BATCH_DIGEST}:${RECORD_DIGEST}`,
    sourceObservedAt: '2026-08-31T10:00:00.000Z',
    externalProductRef: 'PROD-001',
    externalVariantRef: 'VAR-001',
    workingLabelProposal: 'Example Product',
    identifierEvidence: [
      {
        identifierType: 'gtin',
        identifierNamespace: 'global',
        rawValue: '05012345678901',
        normalizedValue: '05012345678901',
        verificationStatus: 'observed',
        evidenceSourceRef: 'source-ref',
        observedAt: '2026-08-31T10:00:00.000Z',
      },
      {
        identifierType: 'internal',
        identifierNamespace: 'direct-supplier:uk-maker-001',
        rawValue: 'SKU-001',
        normalizedValue: 'sku-001',
        verificationStatus: 'observed',
        evidenceSourceRef: 'source-ref',
        observedAt: '2026-08-31T10:00:00.000Z',
      },
    ],
    attributeEvidence: [
      {
        key: 'Size',
        value: 'Large',
        sourceRef: 'source-ref',
        sourceEvidenceHash: RECORD_DIGEST,
        reviewStatus: 'pending',
      },
      {
        key: 'Colour',
        value: 'Blue',
        sourceRef: 'source-ref',
        sourceEvidenceHash: RECORD_DIGEST,
        reviewStatus: 'pending',
      },
    ],
    assetEvidence: [
      {
        assetRef: 'https://supplier.example.test/image-1.jpg',
        assetType: 'image',
        sourceRef: 'source-ref',
        rightsStatus: 'unknown',
        reviewRequired: true,
      },
    ],
    commercialObservation: {
      currency: 'GBP',
      amountMinor: 2599,
      stockQuantity: 12,
      warehouseCountry: 'GB',
      disposition: 'review_only',
      canonicalIdentityWriteAllowed: false,
      marketplaceListingAllowed: false,
    },
    requiresAdminIdentityReview: true,
    canonicalIdentityWriteAllowed: false,
    marketplaceListingAllowed: false,
    ...overrides,
  };
}

function reviewPackage(item: DirectSupplierCanonicalReviewItemV1 = reviewItem()): DirectSupplierCanonicalReviewPackageV1 {
  return {
    interfaceVersion: 1,
    supplierKey: 'uk-maker-001',
    sourceBatchDigest: BATCH_DIGEST,
    sourceGeneratedAt: '2026-08-31T10:00:00.000Z',
    sourceTransport: 'json_feed',
    acceptedCount: 1,
    quarantinedCount: 0,
    items: [item],
    quarantined: [],
    requiresAdminReview: true,
    canonicalImportBatchCreationPerformed: false,
    canonicalIdentityMutationPerformed: false,
    commercialActivationPerformed: false,
    capabilityPromotionPerformed: false,
    marketplaceListingPerformed: false,
  };
}

function foundationBinding(overrides: Partial<DirectSupplierFoundationBindingV1> = {}): DirectSupplierFoundationBindingV1 {
  return {
    interfaceVersion: 1,
    supplierKey: 'uk-maker-001',
    supplierFound: true,
    supplierId: SUPPLIER_ID,
    lifecycleStatus: 'candidate',
    foundationReason: 'supplier_not_approved',
    identityCaptureAllowed: true,
    canonicalImportBatchCreationAllowed: false,
    supplierFoundationReady: false,
    foundationMutationPerformed: false,
    canonicalIdentityMutationPerformed: false,
    canonicalImportBatchCreationPerformed: false,
    commercialActivationPerformed: false,
    capabilityPromotionPerformed: false,
    marketplaceListingPerformed: false,
    ...overrides,
  };
}

describe('Direct Supplier Phase E identity evidence', () => {
  it('keeps the identity hash stable across commercial, warehouse, timestamp, source-ref and asset changes', () => {
    const original = reviewItem();
    const changed = reviewItem({
      sourceRecordDigest: 'c'.repeat(64),
      sourceRef: 'different-source-ref',
      sourceObservedAt: '2026-09-01T11:00:00.000Z',
      commercialObservation: {
        currency: 'EUR',
        amountMinor: 9999,
        stockQuantity: 0,
        warehouseCountry: 'FR',
        disposition: 'review_only',
        canonicalIdentityWriteAllowed: false,
        marketplaceListingAllowed: false,
      },
      assetEvidence: [
        {
          assetRef: 'https://supplier.example.test/replacement-image.jpg',
          assetType: 'image',
          sourceRef: 'different-source-ref',
          rightsStatus: 'unknown',
          reviewRequired: true,
        },
      ],
    });

    expect(computeDirectSupplierPhaseEIdentityEvidenceHash(changed))
      .toBe(computeDirectSupplierPhaseEIdentityEvidenceHash(original));
  });

  it('is insensitive to identifier and attribute ordering but changes when identity evidence changes', () => {
    const original = reviewItem();
    const reordered = reviewItem({
      identifierEvidence: [...original.identifierEvidence].reverse(),
      attributeEvidence: [...original.attributeEvidence].reverse(),
    });
    const changedIdentity = reviewItem({
      externalVariantRef: 'VAR-002',
    });

    const originalHash = computeDirectSupplierPhaseEIdentityEvidenceHash(original);
    expect(computeDirectSupplierPhaseEIdentityEvidenceHash(reordered)).toBe(originalHash);
    expect(computeDirectSupplierPhaseEIdentityEvidenceHash(changedIdentity)).not.toBe(originalHash);
    expect(originalHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('prepares existing Phase E catalog-item payloads without executing a mutation or leaking commercial observations', () => {
    const plan = prepareDirectSupplierPhaseECatalogCapturePlan({
      reviewPackage: reviewPackage(),
      foundationBinding: foundationBinding(),
    });

    expect(plan).toMatchObject({
      interfaceVersion: 1,
      supplierKey: 'uk-maker-001',
      captureAllowed: true,
      reason: 'identity_capture_ready',
      supplierId: SUPPLIER_ID,
      foundationMutationPerformed: false,
      canonicalIdentityMutationPerformed: false,
      canonicalImportBatchCreationPerformed: false,
      commercialActivationPerformed: false,
      capabilityPromotionPerformed: false,
      marketplaceListingPerformed: false,
    });
    expect(plan.items).toHaveLength(1);
    expect(plan.items[0]).toMatchObject({
      action: 'upsert_supplier_catalog_item',
      identityHashSemantics: DIRECT_SUPPLIER_PHASE_E_IDENTITY_HASH_SEMANTICS,
      sourceRecordDigest: RECORD_DIGEST,
      commercialObservationExcludedFromIdentityHash: true,
      mutationPerformed: false,
      payload: {
        supplierId: SUPPLIER_ID,
        externalProductRef: 'PROD-001',
        externalVariantRef: 'VAR-001',
        sourceObservedAt: '2026-08-31T10:00:00.000Z',
      },
    });
    expect(plan.items[0].payload.rawIdentityHash).toMatch(/^[a-f0-9]{64}$/);
    expect(plan.items[0].payload).not.toHaveProperty('amountMinor');
    expect(plan.items[0].payload).not.toHaveProperty('stockQuantity');
    expect(plan.items[0].payload).not.toHaveProperty('currency');
    expect(plan.items[0].payload).not.toHaveProperty('warehouseCountry');
    expect(plan.items[0].payload).not.toHaveProperty('rawSnapshotRef');
  });

  it('blocks planning when Supplier Foundation is missing or identity capture is denied', () => {
    const missing = prepareDirectSupplierPhaseECatalogCapturePlan({
      reviewPackage: reviewPackage(),
      foundationBinding: foundationBinding({
        supplierFound: false,
        supplierId: undefined,
        lifecycleStatus: undefined,
        foundationReason: 'supplier_not_found',
        identityCaptureAllowed: false,
      }),
    });
    expect(missing).toMatchObject({ captureAllowed: false, reason: 'supplier_foundation_missing', items: [] });

    const banned = prepareDirectSupplierPhaseECatalogCapturePlan({
      reviewPackage: reviewPackage(),
      foundationBinding: foundationBinding({
        lifecycleStatus: 'banned',
        identityCaptureAllowed: false,
      }),
    });
    expect(banned).toMatchObject({ captureAllowed: false, reason: 'identity_capture_blocked', items: [] });
  });

  it('fails closed on supplier binding mismatches or internally inconsistent capture authority', () => {
    expect(() => prepareDirectSupplierPhaseECatalogCapturePlan({
      reviewPackage: reviewPackage(),
      foundationBinding: foundationBinding({ supplierKey: 'other-maker' }),
    })).toThrow('same supplierKey');

    expect(() => prepareDirectSupplierPhaseECatalogCapturePlan({
      reviewPackage: reviewPackage(),
      foundationBinding: foundationBinding({ supplierId: 'not-a-uuid' }),
    })).toThrow('internally inconsistent');
  });
});
