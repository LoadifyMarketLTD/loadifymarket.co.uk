import { createHash } from 'node:crypto';
import type {
  DirectSupplierCanonicalReviewItemV1,
  DirectSupplierCanonicalReviewPackageV1,
} from './directSupplierCanonicalReview';
import type { DirectSupplierFoundationBindingV1 } from './directSupplierFoundationBinding';

export const DIRECT_SUPPLIER_PHASE_E_IDENTITY_HASH_SEMANTICS =
  'direct_supplier_normalized_identity_evidence_v1' as const;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256_HEX = /^[a-f0-9]{64}$/;

function canonicalJson(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(',')}]`;
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .filter(key => record[key] !== undefined)
      .sort()
      .map(key => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
      .join(',')}}`;
  }
  throw new Error('Direct Supplier identity evidence contains an unsupported value');
}

function required(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${field} is required for Direct Supplier Phase E identity evidence`);
  return normalized;
}

function identityProjection(item: DirectSupplierCanonicalReviewItemV1) {
  const identifiers = item.identifierEvidence
    .map(identifier => ({
      identifierType: identifier.identifierType,
      identifierNamespace: required(identifier.identifierNamespace, 'identifierNamespace'),
      rawValue: required(identifier.rawValue, 'identifier rawValue'),
      normalizedValue: required(identifier.normalizedValue, 'identifier normalizedValue'),
    }))
    .sort((left, right) => canonicalJson(left).localeCompare(canonicalJson(right)));

  const attributes = item.attributeEvidence
    .map(attribute => ({
      key: required(attribute.key, 'attribute key'),
      value: required(attribute.value, 'attribute value'),
    }))
    .sort((left, right) => canonicalJson(left).localeCompare(canonicalJson(right)));

  return {
    interfaceVersion: 1,
    semantics: DIRECT_SUPPLIER_PHASE_E_IDENTITY_HASH_SEMANTICS,
    supplierKey: required(item.supplierKey, 'supplierKey'),
    externalProductRef: required(item.externalProductRef, 'externalProductRef'),
    externalVariantRef: required(item.externalVariantRef, 'externalVariantRef'),
    workingLabel: required(item.workingLabelProposal, 'workingLabelProposal'),
    identifiers,
    attributes,
  } as const;
}

/**
 * Returns a deterministic SHA-256 digest over Direct Supplier identity evidence.
 *
 * The projection deliberately excludes price, stock, currency, warehouse,
 * timestamps, asset URLs, source refs and raw provider payload bytes. Commercial
 * or transport-only changes therefore cannot masquerade as a product identity
 * change. The historical Phase E `rawIdentityHash` field receives this opaque
 * identity-evidence digest for Direct Supplier; it does not mean raw payload
 * bytes are stored or hashed here.
 */
export function computeDirectSupplierPhaseEIdentityEvidenceHash(
  item: DirectSupplierCanonicalReviewItemV1,
): string {
  return createHash('sha256').update(canonicalJson(identityProjection(item)), 'utf8').digest('hex');
}

export interface DirectSupplierPhaseECatalogCapturePlanItemV1 {
  interfaceVersion: 1;
  action: 'upsert_supplier_catalog_item';
  identityHashSemantics: typeof DIRECT_SUPPLIER_PHASE_E_IDENTITY_HASH_SEMANTICS;
  sourceRecordDigest: string;
  payload: {
    supplierId: string;
    externalProductRef: string;
    externalVariantRef: string;
    sourceRef: string;
    sourceObservedAt: string;
    rawIdentityHash: string;
  };
  commercialObservationExcludedFromIdentityHash: true;
  mutationPerformed: false;
}

export interface DirectSupplierPhaseECatalogCapturePlanV1 {
  interfaceVersion: 1;
  supplierKey: string;
  sourceBatchDigest: string;
  captureAllowed: boolean;
  reason: 'supplier_foundation_missing' | 'identity_capture_blocked' | 'identity_capture_ready';
  supplierId?: string;
  items: DirectSupplierPhaseECatalogCapturePlanItemV1[];
  foundationMutationPerformed: false;
  canonicalIdentityMutationPerformed: false;
  canonicalImportBatchCreationPerformed: false;
  commercialActivationPerformed: false;
  capabilityPromotionPerformed: false;
  marketplaceListingPerformed: false;
}

function planBase(input: {
  reviewPackage: DirectSupplierCanonicalReviewPackageV1;
  captureAllowed: boolean;
  reason: DirectSupplierPhaseECatalogCapturePlanV1['reason'];
  supplierId?: string;
  items?: DirectSupplierPhaseECatalogCapturePlanItemV1[];
}): DirectSupplierPhaseECatalogCapturePlanV1 {
  return {
    interfaceVersion: 1,
    supplierKey: input.reviewPackage.supplierKey,
    sourceBatchDigest: input.reviewPackage.sourceBatchDigest,
    captureAllowed: input.captureAllowed,
    reason: input.reason,
    supplierId: input.supplierId,
    items: input.items ?? [],
    foundationMutationPerformed: false,
    canonicalIdentityMutationPerformed: false,
    canonicalImportBatchCreationPerformed: false,
    commercialActivationPerformed: false,
    capabilityPromotionPerformed: false,
    marketplaceListingPerformed: false,
  };
}

/**
 * Builds, but never executes, the existing Phase E `upsert_supplier_catalog_item`
 * payloads for one reviewed Direct Supplier staging batch.
 *
 * Execution remains an explicit active-admin action through the existing
 * provider-neutral catalog mutation surface. This helper creates no Supplier
 * Foundation record, canonical product, identifier, offer or import batch.
 */
export function prepareDirectSupplierPhaseECatalogCapturePlan(input: {
  reviewPackage: DirectSupplierCanonicalReviewPackageV1;
  foundationBinding: DirectSupplierFoundationBindingV1;
}): DirectSupplierPhaseECatalogCapturePlanV1 {
  const { reviewPackage, foundationBinding } = input;

  if (reviewPackage.supplierKey !== foundationBinding.supplierKey) {
    throw new Error('Direct Supplier review and Supplier Foundation binding must use the same supplierKey');
  }
  if (
    reviewPackage.canonicalIdentityMutationPerformed !== false
    || reviewPackage.canonicalImportBatchCreationPerformed !== false
    || reviewPackage.commercialActivationPerformed !== false
    || reviewPackage.capabilityPromotionPerformed !== false
    || reviewPackage.marketplaceListingPerformed !== false
  ) {
    throw new Error('Direct Supplier Phase E capture planning requires a fail-closed review package');
  }
  if (
    foundationBinding.foundationMutationPerformed !== false
    || foundationBinding.canonicalIdentityMutationPerformed !== false
    || foundationBinding.canonicalImportBatchCreationPerformed !== false
    || foundationBinding.commercialActivationPerformed !== false
    || foundationBinding.capabilityPromotionPerformed !== false
    || foundationBinding.marketplaceListingPerformed !== false
  ) {
    throw new Error('Direct Supplier Phase E capture planning requires a fail-closed foundation binding');
  }

  if (!foundationBinding.supplierFound) {
    return planBase({ reviewPackage, captureAllowed: false, reason: 'supplier_foundation_missing' });
  }

  if (!foundationBinding.identityCaptureAllowed) {
    return planBase({
      reviewPackage,
      captureAllowed: false,
      reason: 'identity_capture_blocked',
      supplierId: foundationBinding.supplierId,
    });
  }

  const supplierId = foundationBinding.supplierId ?? '';
  if (!UUID_RE.test(supplierId) || foundationBinding.lifecycleStatus === 'banned') {
    throw new Error('Direct Supplier identity capture binding is internally inconsistent');
  }

  const items = reviewPackage.items.map(item => {
    const sourceRecordDigest = item.sourceRecordDigest.trim().toLowerCase();
    if (!SHA256_HEX.test(sourceRecordDigest)) {
      throw new Error('Direct Supplier sourceRecordDigest must be a SHA-256 hex digest');
    }

    return {
      interfaceVersion: 1 as const,
      action: 'upsert_supplier_catalog_item' as const,
      identityHashSemantics: DIRECT_SUPPLIER_PHASE_E_IDENTITY_HASH_SEMANTICS,
      sourceRecordDigest,
      payload: {
        supplierId,
        externalProductRef: required(item.externalProductRef, 'externalProductRef'),
        externalVariantRef: required(item.externalVariantRef, 'externalVariantRef'),
        sourceRef: required(item.sourceRef, 'sourceRef'),
        sourceObservedAt: required(item.sourceObservedAt, 'sourceObservedAt'),
        rawIdentityHash: computeDirectSupplierPhaseEIdentityEvidenceHash(item),
      },
      commercialObservationExcludedFromIdentityHash: true as const,
      mutationPerformed: false as const,
    };
  });

  return planBase({
    reviewPackage,
    captureAllowed: true,
    reason: 'identity_capture_ready',
    supplierId,
    items,
  });
}
