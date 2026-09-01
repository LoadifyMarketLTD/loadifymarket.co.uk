import type { DirectSupplierCanonicalReviewPackageV1 } from './directSupplierCanonicalReview';
import type { DirectSupplierFoundationBindingV1 } from './directSupplierFoundationBinding';
import type { DirectSupplierIntakeGovernanceDecisionV1 } from './directSupplierIntakeGovernance';

export const DIRECT_SUPPLIER_PHASE_F_IMPORT_PLAN_VERSION = 1 as const;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256_HEX = /^[a-f0-9]{64}$/;

const REQUIRED_COMPLIANCE_REVIEWS = [
  'product_safety',
  'restricted_goods',
  'claims',
  'labelling',
  'documentation',
  'marketability',
] as const;

export interface DirectSupplierPhaseFCatalogMappingV1 {
  sourceRecordDigest: string;
  supplierCatalogItemId: string;
  canonicalProductId?: string;
}

export interface DirectSupplierPhaseFImportPlanItemV1 {
  interfaceVersion: 1;
  sourceRecordDigest: string;
  externalProductRef: string;
  externalVariantRef: string;
  supplierCatalogItemId: string;
  canonicalProductId?: string;
  recordImportItem: {
    action: 'record_import_item';
    payload: {
      batchId: '__PHASE_F_BATCH_ID__';
      supplierCatalogItemId: string;
      canonicalProductId?: string;
      sourcePayloadRef: string;
      sourcePayloadHash: string;
      sourceObservedAt: string;
      itemIdempotencyKey: string;
    };
    mutationPerformed: false;
  };
  canonicalProductMappingRequiredBeforeFactsAndApproval: boolean;
  normalizedFactsReviewRequired: true;
  assetRightsReviewRequired: true;
  complianceReviewsRequired: typeof REQUIRED_COMPLIANCE_REVIEWS;
  marketplaceListingAllowed: false;
  commercialActivationAllowed: false;
}

export interface DirectSupplierPhaseFImportPlanV1 {
  interfaceVersion: typeof DIRECT_SUPPLIER_PHASE_F_IMPORT_PLAN_VERSION;
  supplierKey: string;
  sourceBatchDigest: string;
  planReady: boolean;
  reason:
    | 'supplier_foundation_missing'
    | 'canonical_import_blocked'
    | 'catalog_mapping_incomplete'
    | 'import_plan_ready';
  supplierId?: string;
  createImportBatch?: {
    action: 'create_import_batch';
    payload: {
      supplierId: string;
      providerKey: 'direct_supplier';
      sourceRef: string;
      sourceObservedAt: string;
      adapterVersion: 'direct-supplier-staging-v1';
      idempotencyKey: string;
    };
    mutationPerformed: false;
  };
  items: DirectSupplierPhaseFImportPlanItemV1[];
  quarantinedCount: number;
  normalizedFactsExecutionDeferred: true;
  assetRightsExecutionDeferred: true;
  complianceExecutionDeferred: true;
  supplierFoundationMutationPerformed: false;
  canonicalIdentityMutationPerformed: false;
  canonicalImportBatchCreationPerformed: false;
  commercialActivationPerformed: false;
  capabilityPromotionPerformed: false;
  marketplaceListingPerformed: false;
}

function assertFailClosedInputs(input: {
  reviewPackage: DirectSupplierCanonicalReviewPackageV1;
  foundationBinding: DirectSupplierFoundationBindingV1;
  intakeGovernance: DirectSupplierIntakeGovernanceDecisionV1;
}) {
  const { reviewPackage, foundationBinding, intakeGovernance } = input;
  const supplierKey = reviewPackage.supplierKey.trim().toLowerCase();
  if (!supplierKey || foundationBinding.supplierKey.trim().toLowerCase() !== supplierKey || intakeGovernance.supplierKey.trim().toLowerCase() !== supplierKey) {
    throw new Error('Direct Supplier Phase F planning supplier binding mismatch');
  }
  if (reviewPackage.interfaceVersion !== 1 || foundationBinding.interfaceVersion !== 1 || intakeGovernance.interfaceVersion !== 1) {
    throw new Error('Direct Supplier Phase F planning interface version mismatch');
  }
  if (reviewPackage.acceptedCount !== reviewPackage.items.length || reviewPackage.quarantinedCount !== reviewPackage.quarantined.length) {
    throw new Error('Direct Supplier Phase F planning review counts are inconsistent');
  }
  if (
    reviewPackage.canonicalImportBatchCreationPerformed !== false
    || reviewPackage.canonicalIdentityMutationPerformed !== false
    || reviewPackage.commercialActivationPerformed !== false
    || reviewPackage.capabilityPromotionPerformed !== false
    || reviewPackage.marketplaceListingPerformed !== false
    || foundationBinding.foundationMutationPerformed !== false
    || foundationBinding.canonicalIdentityMutationPerformed !== false
    || foundationBinding.canonicalImportBatchCreationPerformed !== false
    || foundationBinding.commercialActivationPerformed !== false
    || foundationBinding.capabilityPromotionPerformed !== false
    || foundationBinding.marketplaceListingPerformed !== false
    || intakeGovernance.canonicalIdentityMutationPerformed !== false
    || intakeGovernance.canonicalImportBatchCreationPerformed !== false
    || intakeGovernance.commercialActivationAllowed !== false
    || intakeGovernance.marketplacePublicationAllowed !== false
    || intakeGovernance.providerWriteExecutionAllowed !== false
  ) {
    throw new Error('Direct Supplier Phase F planning requires fail-closed inputs');
  }
}

function planBase(input: {
  reviewPackage: DirectSupplierCanonicalReviewPackageV1;
  reason: DirectSupplierPhaseFImportPlanV1['reason'];
  planReady: boolean;
  supplierId?: string;
  createImportBatch?: DirectSupplierPhaseFImportPlanV1['createImportBatch'];
  items?: DirectSupplierPhaseFImportPlanItemV1[];
}): DirectSupplierPhaseFImportPlanV1 {
  return {
    interfaceVersion: DIRECT_SUPPLIER_PHASE_F_IMPORT_PLAN_VERSION,
    supplierKey: input.reviewPackage.supplierKey,
    sourceBatchDigest: input.reviewPackage.sourceBatchDigest,
    planReady: input.planReady,
    reason: input.reason,
    supplierId: input.supplierId,
    createImportBatch: input.createImportBatch,
    items: input.items ?? [],
    quarantinedCount: input.reviewPackage.quarantinedCount,
    normalizedFactsExecutionDeferred: true,
    assetRightsExecutionDeferred: true,
    complianceExecutionDeferred: true,
    supplierFoundationMutationPerformed: false,
    canonicalIdentityMutationPerformed: false,
    canonicalImportBatchCreationPerformed: false,
    commercialActivationPerformed: false,
    capabilityPromotionPerformed: false,
    marketplaceListingPerformed: false,
  };
}

/**
 * Builds, but never executes, the existing Phase F `create_import_batch` and
 * `record_import_item` payloads for a reviewed Direct Supplier staging batch.
 *
 * Phase E must already have produced real supplierCatalogItemIds. No synthetic
 * identifiers are generated here. Canonical product mapping may remain absent
 * at capture time, but it is explicitly required before normalized facts can be
 * recorded and before an import item can be approved.
 */
export function prepareDirectSupplierPhaseFImportPlan(input: {
  reviewPackage: DirectSupplierCanonicalReviewPackageV1;
  foundationBinding: DirectSupplierFoundationBindingV1;
  intakeGovernance: DirectSupplierIntakeGovernanceDecisionV1;
  catalogMappings: DirectSupplierPhaseFCatalogMappingV1[];
}): DirectSupplierPhaseFImportPlanV1 {
  assertFailClosedInputs(input);

  const { reviewPackage, foundationBinding, intakeGovernance } = input;
  if (!foundationBinding.supplierFound || !foundationBinding.supplierId) {
    return planBase({ reviewPackage, planReady: false, reason: 'supplier_foundation_missing' });
  }

  const supplierId = foundationBinding.supplierId;
  if (!UUID_RE.test(supplierId)) {
    throw new Error('Direct Supplier Phase F planning requires a valid supplierId');
  }

  if (
    !foundationBinding.canonicalImportBatchCreationAllowed
    || !intakeGovernance.canonicalImportBatchCreationAllowed
    || intakeGovernance.stage !== 'import_review'
  ) {
    return planBase({
      reviewPackage,
      planReady: false,
      reason: 'canonical_import_blocked',
      supplierId,
    });
  }

  const mappings = new Map<string, DirectSupplierPhaseFCatalogMappingV1>();
  for (const mapping of input.catalogMappings) {
    const digest = mapping.sourceRecordDigest.trim().toLowerCase();
    if (!SHA256_HEX.test(digest)) throw new Error('Direct Supplier Phase F mapping sourceRecordDigest must be SHA-256');
    if (!UUID_RE.test(mapping.supplierCatalogItemId)) throw new Error('Direct Supplier Phase F mapping requires a valid supplierCatalogItemId');
    if (mapping.canonicalProductId && !UUID_RE.test(mapping.canonicalProductId)) throw new Error('Direct Supplier Phase F mapping canonicalProductId must be a UUID when supplied');
    if (mappings.has(digest)) throw new Error('Direct Supplier Phase F mapping contains a duplicate sourceRecordDigest');
    mappings.set(digest, { ...mapping, sourceRecordDigest: digest });
  }

  const reviewDigests = new Set(reviewPackage.items.map(item => item.sourceRecordDigest.trim().toLowerCase()));
  for (const digest of mappings.keys()) {
    if (!reviewDigests.has(digest)) throw new Error('Direct Supplier Phase F mapping contains an item outside the reviewed batch');
  }
  if (mappings.size !== reviewPackage.items.length || reviewPackage.items.some(item => !mappings.has(item.sourceRecordDigest.trim().toLowerCase()))) {
    return planBase({
      reviewPackage,
      planReady: false,
      reason: 'catalog_mapping_incomplete',
      supplierId,
    });
  }

  const batchIdempotencyKey = `direct-supplier:v1:${reviewPackage.supplierKey}:${reviewPackage.sourceBatchDigest}`;
  const sourceRef = `direct-supplier-staging-batch:${reviewPackage.supplierKey}:${reviewPackage.sourceBatchDigest}`;

  const createImportBatch = {
    action: 'create_import_batch' as const,
    payload: {
      supplierId,
      providerKey: 'direct_supplier' as const,
      sourceRef,
      sourceObservedAt: reviewPackage.sourceGeneratedAt,
      adapterVersion: 'direct-supplier-staging-v1' as const,
      idempotencyKey: batchIdempotencyKey,
    },
    mutationPerformed: false as const,
  };

  const items = reviewPackage.items.map(item => {
    const digest = item.sourceRecordDigest.trim().toLowerCase();
    const mapping = mappings.get(digest);
    if (!mapping) throw new Error('Direct Supplier Phase F mapping unexpectedly missing');

    return {
      interfaceVersion: 1 as const,
      sourceRecordDigest: digest,
      externalProductRef: item.externalProductRef,
      externalVariantRef: item.externalVariantRef,
      supplierCatalogItemId: mapping.supplierCatalogItemId,
      canonicalProductId: mapping.canonicalProductId,
      recordImportItem: {
        action: 'record_import_item' as const,
        payload: {
          batchId: '__PHASE_F_BATCH_ID__' as const,
          supplierCatalogItemId: mapping.supplierCatalogItemId,
          ...(mapping.canonicalProductId ? { canonicalProductId: mapping.canonicalProductId } : {}),
          sourcePayloadRef: item.sourceRef,
          sourcePayloadHash: digest,
          sourceObservedAt: item.sourceObservedAt,
          itemIdempotencyKey: `direct-supplier:v1:${digest}`,
        },
        mutationPerformed: false as const,
      },
      canonicalProductMappingRequiredBeforeFactsAndApproval: !mapping.canonicalProductId,
      normalizedFactsReviewRequired: true as const,
      assetRightsReviewRequired: true as const,
      complianceReviewsRequired: REQUIRED_COMPLIANCE_REVIEWS,
      marketplaceListingAllowed: false as const,
      commercialActivationAllowed: false as const,
    };
  });

  return planBase({
    reviewPackage,
    planReady: true,
    reason: 'import_plan_ready',
    supplierId,
    createImportBatch,
    items,
  });
}
