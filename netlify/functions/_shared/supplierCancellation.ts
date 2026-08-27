import type { SupabaseClient } from '@supabase/supabase-js';
import type { SupplierAdapterContext, SupplierAdapterResult, SupplierAdapterV1 } from './supplierAdapter';
import { adapterSupports } from './supplierAdapter';
import { recordSupplierCommerceOperation } from './supplierCommerceControl';

export const SUPPLIER_CANCELLATION_INTERFACE_VERSION = 1 as const;

interface PreparedCancellation {
  eligible: true;
  reason: string;
  cancellationId: string;
  state: string;
  providerKey: string;
  adapterVersion: string;
  supplierKey: string;
  territory: string;
  externalSupplierOrderRef: string;
  cancellationKey: string;
  correlationId: string;
  interfaceVersion: 1;
}

function isPrepared(value: unknown): value is PreparedCancellation {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return row.eligible === true
    && typeof row.cancellationId === 'string'
    && typeof row.providerKey === 'string'
    && typeof row.adapterVersion === 'string'
    && typeof row.supplierKey === 'string'
    && typeof row.territory === 'string'
    && typeof row.externalSupplierOrderRef === 'string'
    && typeof row.cancellationKey === 'string'
    && typeof row.correlationId === 'string'
    && row.interfaceVersion === SUPPLIER_CANCELLATION_INTERFACE_VERSION;
}

function classifyFailure(result: Exclude<SupplierAdapterResult<{ cancelled: boolean }>, { ok: true }>): string {
  switch (result.errorClass) {
    case 'RATE_LIMITED': return 'RATE_LIMITED';
    case 'RETRYABLE_FAILURE': return 'RETRYABLE_FAILURE';
    case 'PERMANENT_REJECTION': return 'PERMANENT_REJECTION';
    case 'AUTH_CONFIGURATION_FAILURE': return 'AUTH_CONFIGURATION_FAILURE';
    case 'UNKNOWN_OUTCOME':
    case 'MALFORMED_RESPONSE': return 'UNKNOWN_OUTCOME';
    default: return 'MANUAL_REVIEW_REQUIRED';
  }
}

async function recordResult(
  client: SupabaseClient,
  cancellationId: string,
  resultClass: string,
  cancelled: boolean,
  errorClass?: string,
  errorMessage?: string,
): Promise<Record<string, unknown> | null> {
  const { data, error } = await client.rpc('server_record_supplier_order_cancellation_result_v1', {
    p_cancellation_id: cancellationId,
    p_result_class: resultClass,
    p_cancelled: cancelled,
    p_error_class: errorClass ?? null,
    p_error_message: errorMessage ?? null,
  });
  if (error || !data || typeof data !== 'object') return null;
  return data as Record<string, unknown>;
}

/**
 * Cancels one already-accepted supplier order through the exact provider/adapter
 * version pinned by the canonical handshake. Unknown outcomes are persisted as
 * reconciliation_required and this helper never blindly retries them.
 */
export async function cancelAcceptedSupplierOrder(
  client: SupabaseClient,
  adapter: SupplierAdapterV1,
  input: { handshakeId: string; cancellationKey: string; correlationId: string },
): Promise<{ ok: boolean; state: string; cancellationId?: string; recoveryState?: string; reason?: string; errorClass?: string }> {
  const startedAt = new Date().toISOString();
  const { data: rawPrepared, error: prepareError } = await client.rpc('server_prepare_supplier_order_cancellation_v1', {
    p_handshake_id: input.handshakeId,
    p_cancellation_key: input.cancellationKey,
    p_correlation_id: input.correlationId,
  });
  if (prepareError || !isPrepared(rawPrepared)) {
    const reason = rawPrepared && typeof rawPrepared === 'object' && typeof (rawPrepared as { reason?: unknown }).reason === 'string'
      ? String((rawPrepared as { reason: string }).reason)
      : 'supplier_cancellation_not_ready';
    return { ok: false, state: 'blocked', reason };
  }
  const prepared = rawPrepared;

  if (prepared.state === 'cancelled') {
    return { ok: true, state: 'cancelled', cancellationId: prepared.cancellationId, recoveryState: 'resolved' };
  }
  if (prepared.state === 'reconciliation_required' || prepared.state === 'unknown') {
    return { ok: false, state: prepared.state, cancellationId: prepared.cancellationId, recoveryState: 'query_before_retry' };
  }

  if (
    adapter.interfaceVersion !== 1
    || adapter.providerKey !== prepared.providerKey
    || adapter.adapterVersion !== prepared.adapterVersion
    || !adapterSupports(adapter, 'cancellation')
    || !adapter.cancelOrder
  ) {
    return {
      ok: false,
      state: 'manual_review',
      cancellationId: prepared.cancellationId,
      errorClass: 'CAPABILITY_UNAVAILABLE',
    };
  }

  const { data: startData, error: startError } = await client.rpc('server_mark_supplier_order_cancellation_started_v1', {
    p_cancellation_id: prepared.cancellationId,
    p_cancellation_key: prepared.cancellationKey,
  });
  if (startError || !startData || typeof startData !== 'object' || (startData as { ok?: unknown }).ok !== true) {
    const reason = startData && typeof startData === 'object' && typeof (startData as { reason?: unknown }).reason === 'string'
      ? String((startData as { reason: string }).reason)
      : 'supplier_cancellation_start_blocked';
    return { ok: false, state: 'blocked', cancellationId: prepared.cancellationId, reason };
  }

  const context: SupplierAdapterContext = {
    correlationId: prepared.correlationId,
    idempotencyKey: prepared.cancellationKey,
    supplierKey: prepared.supplierKey,
    territory: prepared.territory,
  };

  let result: SupplierAdapterResult<{ cancelled: boolean }>;
  try {
    result = await adapter.cancelOrder(context, prepared.externalSupplierOrderRef);
  } catch (error) {
    result = {
      ok: false,
      errorClass: 'UNKNOWN_OUTCOME',
      message: error instanceof Error ? error.message : 'supplier cancellation threw before outcome was known',
      externalRef: prepared.externalSupplierOrderRef,
    };
  }

  if (!result.ok) {
    const resultClass = classifyFailure(result);
    const persisted = await recordResult(
      client,
      prepared.cancellationId,
      resultClass,
      false,
      result.errorClass,
      result.message,
    );
    const recoveryState = typeof persisted?.recoveryState === 'string'
      ? persisted.recoveryState
      : resultClass === 'UNKNOWN_OUTCOME' ? 'query_before_retry' : resultClass === 'RETRYABLE_FAILURE' || resultClass === 'RATE_LIMITED' ? 'retry_pending' : 'manual_review';

    await recordSupplierCommerceOperation(client, {
      correlationId: prepared.correlationId,
      requestId: prepared.cancellationKey,
      operation: 'cancellation',
      providerRef: prepared.providerKey,
      supplierRef: prepared.supplierKey,
      entityType: 'supplier_order_cancellation',
      entityRef: prepared.cancellationId,
      resultClass: resultClass as 'RETRYABLE_FAILURE' | 'PERMANENT_REJECTION' | 'AUTH_CONFIGURATION_FAILURE' | 'RATE_LIMITED' | 'UNKNOWN_OUTCOME' | 'MANUAL_REVIEW_REQUIRED',
      errorClass: result.errorClass,
      recoveryState: recoveryState as 'retry_pending' | 'query_before_retry' | 'manual_review',
      externalRef: prepared.externalSupplierOrderRef,
      customerImpact: 'supplier_cancellation_not_confirmed_customer_remedy_not_inferred',
      financialImpact: 'supplier_commitment_may_remain_open',
      startedAt,
      finishedAt: new Date().toISOString(),
    });

    return {
      ok: false,
      state: typeof persisted?.state === 'string' ? persisted.state : 'unknown',
      cancellationId: prepared.cancellationId,
      recoveryState,
      errorClass: result.errorClass,
    };
  }

  const confirmedCancelled = result.data.cancelled === true;
  const persisted = await recordResult(
    client,
    prepared.cancellationId,
    confirmedCancelled ? 'SUCCESS' : 'PERMANENT_REJECTION',
    confirmedCancelled,
    confirmedCancelled ? undefined : 'PERMANENT_REJECTION',
    confirmedCancelled ? undefined : 'provider did not confirm cancellation',
  );

  await recordSupplierCommerceOperation(client, {
    correlationId: prepared.correlationId,
    requestId: prepared.cancellationKey,
    operation: 'cancellation',
    providerRef: prepared.providerKey,
    supplierRef: prepared.supplierKey,
    entityType: 'supplier_order_cancellation',
    entityRef: prepared.cancellationId,
    resultClass: confirmedCancelled ? 'SUCCESS' : 'PERMANENT_REJECTION',
    recoveryState: confirmedCancelled ? 'resolved' : 'manual_review',
    externalRef: prepared.externalSupplierOrderRef,
    customerImpact: confirmedCancelled ? 'supplier_commitment_cancelled_customer_refund_still_separate' : 'supplier_cancellation_rejected_customer_remedy_required',
    financialImpact: confirmedCancelled ? 'supplier_commitment_cancelled' : 'supplier_commitment_may_remain_due',
    startedAt,
    finishedAt: new Date().toISOString(),
  });

  return {
    ok: confirmedCancelled && persisted?.ok === true,
    state: typeof persisted?.state === 'string' ? persisted.state : confirmedCancelled ? 'cancelled' : 'rejected',
    cancellationId: prepared.cancellationId,
    recoveryState: typeof persisted?.recoveryState === 'string' ? persisted.recoveryState : confirmedCancelled ? 'resolved' : 'manual_review',
  };
}
