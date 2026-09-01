import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { DirectSupplierCanonicalReviewPackageV1 } from '../_shared/directSupplierCanonicalReview';
import type { DirectSupplierFoundationBindingV1 } from '../_shared/directSupplierFoundationBinding';
import { evaluateDirectSupplierIntakeGovernance } from '../_shared/directSupplierIntakeGovernance';

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
    assetEvidence: [{
      assetRef: 'https://example.test/image.jpg',
      assetType: 'image',
      sourceRef: `direct-supplier-staging:uk-maker-001:${'a'.repeat(64)}:${'b'.repeat(64)}`,
      rightsStatus: 'unknown',
      reviewRequired: true,
    }],
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
  supplierId: '11111111-1111-4111-8111-111111111111',
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

describe('Direct Supplier intake governance', () => {
  it('allows only import review when Foundation is ready and still requires Phase F governance', () => {
    const result = evaluateDirectSupplierIntakeGovernance({
      reviewPackage: reviewPackage(),
      foundationBinding: foundationBinding(),
    });

    expect(result.stage).toBe('import_review');
    expect(result.canonicalImportBatchCreationAllowed).toBe(true);
    expect(result.phaseEIdentityReviewRequired).toBe(true);
    expect(result.phaseFImportGovernanceRequired).toBe(true);
    expect(result.assetRightsReviewRequired).toBe(true);
    expect(result.complianceReviewRequired).toBe(true);
    expect(result.commercialActivationAllowed).toBe(false);
    expect(result.marketplacePublicationAllowed).toBe(false);
    expect(result.providerWriteExecutionAllowed).toBe(false);
  });

  it('keeps a verification-lifecycle supplier at identity review only', () => {
    const result = evaluateDirectSupplierIntakeGovernance({
      reviewPackage: reviewPackage(),
      foundationBinding: foundationBinding({
        lifecycleStatus: 'verification',
        foundationReason: 'supplier_not_approved',
        canonicalImportBatchCreationAllowed: false,
        supplierFoundationReady: false,
      }),
    });

    expect(result.stage).toBe('identity_review');
    expect(result.identityCaptureAllowed).toBe(true);
    expect(result.canonicalImportBatchCreationAllowed).toBe(false);
    expect(result.reasons).toContain('supplier_foundation_not_fully_ready');
  });

  it('keeps a missing supplier in staging only', () => {
    const result = evaluateDirectSupplierIntakeGovernance({
      reviewPackage: reviewPackage(),
      foundationBinding: foundationBinding({
        supplierFound: false,
        supplierId: undefined,
        lifecycleStatus: undefined,
        foundationReason: 'supplier_not_found',
        identityCaptureAllowed: false,
        canonicalImportBatchCreationAllowed: false,
        supplierFoundationReady: false,
      }),
    });

    expect(result.stage).toBe('staging_only');
    expect(result.identityCaptureAllowed).toBe(false);
    expect(result.marketplacePublicationAllowed).toBe(false);
  });

  it('keeps fully quarantined batches out of identity/import progression', () => {
    const result = evaluateDirectSupplierIntakeGovernance({
      reviewPackage: reviewPackage({
        acceptedCount: 0,
        quarantinedCount: 1,
        items: [],
        quarantined: [{ index: 0, externalVariantRef: 'V-1', reasons: ['INVALID_IMAGE_URL'] }],
      }),
      foundationBinding: foundationBinding(),
    });

    expect(result.stage).toBe('quarantine_only');
    expect(result.identityCaptureAllowed).toBe(false);
    expect(result.canonicalImportBatchCreationAllowed).toBe(false);
  });

  it('fails closed on a supplier-key mismatch', () => {
    expect(() => evaluateDirectSupplierIntakeGovernance({
      reviewPackage: reviewPackage(),
      foundationBinding: foundationBinding({ supplierKey: 'other-supplier' }),
    })).toThrow(/supplier binding mismatch/);
  });

  it('deploys the admin staging review through the modern Netlify runtime', () => {
    const wrapper = readFileSync(
      resolve(process.cwd(), 'netlify/functions-modern/admin-direct-supplier-staging-review.ts'),
      'utf8',
    );
    const endpoint = readFileSync(
      resolve(process.cwd(), 'netlify/functions/admin-direct-supplier-staging-review.ts'),
      'utf8',
    );

    expect(wrapper).toContain("../functions/admin-direct-supplier-staging-review");
    expect(endpoint).toContain('authenticateActiveAccount(event, admin, [\'admin\'])');
    expect(endpoint).toContain('evaluateDirectSupplierIntakeGovernance');
    expect(endpoint).toContain('intakeGovernance');
  });
});
