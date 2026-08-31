import type { SupabaseClient } from '@supabase/supabase-js';
import type { DirectSupplierFeedTransport } from './directSupplierContract';
import type {
  DirectSupplierFeedQuarantineReason,
  DirectSupplierQuarantinedRecordV1,
  DirectSupplierStagingCandidateV1,
} from './directSupplierFeedAdmission';
import {
  prepareDirectSupplierCanonicalReviewPackage,
  type DirectSupplierCanonicalReviewPackageV1,
} from './directSupplierCanonicalReview';

const SUPPLIER_KEY = /^[a-z0-9][a-z0-9_-]{2,63}$/;
const SHA256_HEX = /^[a-f0-9]{64}$/;
const TRANSPORTS = new Set<DirectSupplierFeedTransport>(['json_api', 'json_feed', 'csv', 'xml', 'sftp']);
const QUARANTINE_REASONS = new Set<DirectSupplierFeedQuarantineReason>([
  'DUPLICATE_EXTERNAL_VARIANT_REF',
  'UNDECLARED_WAREHOUSE_COUNTRY',
  'INVALID_IMAGE_URL',
  'TOO_MANY_IMAGES',
  'TOO_MANY_ATTRIBUTES',
  'INVALID_ATTRIBUTE',
  'REF_TOO_LONG',
  'TITLE_TOO_LONG',
]);

export type DirectSupplierStagingReviewReadResult =
  | { ok: true; reviewPackage: DirectSupplierCanonicalReviewPackageV1 }
  | { ok: false; kind: 'validation' | 'not_found' | 'upstream'; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${field} is required`);
  return value;
}

function asBooleanFalse(value: unknown, field: string): false {
  if (value !== false) throw new Error(`${field} must remain false`);
  return false;
}

function asSafeInteger(value: unknown, field: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) throw new Error(`${field} must be a non-negative safe integer`);
  return value as number;
}

function asOptionalSafeInteger(value: unknown, field: string): number | undefined {
  if (value === null || value === undefined) return undefined;
  return asSafeInteger(value, field);
}

function asStringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) {
    throw new Error(`${field} must be a string array`);
  }
  return value as string[];
}

function parseCandidate(value: unknown): DirectSupplierStagingCandidateV1 {
  if (!isRecord(value)) throw new Error('accepted candidate must be an object');
  if (!isRecord(value.attributes)) throw new Error('accepted candidate attributes must be an object');
  const attributes: Record<string, string> = {};
  for (const [key, attributeValue] of Object.entries(value.attributes)) {
    if (typeof attributeValue !== 'string') throw new Error('accepted candidate attribute values must be strings');
    attributes[key] = attributeValue;
  }

  const sourceTransport = asString(value.sourceTransport, 'accepted candidate sourceTransport') as DirectSupplierFeedTransport;
  if (!TRANSPORTS.has(sourceTransport)) throw new Error('accepted candidate sourceTransport is unsupported');

  const sourceRecordDigest = asString(value.sourceRecordDigest, 'accepted candidate sourceRecordDigest').toLowerCase();
  if (!SHA256_HEX.test(sourceRecordDigest)) throw new Error('accepted candidate sourceRecordDigest is invalid');

  const ingestionState = asString(value.ingestionState, 'accepted candidate ingestionState');
  if (ingestionState !== 'staged_candidate') throw new Error('accepted candidate ingestionState must remain staged_candidate');

  asBooleanFalse(value.marketplaceListingAllowed, 'accepted candidate marketplaceListingAllowed');

  return {
    supplierKey: asString(value.supplierKey, 'accepted candidate supplierKey'),
    sourceGeneratedAt: asString(value.sourceGeneratedAt, 'accepted candidate sourceGeneratedAt'),
    sourceTransport,
    externalProductRef: asString(value.externalProductRef, 'accepted candidate externalProductRef'),
    externalVariantRef: asString(value.externalVariantRef, 'accepted candidate externalVariantRef'),
    sku: typeof value.sku === 'string' && value.sku.trim() ? value.sku : undefined,
    gtin: typeof value.gtin === 'string' && value.gtin.trim() ? value.gtin : undefined,
    title: asString(value.title, 'accepted candidate title'),
    currency: asString(value.currency, 'accepted candidate currency'),
    amountMinor: asSafeInteger(value.amountMinor, 'accepted candidate amountMinor'),
    stockQuantity: asOptionalSafeInteger(value.stockQuantity, 'accepted candidate stockQuantity'),
    warehouseCountry: asString(value.warehouseCountry, 'accepted candidate warehouseCountry'),
    imageUrls: asStringArray(value.imageUrls, 'accepted candidate imageUrls'),
    attributes,
    sourceRecordDigest,
    ingestionState: 'staged_candidate',
    marketplaceListingAllowed: false,
  };
}

function parseQuarantine(value: unknown): DirectSupplierQuarantinedRecordV1 {
  if (!isRecord(value)) throw new Error('quarantined record must be an object');
  const index = asSafeInteger(value.index, 'quarantined record index');
  const reasons = asStringArray(value.reasons, 'quarantined record reasons');
  if (reasons.length === 0 || reasons.some(reason => !QUARANTINE_REASONS.has(reason as DirectSupplierFeedQuarantineReason))) {
    throw new Error('quarantined record contains unsupported reasons');
  }
  return {
    index,
    externalVariantRef: typeof value.externalVariantRef === 'string' && value.externalVariantRef.trim()
      ? value.externalVariantRef
      : undefined,
    reasons: reasons as DirectSupplierFeedQuarantineReason[],
  };
}

export async function readDirectSupplierStagingReview(
  admin: Pick<SupabaseClient, 'rpc'>,
  input: { supplierKey: string; sourceBatchDigest: string },
): Promise<DirectSupplierStagingReviewReadResult> {
  const supplierKey = input.supplierKey.trim().toLowerCase();
  const sourceBatchDigest = input.sourceBatchDigest.trim().toLowerCase();
  if (!SUPPLIER_KEY.test(supplierKey)) {
    return { ok: false, kind: 'validation', error: 'supplierKey is invalid' };
  }
  if (!SHA256_HEX.test(sourceBatchDigest)) {
    return { ok: false, kind: 'validation', error: 'sourceBatchDigest is invalid' };
  }

  const { data, error } = await admin.rpc('server_get_direct_supplier_staging_review_v1', {
    p_supplier_key: supplierKey,
    p_source_batch_digest: sourceBatchDigest,
  });

  if (error) {
    const message = typeof error.message === 'string' ? error.message : 'Unable to read Direct Supplier staging review';
    if (/not found/i.test(message)) return { ok: false, kind: 'not_found', error: 'Direct Supplier staged batch not found' };
    if (/invalid|limit|too large|must/i.test(message)) return { ok: false, kind: 'validation', error: message };
    return { ok: false, kind: 'upstream', error: 'Unable to read Direct Supplier staging review' };
  }

  try {
    if (!isRecord(data)) throw new Error('staging review RPC returned a malformed response');
    if (data.interfaceVersion !== 1) throw new Error('staging review RPC interfaceVersion is unsupported');
    if (data.status !== 'staged') throw new Error('staging review RPC returned a non-staged batch');
    asBooleanFalse(data.commercialActivationPerformed, 'commercialActivationPerformed');
    asBooleanFalse(data.capabilityPromotionPerformed, 'capabilityPromotionPerformed');
    asBooleanFalse(data.marketplaceListingPerformed, 'marketplaceListingPerformed');
    asBooleanFalse(data.canonicalImportBatchCreationPerformed, 'canonicalImportBatchCreationPerformed');
    asBooleanFalse(data.canonicalIdentityMutationPerformed, 'canonicalIdentityMutationPerformed');

    const responseSupplierKey = asString(data.supplierKey, 'supplierKey').trim().toLowerCase();
    const responseDigest = asString(data.sourceBatchDigest, 'sourceBatchDigest').trim().toLowerCase();
    if (responseSupplierKey !== supplierKey || responseDigest !== sourceBatchDigest) {
      throw new Error('staging review RPC response binding mismatch');
    }

    const sourceGeneratedAt = asString(data.sourceGeneratedAt, 'sourceGeneratedAt');
    if (!Number.isFinite(Date.parse(sourceGeneratedAt))) throw new Error('sourceGeneratedAt is invalid');
    const sourceTransport = asString(data.sourceTransport, 'sourceTransport') as DirectSupplierFeedTransport;
    if (!TRANSPORTS.has(sourceTransport)) throw new Error('sourceTransport is unsupported');
    if (!Array.isArray(data.accepted) || !Array.isArray(data.quarantined)) {
      throw new Error('staging review RPC records must be arrays');
    }

    const accepted = data.accepted.map(parseCandidate);
    const quarantined = data.quarantined.map(parseQuarantine);
    if (asSafeInteger(data.acceptedCount, 'acceptedCount') !== accepted.length) {
      throw new Error('acceptedCount does not match accepted records');
    }
    if (asSafeInteger(data.quarantinedCount, 'quarantinedCount') !== quarantined.length) {
      throw new Error('quarantinedCount does not match quarantined records');
    }

    return {
      ok: true,
      reviewPackage: prepareDirectSupplierCanonicalReviewPackage({
        supplierKey,
        sourceBatchDigest,
        sourceGeneratedAt,
        sourceTransport,
        accepted,
        quarantined,
      }),
    };
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : 'Malformed Direct Supplier staging review response';
    return { ok: false, kind: 'upstream', error: message };
  }
}
