import type { DirectSupplierFeedBatchV1 } from './directSupplierContract';
import type {
  DirectSupplierFeedQuarantineReason,
  DirectSupplierQuarantinedRecordV1,
  DirectSupplierStagingCandidateV1,
} from './directSupplierFeedAdmission';

const SHA256_HEX = /^[a-f0-9]{64}$/;

export interface DirectSupplierIdentifierEvidenceV1 {
  identifierType: 'gtin' | 'internal';
  identifierNamespace: string;
  rawValue: string;
  normalizedValue: string;
  verificationStatus: 'observed';
  evidenceSourceRef: string;
  observedAt: string;
}

export interface DirectSupplierAttributeEvidenceV1 {
  key: string;
  value: string;
  sourceRef: string;
  sourceEvidenceHash: string;
  reviewStatus: 'pending';
}

export interface DirectSupplierAssetEvidenceV1 {
  assetRef: string;
  assetType: 'image';
  sourceRef: string;
  rightsStatus: 'unknown';
  reviewRequired: true;
}

export interface DirectSupplierCommercialObservationV1 {
  currency: string;
  amountMinor: number;
  stockQuantity?: number;
  warehouseCountry: string;
  disposition: 'review_only';
  canonicalIdentityWriteAllowed: false;
  marketplaceListingAllowed: false;
}

export interface DirectSupplierCanonicalReviewItemV1 {
  supplierKey: string;
  sourceRecordDigest: string;
  sourceRef: string;
  sourceObservedAt: string;
  externalProductRef: string;
  externalVariantRef: string;
  workingLabelProposal: string;
  identifierEvidence: DirectSupplierIdentifierEvidenceV1[];
  attributeEvidence: DirectSupplierAttributeEvidenceV1[];
  assetEvidence: DirectSupplierAssetEvidenceV1[];
  commercialObservation: DirectSupplierCommercialObservationV1;
  requiresAdminIdentityReview: true;
  canonicalIdentityWriteAllowed: false;
  marketplaceListingAllowed: false;
}

export interface DirectSupplierCanonicalReviewQuarantineV1 {
  index: number;
  externalVariantRef?: string;
  reasons: DirectSupplierFeedQuarantineReason[];
}

export interface DirectSupplierCanonicalReviewPackageV1 {
  interfaceVersion: 1;
  supplierKey: string;
  sourceBatchDigest: string;
  sourceGeneratedAt: string;
  sourceTransport: DirectSupplierFeedBatchV1['transport'];
  acceptedCount: number;
  quarantinedCount: number;
  items: DirectSupplierCanonicalReviewItemV1[];
  quarantined: DirectSupplierCanonicalReviewQuarantineV1[];
  requiresAdminReview: true;
  canonicalImportBatchCreationPerformed: false;
  canonicalIdentityMutationPerformed: false;
  commercialActivationPerformed: false;
  capabilityPromotionPerformed: false;
  marketplaceListingPerformed: false;
}

function normalizeRequired(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${field} is required`);
  return normalized;
}

function normalizeIso(value: string, field: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`${field} must be an ISO timestamp`);
  return date.toISOString();
}

function requireDigest(value: string, field: string): string {
  const normalized = value.trim().toLowerCase();
  if (!SHA256_HEX.test(normalized)) throw new Error(`${field} must be a SHA-256 hex digest`);
  return normalized;
}

function sourceRefFor(input: {
  supplierKey: string;
  sourceBatchDigest: string;
  sourceRecordDigest: string;
}): string {
  return `direct-supplier-staging:${input.supplierKey}:${input.sourceBatchDigest}:${input.sourceRecordDigest}`;
}

function identifierEvidenceFor(
  candidate: DirectSupplierStagingCandidateV1,
  sourceRef: string,
  observedAt: string,
): DirectSupplierIdentifierEvidenceV1[] {
  const evidence: DirectSupplierIdentifierEvidenceV1[] = [];

  if (candidate.gtin) {
    const rawValue = candidate.gtin.trim();
    if (rawValue) {
      evidence.push({
        identifierType: 'gtin',
        identifierNamespace: 'global',
        rawValue,
        normalizedValue: rawValue.toLowerCase(),
        verificationStatus: 'observed',
        evidenceSourceRef: sourceRef,
        observedAt,
      });
    }
  }

  if (candidate.sku) {
    const rawValue = candidate.sku.trim();
    if (rawValue) {
      evidence.push({
        identifierType: 'internal',
        identifierNamespace: `direct-supplier:${candidate.supplierKey.trim()}`,
        rawValue,
        normalizedValue: rawValue.toLowerCase(),
        verificationStatus: 'observed',
        evidenceSourceRef: sourceRef,
        observedAt,
      });
    }
  }

  return evidence;
}

function attributeEvidenceFor(
  candidate: DirectSupplierStagingCandidateV1,
  sourceRef: string,
): DirectSupplierAttributeEvidenceV1[] {
  return Object.entries(candidate.attributes)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => ({
      key,
      value,
      sourceRef,
      sourceEvidenceHash: candidate.sourceRecordDigest,
      reviewStatus: 'pending' as const,
    }));
}

function assetEvidenceFor(
  candidate: DirectSupplierStagingCandidateV1,
  sourceRef: string,
): DirectSupplierAssetEvidenceV1[] {
  return candidate.imageUrls.map(assetRef => ({
    assetRef,
    assetType: 'image' as const,
    sourceRef,
    rightsStatus: 'unknown' as const,
    reviewRequired: true as const,
  }));
}

/**
 * Converts already-admitted Direct Supplier staging records into a deterministic,
 * read-only package for the existing admin-gated canonical supplier review flow.
 *
 * This helper deliberately does not create supplier foundation records, import
 * batches, canonical products, supplier offers, verified facts or asset-rights
 * approvals. Price and stock remain commercial observations only because the
 * canonical identity layer intentionally defers supplier economics to later
 * phases. No capability promotion, commercial activation or marketplace listing
 * is performed here.
 */
export function prepareDirectSupplierCanonicalReviewPackage(input: {
  supplierKey: string;
  sourceBatchDigest: string;
  sourceGeneratedAt: string;
  sourceTransport: DirectSupplierFeedBatchV1['transport'];
  accepted: DirectSupplierStagingCandidateV1[];
  quarantined: DirectSupplierQuarantinedRecordV1[];
}): DirectSupplierCanonicalReviewPackageV1 {
  const supplierKey = normalizeRequired(input.supplierKey, 'supplierKey');
  const sourceBatchDigest = requireDigest(input.sourceBatchDigest, 'sourceBatchDigest');
  const sourceGeneratedAt = normalizeIso(input.sourceGeneratedAt, 'sourceGeneratedAt');

  const items = input.accepted.map(candidate => {
    if (candidate.supplierKey.trim() !== supplierKey) {
      throw new Error('accepted candidate supplierKey must match review package supplierKey');
    }
    if (normalizeIso(candidate.sourceGeneratedAt, 'candidate sourceGeneratedAt') !== sourceGeneratedAt) {
      throw new Error('accepted candidate sourceGeneratedAt must match review package sourceGeneratedAt');
    }
    if (candidate.sourceTransport !== input.sourceTransport) {
      throw new Error('accepted candidate sourceTransport must match review package sourceTransport');
    }
    if (candidate.ingestionState !== 'staged_candidate' || candidate.marketplaceListingAllowed !== false) {
      throw new Error('accepted candidate must remain a non-listable staged_candidate');
    }

    const sourceRecordDigest = requireDigest(candidate.sourceRecordDigest, 'sourceRecordDigest');
    const sourceRef = sourceRefFor({ supplierKey, sourceBatchDigest, sourceRecordDigest });

    return {
      supplierKey,
      sourceRecordDigest,
      sourceRef,
      sourceObservedAt: sourceGeneratedAt,
      externalProductRef: normalizeRequired(candidate.externalProductRef, 'externalProductRef'),
      externalVariantRef: normalizeRequired(candidate.externalVariantRef, 'externalVariantRef'),
      workingLabelProposal: normalizeRequired(candidate.title, 'title'),
      identifierEvidence: identifierEvidenceFor(candidate, sourceRef, sourceGeneratedAt),
      attributeEvidence: attributeEvidenceFor(candidate, sourceRef),
      assetEvidence: assetEvidenceFor(candidate, sourceRef),
      commercialObservation: {
        currency: candidate.currency,
        amountMinor: candidate.amountMinor,
        stockQuantity: candidate.stockQuantity,
        warehouseCountry: candidate.warehouseCountry,
        disposition: 'review_only' as const,
        canonicalIdentityWriteAllowed: false as const,
        marketplaceListingAllowed: false as const,
      },
      requiresAdminIdentityReview: true as const,
      canonicalIdentityWriteAllowed: false as const,
      marketplaceListingAllowed: false as const,
    };
  });

  return {
    interfaceVersion: 1,
    supplierKey,
    sourceBatchDigest,
    sourceGeneratedAt,
    sourceTransport: input.sourceTransport,
    acceptedCount: items.length,
    quarantinedCount: input.quarantined.length,
    items,
    quarantined: input.quarantined.map(record => ({
      index: record.index,
      externalVariantRef: record.externalVariantRef,
      reasons: [...record.reasons],
    })),
    requiresAdminReview: true,
    canonicalImportBatchCreationPerformed: false,
    canonicalIdentityMutationPerformed: false,
    commercialActivationPerformed: false,
    capabilityPromotionPerformed: false,
    marketplaceListingPerformed: false,
  };
}
