import type { SupabaseClient } from '@supabase/supabase-js';
import {
  DIRECT_SUPPLIER_CONTRACT_VERSION,
  validateDirectSupplierWebhookEnvelope,
  type DirectSupplierFeedBatchV1,
  type DirectSupplierWebhookEnvelopeV1,
} from './directSupplierContract';
import {
  prepareDirectSupplierFeedForStaging,
  type DirectSupplierFeedAdmissionResult,
} from './directSupplierFeedAdmission';
import type { DirectSupplierOnboardingManifestV1 } from './directSupplierOnboarding';
import { computeDirectSupplierStagingBatchDigest } from './directSupplierPersistence';
import { verifyDirectSupplierWebhookSignature } from './directSupplierSecurity';

type RpcClient = Pick<SupabaseClient, 'rpc'>;

type AtomicCommitSuccess = {
  eventClaimed: true;
  replayed: false;
  persisted: true;
  batchId: string;
  duplicate: boolean;
  status: 'staged';
  acceptedCount: number;
  quarantinedCount: number;
  commercialActivationPerformed: false;
  capabilityPromotionPerformed: false;
  marketplaceListingPerformed: false;
  interfaceVersion: 1;
};

type AtomicCommitReplay = {
  eventClaimed: false;
  replayed: true;
  persisted: false;
  commercialActivationPerformed: false;
  capabilityPromotionPerformed: false;
  marketplaceListingPerformed: false;
  interfaceVersion: 1;
};

export type DirectSupplierSignedFeedCommitResult = AtomicCommitSuccess | AtomicCommitReplay;

export type DirectSupplierSignedFeedPipelineResult =
  | { ok: true; commit: DirectSupplierSignedFeedCommitResult }
  | {
      ok: false;
      reason:
        | 'SIGNATURE_REJECTED'
        | 'INVALID_JSON'
        | 'INVALID_ENVELOPE'
        | 'UNSUPPORTED_EVENT_TYPE'
        | 'SUPPLIER_MISMATCH'
        | 'INVALID_FEED_PAYLOAD'
        | 'FEED_ADMISSION_REJECTED';
      details: string[];
    };

const SIGNED_FEED_EVENT_TYPES = new Set(['catalog.updated', 'stock.updated', 'price.updated']);
const DEFAULT_REPLAY_RETENTION_SECONDS = 86400;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return isRecord(value) && Object.values(value).every(item => typeof item === 'string');
}

function isFeedBatchPayload(value: unknown): value is DirectSupplierFeedBatchV1 {
  if (!isRecord(value)) return false;
  if (value.contractVersion !== DIRECT_SUPPLIER_CONTRACT_VERSION) return false;
  if (typeof value.supplierKey !== 'string' || typeof value.generatedAt !== 'string') return false;
  if (typeof value.transport !== 'string' || !Array.isArray(value.variants)) return false;

  for (const variant of value.variants) {
    if (!isRecord(variant)) return false;
    if (
      typeof variant.externalProductRef !== 'string'
      || typeof variant.externalVariantRef !== 'string'
      || typeof variant.title !== 'string'
      || typeof variant.currency !== 'string'
      || typeof variant.amountMinor !== 'number'
      || typeof variant.warehouseCountry !== 'string'
    ) {
      return false;
    }
    if (variant.sku !== undefined && typeof variant.sku !== 'string') return false;
    if (variant.gtin !== undefined && typeof variant.gtin !== 'string') return false;
    if (variant.stockQuantity !== undefined && typeof variant.stockQuantity !== 'number') return false;
    if (
      variant.imageUrls !== undefined
      && (!Array.isArray(variant.imageUrls) || !variant.imageUrls.every(item => typeof item === 'string'))
    ) {
      return false;
    }
    if (variant.attributes !== undefined && !isStringRecord(variant.attributes)) return false;
  }

  return true;
}

function parseAtomicCommitResult(value: unknown): DirectSupplierSignedFeedCommitResult {
  if (!isRecord(value)) {
    throw new Error('Direct Supplier atomic commit returned an invalid result');
  }

  const failClosedFlags = (
    value.commercialActivationPerformed === false
    && value.capabilityPromotionPerformed === false
    && value.marketplaceListingPerformed === false
    && value.interfaceVersion === 1
  );
  if (!failClosedFlags) {
    throw new Error('Direct Supplier atomic commit returned a fail-open result');
  }

  if (
    value.eventClaimed === false
    && value.replayed === true
    && value.persisted === false
  ) {
    return value as AtomicCommitReplay;
  }

  if (
    value.eventClaimed === true
    && value.replayed === false
    && value.persisted === true
    && typeof value.batchId === 'string'
    && typeof value.duplicate === 'boolean'
    && value.status === 'staged'
    && Number.isInteger(value.acceptedCount)
    && Number.isInteger(value.quarantinedCount)
  ) {
    return value as AtomicCommitSuccess;
  }

  throw new Error('Direct Supplier atomic commit returned an invalid state');
}

function admissionDetails(admission: DirectSupplierFeedAdmissionResult): string[] {
  return admission.ok ? [] : admission.batchErrors;
}

/**
 * Verifies and stages one signed Direct Supplier feed event without exposing a
 * public route. Only catalog/stock/price feed events are accepted here. Order,
 * shipment, cancellation, return and reimbursement events remain blocked.
 *
 * The database call is deliberately a single RPC so the durable replay claim
 * and staging/quarantine persistence commit or roll back together.
 */
export async function processDirectSupplierSignedFeed(input: {
  supabase: RpcClient;
  manifest: DirectSupplierOnboardingManifestV1;
  secret: string | undefined;
  timestamp: string | undefined;
  signature: string | undefined;
  rawBody: string;
  now?: Date;
  replayRetentionSeconds?: number;
}): Promise<DirectSupplierSignedFeedPipelineResult> {
  const verification = verifyDirectSupplierWebhookSignature({
    secret: input.secret,
    timestamp: input.timestamp,
    signature: input.signature,
    rawBody: input.rawBody,
    now: input.now,
  });
  if (!verification.ok) {
    return { ok: false, reason: 'SIGNATURE_REJECTED', details: [verification.reason] };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(input.rawBody) as unknown;
  } catch {
    return { ok: false, reason: 'INVALID_JSON', details: ['raw body must contain valid JSON'] };
  }

  const envelopeErrors = validateDirectSupplierWebhookEnvelope(parsed);
  if (envelopeErrors.length > 0) {
    return { ok: false, reason: 'INVALID_ENVELOPE', details: envelopeErrors };
  }

  const envelope = parsed as DirectSupplierWebhookEnvelopeV1;
  if (!SIGNED_FEED_EVENT_TYPES.has(envelope.eventType)) {
    return {
      ok: false,
      reason: 'UNSUPPORTED_EVENT_TYPE',
      details: [`${envelope.eventType} is not enabled for Direct Supplier feed ingestion`],
    };
  }

  const manifestSupplierKey = input.manifest.supplierKey.trim();
  if (envelope.supplierKey.trim() !== manifestSupplierKey) {
    return {
      ok: false,
      reason: 'SUPPLIER_MISMATCH',
      details: ['signed envelope supplierKey must match onboarding manifest'],
    };
  }

  if (!isFeedBatchPayload(envelope.payload)) {
    return {
      ok: false,
      reason: 'INVALID_FEED_PAYLOAD',
      details: ['signed feed payload does not match DirectSupplierFeedBatchV1'],
    };
  }

  const batch = envelope.payload;
  if (batch.supplierKey.trim() !== envelope.supplierKey.trim()) {
    return {
      ok: false,
      reason: 'SUPPLIER_MISMATCH',
      details: ['feed payload supplierKey must match signed envelope supplierKey'],
    };
  }

  const admission = prepareDirectSupplierFeedForStaging({ manifest: input.manifest, batch });
  if (!admission.ok) {
    return {
      ok: false,
      reason: 'FEED_ADMISSION_REJECTED',
      details: admissionDetails(admission),
    };
  }

  const retentionSeconds = input.replayRetentionSeconds ?? DEFAULT_REPLAY_RETENTION_SECONDS;
  if (!Number.isSafeInteger(retentionSeconds) || retentionSeconds < 300 || retentionSeconds > 604800) {
    throw new Error('Direct Supplier replay retention is outside the allowed range');
  }

  const expiresAt = new Date((verification.timestampSeconds + retentionSeconds) * 1000);
  const batchDigest = computeDirectSupplierStagingBatchDigest({
    batch,
    accepted: admission.accepted,
    quarantined: admission.quarantined,
  });

  const { data, error } = await input.supabase.rpc('server_commit_direct_supplier_signed_feed_v1', {
    p_supplier_key: manifestSupplierKey,
    p_event_id: envelope.eventId.trim(),
    p_expires_at: expiresAt.toISOString(),
    p_source_generated_at: new Date(batch.generatedAt).toISOString(),
    p_source_transport: batch.transport,
    p_source_batch_digest: batchDigest,
    p_candidates: admission.accepted,
    p_quarantined: admission.quarantined,
  });

  if (error) {
    throw new Error(`Direct Supplier atomic signed feed commit failed: ${error.message}`);
  }

  const commit = parseAtomicCommitResult(data);
  if (
    commit.persisted
    && (
      commit.acceptedCount !== admission.accepted.length
      || commit.quarantinedCount !== admission.quarantined.length
    )
  ) {
    throw new Error('Direct Supplier atomic commit count mismatch');
  }

  return { ok: true, commit };
}
