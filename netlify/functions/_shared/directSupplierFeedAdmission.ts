import { createHash } from 'node:crypto';
import {
  validateDirectSupplierFeedBatch,
  type DirectSupplierFeedBatchV1,
  type DirectSupplierVariantRecord,
} from './directSupplierContract';
import {
  validateDirectSupplierOnboardingManifest,
  type DirectSupplierOnboardingManifestV1,
} from './directSupplierOnboarding';

const REQUIRED_FEED_CAPABILITIES = ['catalog', 'variants', 'price'] as const;
const MAX_TITLE_LENGTH = 512;
const MAX_REF_LENGTH = 256;
const MAX_IMAGES = 12;
const MAX_ATTRIBUTES = 64;
const MAX_ATTRIBUTE_KEY_LENGTH = 128;
const MAX_ATTRIBUTE_VALUE_LENGTH = 512;

export type DirectSupplierFeedQuarantineReason =
  | 'DUPLICATE_EXTERNAL_VARIANT_REF'
  | 'UNDECLARED_WAREHOUSE_COUNTRY'
  | 'INVALID_IMAGE_URL'
  | 'TOO_MANY_IMAGES'
  | 'TOO_MANY_ATTRIBUTES'
  | 'INVALID_ATTRIBUTE'
  | 'REF_TOO_LONG'
  | 'TITLE_TOO_LONG';

export interface DirectSupplierStagingCandidateV1 {
  supplierKey: string;
  sourceGeneratedAt: string;
  sourceTransport: DirectSupplierFeedBatchV1['transport'];
  externalProductRef: string;
  externalVariantRef: string;
  sku?: string;
  gtin?: string;
  title: string;
  currency: string;
  amountMinor: number;
  stockQuantity?: number;
  warehouseCountry: string;
  imageUrls: string[];
  attributes: Record<string, string>;
  sourceRecordDigest: string;
  ingestionState: 'staged_candidate';
  marketplaceListingAllowed: false;
}

export interface DirectSupplierQuarantinedRecordV1 {
  index: number;
  externalVariantRef?: string;
  reasons: DirectSupplierFeedQuarantineReason[];
}

export type DirectSupplierFeedAdmissionResult =
  | {
      ok: false;
      batchErrors: string[];
      accepted: [];
      quarantined: [];
    }
  | {
      ok: true;
      batchErrors: [];
      accepted: DirectSupplierStagingCandidateV1[];
      quarantined: DirectSupplierQuarantinedRecordV1[];
      commercialActivationPerformed: false;
      capabilityPromotionPerformed: false;
      marketplaceListingPerformed: false;
    };

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function normalizedOptional(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function validateHttpsImages(imageUrls: string[] | undefined): {
  normalized: string[];
  reasons: DirectSupplierFeedQuarantineReason[];
} {
  if (!imageUrls) return { normalized: [], reasons: [] };
  const reasons: DirectSupplierFeedQuarantineReason[] = [];
  if (imageUrls.length > MAX_IMAGES) reasons.push('TOO_MANY_IMAGES');

  const normalized: string[] = [];
  for (const raw of imageUrls.slice(0, MAX_IMAGES)) {
    try {
      const url = new URL(raw);
      if (url.protocol !== 'https:' || url.username || url.password) {
        reasons.push('INVALID_IMAGE_URL');
        continue;
      }
      normalized.push(url.toString());
    } catch {
      reasons.push('INVALID_IMAGE_URL');
    }
  }
  return { normalized: [...new Set(normalized)], reasons };
}

function validateAttributes(attributes: Record<string, string> | undefined): {
  normalized: Record<string, string>;
  reasons: DirectSupplierFeedQuarantineReason[];
} {
  if (!attributes) return { normalized: {}, reasons: [] };
  const entries = Object.entries(attributes);
  const reasons: DirectSupplierFeedQuarantineReason[] = [];
  if (entries.length > MAX_ATTRIBUTES) reasons.push('TOO_MANY_ATTRIBUTES');

  const normalized: Record<string, string> = {};
  for (const [rawKey, rawValue] of entries.slice(0, MAX_ATTRIBUTES)) {
    const key = rawKey.trim();
    const value = rawValue.trim();
    if (
      !key
      || key.length > MAX_ATTRIBUTE_KEY_LENGTH
      || value.length > MAX_ATTRIBUTE_VALUE_LENGTH
    ) {
      reasons.push('INVALID_ATTRIBUTE');
      continue;
    }
    normalized[key] = value;
  }
  return { normalized, reasons };
}

function normalizeCandidate(
  batch: DirectSupplierFeedBatchV1,
  variant: DirectSupplierVariantRecord,
): {
  candidate: DirectSupplierStagingCandidateV1;
  reasons: DirectSupplierFeedQuarantineReason[];
} {
  const reasons: DirectSupplierFeedQuarantineReason[] = [];
  const externalProductRef = variant.externalProductRef.trim();
  const externalVariantRef = variant.externalVariantRef.trim();
  const title = variant.title.trim();
  const warehouseCountry = variant.warehouseCountry.trim().toUpperCase();
  const currency = variant.currency.trim().toUpperCase();

  if (externalProductRef.length > MAX_REF_LENGTH || externalVariantRef.length > MAX_REF_LENGTH) {
    reasons.push('REF_TOO_LONG');
  }
  if (title.length > MAX_TITLE_LENGTH) reasons.push('TITLE_TOO_LONG');

  const images = validateHttpsImages(variant.imageUrls);
  const attributes = validateAttributes(variant.attributes);
  reasons.push(...images.reasons, ...attributes.reasons);

  const normalizedCore = {
    supplierKey: batch.supplierKey.trim(),
    sourceGeneratedAt: new Date(batch.generatedAt).toISOString(),
    sourceTransport: batch.transport,
    externalProductRef,
    externalVariantRef,
    sku: normalizedOptional(variant.sku),
    gtin: normalizedOptional(variant.gtin),
    title,
    currency,
    amountMinor: variant.amountMinor,
    stockQuantity: variant.stockQuantity,
    warehouseCountry,
    imageUrls: images.normalized,
    attributes: attributes.normalized,
  };

  return {
    candidate: {
      ...normalizedCore,
      sourceRecordDigest: sha256(JSON.stringify(normalizedCore)),
      ingestionState: 'staged_candidate',
      marketplaceListingAllowed: false,
    },
    reasons: [...new Set(reasons)],
  };
}

/**
 * Converts a validated Direct Supplier feed batch into non-commercial staging
 * candidates and explicit quarantines.
 *
 * This function does not write to Supabase, does not activate the provider,
 * does not advertise SupplierAdapter capabilities and does not publish products.
 * A future server-only ingestion route must persist these results to durable
 * staging/quarantine storage only after migration governance is reconciled.
 */
export function prepareDirectSupplierFeedForStaging(input: {
  manifest: DirectSupplierOnboardingManifestV1;
  batch: DirectSupplierFeedBatchV1;
}): DirectSupplierFeedAdmissionResult {
  const manifestErrors = validateDirectSupplierOnboardingManifest(input.manifest);
  const batchErrors = validateDirectSupplierFeedBatch(input.batch);

  if (input.batch.supplierKey.trim() !== input.manifest.supplierKey.trim()) {
    batchErrors.push('batch supplierKey must match onboarding supplierKey');
  }
  if (input.batch.transport !== input.manifest.feedTransport) {
    batchErrors.push('batch transport must match onboarding feedTransport');
  }
  for (const capability of REQUIRED_FEED_CAPABILITIES) {
    if (!input.manifest.requestedCapabilities.includes(capability)) {
      batchErrors.push(`requestedCapabilities must include ${capability} for feed staging`);
    }
  }
  if (input.batch.variants.some(variant => variant.stockQuantity !== undefined)
    && !input.manifest.requestedCapabilities.includes('stock')) {
    batchErrors.push('requestedCapabilities must include stock when feed records contain stockQuantity');
  }

  const combinedBatchErrors = [...new Set([...manifestErrors, ...batchErrors])];
  if (combinedBatchErrors.length > 0) {
    return { ok: false, batchErrors: combinedBatchErrors, accepted: [], quarantined: [] };
  }

  const declaredWarehouseCountries = new Set(
    input.manifest.warehouseDeclarations.map(warehouse => warehouse.country.trim().toUpperCase()),
  );
  const variantRefCounts = new Map<string, number>();
  for (const variant of input.batch.variants) {
    const ref = variant.externalVariantRef.trim();
    variantRefCounts.set(ref, (variantRefCounts.get(ref) ?? 0) + 1);
  }

  const accepted: DirectSupplierStagingCandidateV1[] = [];
  const quarantined: DirectSupplierQuarantinedRecordV1[] = [];

  for (const [index, variant] of input.batch.variants.entries()) {
    const { candidate, reasons } = normalizeCandidate(input.batch, variant);

    if ((variantRefCounts.get(candidate.externalVariantRef) ?? 0) > 1) {
      reasons.push('DUPLICATE_EXTERNAL_VARIANT_REF');
    }
    if (!declaredWarehouseCountries.has(candidate.warehouseCountry)) {
      reasons.push('UNDECLARED_WAREHOUSE_COUNTRY');
    }

    const uniqueReasons = [...new Set(reasons)];
    if (uniqueReasons.length > 0) {
      quarantined.push({
        index,
        externalVariantRef: candidate.externalVariantRef || undefined,
        reasons: uniqueReasons,
      });
      continue;
    }

    accepted.push(candidate);
  }

  return {
    ok: true,
    batchErrors: [],
    accepted,
    quarantined,
    commercialActivationPerformed: false,
    capabilityPromotionPerformed: false,
    marketplaceListingPerformed: false,
  };
}
