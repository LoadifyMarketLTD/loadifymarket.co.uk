import { createHash } from 'node:crypto';
import type { DirectSupplierFeedBatchV1 } from './directSupplierContract';
import type {
  DirectSupplierQuarantinedRecordV1,
  DirectSupplierStagingCandidateV1,
} from './directSupplierFeedAdmission';

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
 *
 * Durable replay claiming and feed persistence are intentionally not exposed as
 * separate TypeScript helpers. Signed feed ingestion must use the atomic commit
 * pipeline so replay claim and staging persistence share one database transaction.
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
