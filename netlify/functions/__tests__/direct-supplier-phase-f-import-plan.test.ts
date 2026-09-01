import { describe, expect, it } from 'vitest';
import type { DirectSupplierCanonicalReviewPackageV1 } from '../_shared/directSupplierCanonicalReview';
import type { DirectSupplierFoundationBindingV1 } from '../_shared/directSupplierFoundationBinding';
import { evaluateDirectSupplierIntakeGovernance } from '../_shared/directSupplierIntakeGovernance';
import { prepareDirectSupplierPhaseFImportPlan } from '../_shared/directSupplierPhaseFImportPlan';

const supplierId = '11111111-1111-4111-8111-111111111111';
const catalogItemId = '22222222-2222-4222-8222-222222222222';
const productId = '33333333-3333-4333-8333-333333333333';

const reviewPackage = (overrides: Partial<DirectSupplierCanonicalReviewPackageV1> = {}): DirectSupplierCanonicalReviewPackageV1 => ({
  interfaceVersion: 1,
  supplierKey: 'uk-maker-001',
  sourceBatchDigest: 'a'.repeat(64),
  sourceGeneratedAt: '2026-09-01T08:00:00.000Z',
  sourceTransport: 'json_api',
  acceptedCount: 1,
  quarantinedCount: 0,
  items: [{
    supplierKey: 'uk-maker-001',
    sourceRecordDigest: 'b'.repeat(64),
    sourceRef: `direct-supplier-staging:uk-maker-001:${'a'.repeat(64)}:${'b'.repeat(64)}`,
    sourceObservedAt: '2026-09-01T08:00:00.000Z',
    externalProductRef: 'P-1',
    externalVariantRef: 'V-1',
    workingLabelProposal: 'Product One',
    identifierEvidence: [],
    attributeEvidence: [],
    assetEvidence: [],
    commercialObservation: {
      currency: 'GBP',
      amountMinor: 1000,
      stockQuantity: 2,
      warehouseCountry: 'GB',
      disposition: 'review_only',
      canonicalIdentityWriteAllowed: false,
      marketplaceListingAllowed: false,
    },
    requiresAdminIdentityReview: true,
    canonicalIdentityWriteAllowed: false,
    marketplaceListingAllowed: false,
  }],
  quarantined: [],
  requiresAdminReview: true,
  canonicalImportBatchCreationPerformed: false,
  canonicalIdentityMutationPerformed: false,
  commercialActivationPerformed: false,
  capabilityPromotionPerformed: false,
  marketplaceListingPerformed: false,
  ...overrides,
});

const foundationBinding = (
  overrides: Partial<DirectSupplierFoundationBindingV1> = {},
): DirectSupplierFoundationBindingV1 => ({
  interfaceVersion: 1,
  supplierKey: 'uk-maker-001',
  supplierFound: true,
  supplierId,
  lifecycleStatus: 'approved',
  foundationReason: 'supplier_foundation_ready',
  identityCaptureAllowed: true,
  canonicalImportBatchCreationAllowed: true,
  supplierFoundationReady: true,
  foundationMutationPerformed: false,
  canonicalIdentityMutationPerformed: false,
  canonicalImportBatchCreationPerformed: false,
  commercialActivationPerformed: false,
  capabilityPromotionPerformed: false,
  marketplaceListingPerformed: false,
  ...overrides,
});

function governance(review = reviewPackage(), foundation = foundationBinding()) {
  return evaluateDirectSupplierIntakeGovernance({ reviewPackage: review, foundationBinding: foundation });
}

describe('Direct Supplier Phase F import plan', () => {
  it('prepares idempotent existing Phase F batch/item payloads from real Phase E catalog IDs', () => {
    const review = reviewPackage();
    const foundation = foundationBinding();
    const result = prepareDirectSupplierPhaseFImportPlan({
      reviewPackage: review,
      foundationBinding: foundation,
      intakeGovernance: governance(review, foundation),
      catalogMappings: [{
        sourceRecordDigest: 'b'.repeat(64),
        supplierCatalogItemId: catalogItemId,
        canonicalProductId: productId,
      }],
    });

    expect(result.planReady).toBe(true);
    expect(result.reason).toBe('import_plan_ready');
    expect(result.createImportBatch?.action).toBe('create_import_batch');
    expect(result.createImportBatch?.payload.providerKey).toBe('direct_supplier');
    expect(result.createImportBatch?.payload.idempotencyKey).toBe(`direct-supplier:v1:uk-maker-001:${'a'.repeat(64)}`);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].recordImportItem.action).toBe('record_import_item');
    expect(result.items[0].recordImportItem.payload.supplierCatalogItemId).toBe(catalogItemId);
    expect(result.items[0].recordImportItem.payload.canonicalProductId).toBe(productId);
    expect(result.items[0].recordImportItem.payload.sourcePayloadHash).toBe('b'.repeat(64));
    expect(result.items[0].canonicalProductMappingRequiredBeforeFactsAndApproval).toBe(false);
    expect(result.canonicalImportBatchCreationPerformed).toBe(false);
    expect(result.marketplaceListingPerformed).toBe(false);
    expect(result.commercialActivationPerformed).toBe(false);
  });

  it('allows import-item capture without inventing a canonical product mapping and marks later review as required', () => {
    const review = reviewPackage();
    const foundation = foundationBinding();
    const result = prepareDirectSupplierPhaseFImportPlan({
      reviewPackage: review,
      foundationBinding: foundation,
      intakeGovernance: governance(review, foundation),
      catalogMappings: [{ sourceRecordDigest: 'b'.repeat(64), supplierCatalogItemId: catalogItemId }],
    });

    expect(result.planReady).toBe(true);
    expect(result.items[0].recordImportItem.payload).not.toHaveProperty('canonicalProductId');
    expect(result.items[0].canonicalProductMappingRequiredBeforeFactsAndApproval).toBe(true);
    expect(result.items[0].normalizedFactsReviewRequired).toBe(true);
    expect(result.items[0].assetRightsReviewRequired).toBe(true);
    expect(result.items[0].complianceReviewsRequired).toEqual([
      'product_safety','restricted_goods','claims','labelling','documentation','marketability',
    ]);
  });

  it('blocks Phase F planning when Supplier Foundation does not allow import batch creation', () => {
    const review = reviewPackage();
    const foundation = foundationBinding({
      lifecycleStatus: 'verification',
      foundationReason: 'supplier_not_approved',
      canonicalImportBatchCreationAllowed: false,
      supplierFoundationReady: false,
    });
    const result = prepareDirectSupplierPhaseFImportPlan({
      reviewPackage: review,
      foundationBinding: foundation,
      intakeGovernance: governance(review, foundation),
      catalogMappings: [],
    });

    expect(result.planReady).toBe(false);
    expect(result.reason).toBe('canonical_import_blocked');
    expect(result.createImportBatch).toBeUndefined();
  });

  it('does not invent missing Phase E catalog IDs', () => {
    const review = reviewPackage();
    const foundation = foundationBinding();
    const result = prepareDirectSupplierPhaseFImportPlan({
      reviewPackage: review,
      foundationBinding: foundation,
      intakeGovernance: governance(review, foundation),
      catalogMappings: [],
    });

    expect(result.planReady).toBe(false);
    expect(result.reason).toBe('catalog_mapping_incomplete');
    expect(result.items).toEqual([]);
  });

  it('rejects mappings outside the reviewed staging batch', () => {
    const review = reviewPackage();
    const foundation = foundationBinding();
    expect(() => prepareDirectSupplierPhaseFImportPlan({
      reviewPackage: review,
      foundationBinding: foundation,
      intakeGovernance: governance(review, foundation),
      catalogMappings: [{ sourceRecordDigest: 'c'.repeat(64), supplierCatalogItemId: catalogItemId }],
    })).toThrow(/outside the reviewed batch/);
  });

  it('fails closed if any upstream input claims a mutation already occurred', () => {
    const review = reviewPackage({ marketplaceListingPerformed: true as false });
    const foundation = foundationBinding();
    expect(() => prepareDirectSupplierPhaseFImportPlan({
      reviewPackage: review,
      foundationBinding: foundation,
      intakeGovernance: governance(reviewPackage(), foundation),
      catalogMappings: [],
    })).toThrow(/fail-closed inputs/);
  });
});
