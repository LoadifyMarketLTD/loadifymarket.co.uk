import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { DirectSupplierFeedBatchV1 } from './directSupplierContract';
import type {
  DirectSupplierFeedAdmissionResult,
  DirectSupplierQuarantinedRecordV1,
  DirectSupplierStagingCandidateV1,
} from './directSupplierFeedAdmission';
import type { DirectSupplierReplayStore } from './directSupplierSecurity';

type RpcClient = Pick<SupabaseClient, 'rpc'>;

type AcceptedAdmission = Extract<DirectSupplierFeedAdmissionResult, { ok: true }>;

export interface DirectSupplierPersistenceResult {
  batchId: string;
  duplicate: boolean;
  status: 'staged';
  acceptedCount: number;
  quarantinedCount: number;
  commercialActivationPerformed: false;
  capabilityPromotionPerformed: false;
  marketplaceListingPerformed: false;
  interfaceVersion: 1;
}

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function stableQuarantineRecord(record: DirectSupplierQuarantinedRecordV1) {
  return {
    index: record.index,
    externalVariantRef: record.externalVariantRef,
    reasons: [...record.reasons].sort(),
  };
}

/**
 * Produces a non-secret idempotency digest for an already-admitted feed batch.
 * The digest contains no raw rejected provider payload and no customer PII.
 */
export function computeDirectSupplierStagingBatchDigest(input: {
  batch: DirectSupplierFeedBatchV1;
  accepted: DirectSupplierStagingCandidateV1[];
  quarantined: DirectSupplierQuarantinedRecordV1[];
}): string {
  return sha256(JSON.stringify({
    contractVersion: input.batch.contractVersion,
    supplierKey: input.batch.supplierKey.trim(),
    generatedAt: new Date(input.batch.generatedAt).toISOString(),
    transport: input.batch.transport,
    acceptedRecordDigests: input.accepted.map(record => record.sourceRecordDigest),
    quarantined: input.quarantined.map(stableQuarantineRecord),
  }));
}

function parsePersistenceResult(value: unknown): DirectSupplierPersistenceResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Direct Supplier persistence returned an invalid result');
  }
  const result = value as Record<string, unknown>;
  if (
    typeof result.batchId !== 'string'
    || typeof result.duplicate !== 'boolean'
    || result.status !== 'staged'
    || !Number.isInteger(result.acceptedCount)
    || !Number.isInteger(result.quarantinedCount)
    || result.commercialActivationPerformed !== false
    || result.capabilityPromotionPerformed !== false
    || result.marketplaceListingPerformed !== false
    || result.interfaceVersion !== 1
  ) {
    throw new Error('Direct Supplier persistence returned a fail-open or malformed result');
  }

  return result as unknown as DirectSupplierPersistenceResult;
}

/**
 * Durable implementation of DirectSupplierReplayStore backed by one atomic
 * Postgres RPC. The RPC remains service-role-only and the table is private.
 */
export function createSupabaseDirectSupplierReplayStore(input: {
  supabase: RpcClient;
  supplierKey: string;
}): DirectSupplierReplayStore {
  const supplierKey = input.supplierKey.trim();

  return {
    async claim(eventId, expiresAt) {
      const { data, error } = await input.supabase.rpc('server_direct_supplier_claim_event_v1', {
        p_supplier_key: supplierKey,
        p_event_id: eventId,
        p_expires_at: expiresAt.toISOString(),
      });

      if (error) {
        throw new Error(`Direct Supplier replay claim failed: ${error.message}`);
      }
      if (typeof data !== 'boolean') {
        throw new Error('Direct Supplier replay claim returned an invalid result');
      }
      return data;
    },
  };
}

/**
 * Persists only the sanitized output of prepareDirectSupplierFeedForStaging.
 * Rejected batch contracts are never persisted. This does not create canonical
 * supplier products, activate suppliers, promote capabilities or publish listings.
 */
export async function persistDirectSupplierFeedAdmission(input: {
  supabase: RpcClient;
  batch: DirectSupplierFeedBatchV1;
  admission: DirectSupplierFeedAdmissionResult;
}): Promise<DirectSupplierPersistenceResult> {
  if (!input.admission.ok) {
    throw new Error('Direct Supplier batch must pass feed admission before persistence');
  }

  const admission: AcceptedAdmission = input.admission;
  const batchDigest = computeDirectSupplierStagingBatchDigest({
    batch: input.batch,
    accepted: admission.accepted,
    quarantined: admission.quarantined,
  });

  const { data, error } = await input.supabase.rpc('server_persist_direct_supplier_feed_v1', {
    p_supplier_key: input.batch.supplierKey.trim(),
    p_source_generated_at: new Date(input.batch.generatedAt).toISOString(),
    p_source_transport: input.batch.transport,
    p_source_batch_digest: batchDigest,
    p_candidates: admission.accepted,
    p_quarantined: admission.quarantined,
  });

  if (error) {
    throw new Error(`Direct Supplier feed persistence failed: ${error.message}`);
  }

  const result = parsePersistenceResult(data);
  if (
    result.acceptedCount !== admission.accepted.length
    || result.quarantinedCount !== admission.quarantined.length
  ) {
    throw new Error('Direct Supplier persistence count mismatch');
  }
  return result;
}
