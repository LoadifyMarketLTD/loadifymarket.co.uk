import type { DirectSupplierCanonicalReviewPackageV1 } from './directSupplierCanonicalReview';
import type { DirectSupplierFoundationBindingV1 } from './directSupplierFoundationBinding';

export const DIRECT_SUPPLIER_INTAKE_GOVERNANCE_VERSION = 1 as const;

export type DirectSupplierIntakeStage =
  | 'quarantine_only'
  | 'staging_only'
  | 'identity_review'
  | 'import_review';

export interface DirectSupplierIntakeGovernanceDecisionV1 {
  interfaceVersion: typeof DIRECT_SUPPLIER_INTAKE_GOVERNANCE_VERSION;
  supplierKey: string;
  stage: DirectSupplierIntakeStage;
  acceptedCount: number;
  quarantinedCount: number;
  foundationReason: DirectSupplierFoundationBindingV1['foundationReason'];
  identityCaptureAllowed: boolean;
  canonicalImportBatchCreationAllowed: boolean;
  supplierFoundationReady: boolean;
  phaseEIdentityReviewRequired: boolean;
  phaseFImportGovernanceRequired: true;
  normalizedFactsReviewRequired: true;
  assetRightsReviewRequired: true;
  complianceReviewRequired: true;
  canonicalIdentityMutationPerformed: false;
  canonicalImportBatchCreationPerformed: false;
  commercialActivationAllowed: false;
  marketplacePublicationAllowed: false;
  providerWriteExecutionAllowed: false;
  reasons: string[];
}

/**
 * Read-only bridge between Direct Supplier pre-canonical staging and the
 * existing Supplier Foundation / Phase E / Phase F governance surfaces.
 *
 * Raw signed supplier data may be preserved in staging/quarantine before the
 * supplier is commercially ready. This decision never promotes supplier data
 * directly into canonical products or commerce. Asset-rights, normalized-fact
 * and compliance review remain Phase F requirements even when Supplier
 * Foundation allows an import batch to be created.
 */
export function evaluateDirectSupplierIntakeGovernance(input: {
  reviewPackage: DirectSupplierCanonicalReviewPackageV1;
  foundationBinding: DirectSupplierFoundationBindingV1;
}): DirectSupplierIntakeGovernanceDecisionV1 {
  const review = input.reviewPackage;
  const foundation = input.foundationBinding;
  const supplierKey = review.supplierKey.trim().toLowerCase();

  if (!supplierKey || foundation.supplierKey.trim().toLowerCase() !== supplierKey) {
    throw new Error('Direct Supplier intake governance supplier binding mismatch');
  }
  if (review.interfaceVersion !== 1 || foundation.interfaceVersion !== 1) {
    throw new Error('Direct Supplier intake governance interface version mismatch');
  }
  if (review.acceptedCount !== review.items.length || review.quarantinedCount !== review.quarantined.length) {
    throw new Error('Direct Supplier intake governance review counts are inconsistent');
  }
  if (
    review.commercialActivationPerformed !== false
    || review.capabilityPromotionPerformed !== false
    || review.marketplaceListingPerformed !== false
    || review.canonicalIdentityMutationPerformed !== false
    || review.canonicalImportBatchCreationPerformed !== false
  ) {
    throw new Error('Direct Supplier intake governance received a fail-open review package');
  }

  let stage: DirectSupplierIntakeStage;
  if (review.acceptedCount === 0) {
    stage = 'quarantine_only';
  } else if (foundation.canonicalImportBatchCreationAllowed) {
    stage = 'import_review';
  } else if (foundation.identityCaptureAllowed) {
    stage = 'identity_review';
  } else {
    stage = 'staging_only';
  }

  const reasons = [
    `foundation:${foundation.foundationReason}`,
    ...(review.acceptedCount > 0 ? ['phase_e_identity_review_required'] : []),
    'phase_f_normalized_facts_review_required',
    'phase_f_asset_rights_review_required',
    'phase_f_compliance_review_required',
  ];

  if (review.quarantinedCount > 0) reasons.push('staging_quarantine_present');
  if (!foundation.supplierFoundationReady) reasons.push('supplier_foundation_not_fully_ready');
  if (!foundation.canonicalImportBatchCreationAllowed) reasons.push('canonical_import_batch_creation_not_available');

  return {
    interfaceVersion: DIRECT_SUPPLIER_INTAKE_GOVERNANCE_VERSION,
    supplierKey,
    stage,
    acceptedCount: review.acceptedCount,
    quarantinedCount: review.quarantinedCount,
    foundationReason: foundation.foundationReason,
    identityCaptureAllowed: foundation.identityCaptureAllowed && review.acceptedCount > 0,
    canonicalImportBatchCreationAllowed: foundation.canonicalImportBatchCreationAllowed && review.acceptedCount > 0,
    supplierFoundationReady: foundation.supplierFoundationReady,
    phaseEIdentityReviewRequired: review.acceptedCount > 0,
    phaseFImportGovernanceRequired: true,
    normalizedFactsReviewRequired: true,
    assetRightsReviewRequired: true,
    complianceReviewRequired: true,
    canonicalIdentityMutationPerformed: false,
    canonicalImportBatchCreationPerformed: false,
    commercialActivationAllowed: false,
    marketplacePublicationAllowed: false,
    providerWriteExecutionAllowed: false,
    reasons: [...new Set(reasons)],
  };
}
