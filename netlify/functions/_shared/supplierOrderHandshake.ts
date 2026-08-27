import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  SupplierAdapterContext,
  SupplierAdapterErrorClass,
  SupplierAdapterResult,
  SupplierAdapterV1,
  SupplierOrderAcknowledgement,
} from './supplierAdapter';
import { adapterSupports } from './supplierAdapter';
import { recordSupplierCommerceOperation } from './supplierCommerceControl';

export const SUPPLIER_ORDER_HANDSHAKE_INTERFACE_VERSION = 2 as const;

export interface SupplierHandshakePrepareInput {
  orderId: string;
  fulfilmentLegId: string;
  idempotencyKey: string;
  correlationId: string;
}

export interface SupplierHandshakePrepared {
  eligible: true;
  reason: 'supplier_order_handshake_shipping_ready';
  handshakeId: string;
  orderId: string;
  fulfilmentLegId: string;
  reservationId: string;
  paymentEvidenceId: string;
  supplierKey: string;
  supplierOfferId: string;
  externalOfferRef: string;
  providerKey: string;
  adapterVersion: string;
  quantity: number;
  destinationCountry: string;
  shippingDecisionId: string;
  shippingServiceRef: string;
  shippingBindingFingerprint: string;
  idempotencyKey: string;
  correlationId: string;
  state: string;
  externalSupplierOrderRef?: string | null;
  interfaceVersion: 2;
}

export interface SupplierHandshakeBlocked {
  eligible: false;
  reason: string;
  interfaceVersion: number;
  [key: string]: unknown;
}

export type SupplierHandshakePreparation = SupplierHandshakePrepared | SupplierHandshakeBlocked;

export interface SupplierHandshakeRuntimeResult {
  ok: boolean;
  state: string;
  handshakeId?: string;
  externalSupplierOrderRef?: string | null;
  recoveryState?: string;
  errorClass?: string;
  reason?: string;
}

function isPrepared(value: unknown): value is SupplierHandshakePrepared {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return row.eligible === true
    && row.reason === 'supplier_order_handshake_shipping_ready'
    && typeof row.handshakeId === 'string'
    && typeof row.externalOfferRef === 'string'
    && typeof row.providerKey === 'string'
    && typeof row.adapterVersion === 'string'
    && typeof row.quantity === 'number'
    && typeof row.destinationCountry === 'string'
    && typeof row.shippingDecisionId === 'string'
    && typeof row.shippingServiceRef === 'string'
    && typeof row.shippingBindingFingerprint === 'string'
    && typeof row.supplierKey === 'string'
    && typeof row.idempotencyKey === 'string'
    && typeof row.correlationId === 'string'
    && row.interfaceVersion === SUPPLIER_ORDER_HANDSHAKE_INTERFACE_VERSION;
}

function classifyAdapterFailure(errorClass: SupplierAdapterErrorClass): string {
  switch (errorClass) {
    case 'AUTH_CONFIGURATION_FAILURE': return 'AUTH_CONFIGURATION_FAILURE';
    case 'RATE_LIMITED': return 'RATE_LIMITED';
    case 'PERMANENT_REJECTION': return 'PERMANENT_REJECTION';
    case 'UNKNOWN_OUTCOME':
    case 'MALFORMED_RESPONSE': return 'UNKNOWN_OUTCOME';
    case 'CAPABILITY_UNAVAILABLE': return 'MANUAL_REVIEW_REQUIRED';
    default: return 'RETRYABLE_FAILURE';
  }
}

function acknowledgementResultClass(ack: SupplierOrderAcknowledgement): 'SUCCESS' | 'ACCEPTED_PENDING' | 'PERMANENT_REJECTION' | 'UNKNOWN_OUTCOME' {
  if (ack.state === 'accepted') return 'SUCCESS';
  if (ack.state === 'pending') return 'ACCEPTED_PENDING';
  if (ack.state === 'rejected') return 'PERMANENT_REJECTION';
  return 'UNKNOWN_OUTCOME';
}

async function recordSubmissionResult(
  client: SupabaseClient,
  handshakeId: string,
  resultClass: string,
  ackState: SupplierOrderAcknowledgement['state'],
  externalRef: string | undefined,
  errorClass?: string,
  errorMessage?: string,
): Promise<Record<string, unknown> | null> {
  const { data, error } = await client.rpc('server_record_supplier_order_submission_result_v1', {
    p_handshake_id: handshakeId,
    p_result_class: resultClass,
    p_ack_state: ackState,
    p_external_supplier_order_ref: externalRef ?? null,
    p_error_class: errorClass ?? null,
    p_error_message: errorMessage ?? null,
  });
  if (error || !data || typeof data !== 'object') return null;
  return data as Record<string, unknown>;
}

async function recordAcknowledgement(
  client: SupabaseClient,
  handshakeId: string,
  ack: SupplierOrderAcknowledgement,
  source: string,
): Promise<boolean> {
  const { data, error } = await client.rpc('server_record_supplier_order_acknowledgement_v1', {
    p_handshake_id: handshakeId,
    p_ack_state: ack.state,
    p_external_supplier_order_ref: ack.supplierOrderRef || null,
    p_acknowledged_at: ack.acknowledgedAt,
    p_source: source,
  });
  return !error && !!data && typeof data === 'object' && (data as { ok?: unknown }).ok === true;
}

async function reconcile(client: SupabaseClient, handshakeId: string): Promise<Record<string, unknown> | null> {
  const { data, error } = await client.rpc('server_reconcile_supplier_order_handshake_v1', { p_handshake_id: handshakeId });
  if (error || !data || typeof data !== 'object') return null;
  return data as Record<string, unknown>;
}

/**
 * Executes one provider-neutral Phase J submission attempt.
 * Unknown/pending outcomes are never blindly retried. The caller must recover
 * acknowledgement first, using the same external supplier order reference and
 * idempotency key.
 */
export async function submitPaidSupplierOrder(
  client: SupabaseClient,
  adapter: SupplierAdapterV1,
  input: SupplierHandshakePrepareInput,
): Promise<SupplierHandshakeRuntimeResult> {
  const startedAt = new Date().toISOString();
  const { data: rawPrepared, error: prepareError } = await client.rpc('server_prepare_supplier_order_handshake_v2', {
    p_order_id: input.orderId,
    p_fulfilment_leg_id: input.fulfilmentLegId,
    p_idempotency_key: input.idempotencyKey,
    p_correlation_id: input.correlationId,
  });

  if (prepareError || !isPrepared(rawPrepared)) {
    const reason = rawPrepared && typeof rawPrepared === 'object' && typeof (rawPrepared as { reason?: unknown }).reason === 'string'
      ? String((rawPrepared as { reason: string }).reason)
      : 'supplier_order_handshake_not_ready';
    return { ok: false, state: 'blocked', reason };
  }
  const prepared = rawPrepared;

  if (
    adapter.interfaceVersion !== 1
    || adapter.providerKey !== prepared.providerKey
    || adapter.adapterVersion !== prepared.adapterVersion
    || !adapterSupports(adapter, 'order_submission')
    || !adapterSupports(adapter, 'acknowledgement')
    || !adapter.submitOrder
    || !adapter.getOrderAcknowledgement
  ) {
    await recordSubmissionResult(client, prepared.handshakeId, 'MANUAL_REVIEW_REQUIRED', 'unknown', undefined, 'CAPABILITY_UNAVAILABLE', 'adapter identity/capability mismatch');
    return { ok: false, state: 'reconciliation_required', handshakeId: prepared.handshakeId, errorClass: 'CAPABILITY_UNAVAILABLE' };
  }

  const { data: startData, error: startError } = await client.rpc('server_mark_supplier_order_submission_started_v1', {
    p_handshake_id: prepared.handshakeId,
    p_idempotency_key: prepared.idempotencyKey,
  });
  if (startError || !startData || typeof startData !== 'object' || (startData as { ok?: unknown }).ok !== true) {
    const reason = startData && typeof startData === 'object' && typeof (startData as { reason?: unknown }).reason === 'string'
      ? String((startData as { reason: string }).reason)
      : 'supplier_submission_start_blocked';
    return { ok: false, state: 'blocked', handshakeId: prepared.handshakeId, reason };
  }

  const context: SupplierAdapterContext = {
    correlationId: prepared.correlationId,
    idempotencyKey: prepared.idempotencyKey,
    supplierKey: prepared.supplierKey,
    territory: prepared.destinationCountry,
  };

  let result: SupplierAdapterResult<SupplierOrderAcknowledgement>;
  try {
    result = await adapter.submitOrder(context, {
      externalOfferRef: prepared.externalOfferRef,
      quantity: prepared.quantity,
      shippingServiceRef: prepared.shippingServiceRef,
      destinationCountry: prepared.destinationCountry,
    });
  } catch (error) {
    result = {
      ok: false,
      errorClass: 'UNKNOWN_OUTCOME',
      message: error instanceof Error ? error.message : 'supplier submission threw before acknowledgement',
    };
  }

  if (!result.ok) {
    const resultClass = classifyAdapterFailure(result.errorClass);
    const persisted = await recordSubmissionResult(
      client,
      prepared.handshakeId,
      resultClass,
      'unknown',
      result.externalRef,
      result.errorClass,
      result.message,
    );
    await recordSupplierCommerceOperation(client, {
      correlationId: prepared.correlationId,
      requestId: prepared.idempotencyKey,
      operation: 'supplier_order',
      providerRef: adapter.providerKey,
      supplierRef: prepared.supplierKey,
      entityType: 'supplier_order_handshake',
      entityRef: prepared.handshakeId,
      resultClass: resultClass as 'RETRYABLE_FAILURE' | 'PERMANENT_REJECTION' | 'AUTH_CONFIGURATION_FAILURE' | 'RATE_LIMITED' | 'UNKNOWN_OUTCOME' | 'MANUAL_REVIEW_REQUIRED',
      errorClass: result.errorClass,
      recoveryState: resultClass === 'UNKNOWN_OUTCOME' ? 'query_before_retry' : resultClass === 'RETRYABLE_FAILURE' || resultClass === 'RATE_LIMITED' ? 'retry_pending' : 'manual_review',
      externalRef: result.externalRef,
      customerImpact: 'customer_payment_already_succeeded_supplier_order_not_confirmed',
      financialImpact: 'supplier_commitment_unconfirmed',
      startedAt,
      finishedAt: new Date().toISOString(),
    });
    return {
      ok: false,
      state: typeof persisted?.state === 'string' ? persisted.state : 'unknown',
      handshakeId: prepared.handshakeId,
      externalSupplierOrderRef: result.externalRef ?? null,
      recoveryState: typeof persisted?.recoveryState === 'string' ? persisted.recoveryState : undefined,
      errorClass: result.errorClass,
    };
  }

  const ack = result.data;
  const resultClass = acknowledgementResultClass(ack);
  const persisted = await recordSubmissionResult(client, prepared.handshakeId, resultClass, ack.state, ack.supplierOrderRef || result.externalRef);
  if (!persisted) {
    return { ok: false, state: 'reconciliation_required', handshakeId: prepared.handshakeId, externalSupplierOrderRef: ack.supplierOrderRef };
  }

  await recordAcknowledgement(client, prepared.handshakeId, ack, 'submitOrder');
  const reconciled = ack.state === 'accepted' ? await reconcile(client, prepared.handshakeId) : null;

  await recordSupplierCommerceOperation(client, {
    correlationId: prepared.correlationId,
    requestId: prepared.idempotencyKey,
    operation: 'supplier_order',
    providerRef: adapter.providerKey,
    supplierRef: prepared.supplierKey,
    entityType: 'supplier_order_handshake',
    entityRef: prepared.handshakeId,
    resultClass: ack.state === 'accepted' ? 'SUCCESS' : ack.state === 'pending' ? 'ACCEPTED_PENDING' : ack.state === 'rejected' ? 'PERMANENT_REJECTION' : 'UNKNOWN_OUTCOME',
    recoveryState: ack.state === 'accepted' ? 'resolved' : ack.state === 'pending' || ack.state === 'unknown' ? 'query_before_retry' : 'manual_review',
    externalRef: ack.supplierOrderRef,
    customerImpact: ack.state === 'accepted' ? 'none' : 'customer_payment_succeeded_supplier_order_not_final',
    financialImpact: ack.state === 'accepted' ? 'supplier_commitment_confirmed' : 'supplier_commitment_unresolved',
    startedAt,
    finishedAt: new Date().toISOString(),
  });

  return {
    ok: ack.state === 'accepted' && reconciled?.reconciled === true,
    state: ack.state === 'accepted' && reconciled?.reconciled === true ? 'reconciled' : ack.state,
    handshakeId: prepared.handshakeId,
    externalSupplierOrderRef: ack.supplierOrderRef,
    recoveryState: typeof persisted.recoveryState === 'string' ? persisted.recoveryState : undefined,
  };
}

/**
 * Lost-response / pending-ack recovery. This method queries acknowledgement
 * before any retry and never calls submitOrder itself.
 */
export async function recoverSupplierOrderAcknowledgement(
  client: SupabaseClient,
  adapter: SupplierAdapterV1,
  input: {
    handshakeId: string;
    supplierOrderRef: string;
    supplierKey: string;
    territory: string;
    correlationId: string;
    idempotencyKey: string;
  },
): Promise<SupplierHandshakeRuntimeResult> {
  if (!adapterSupports(adapter, 'acknowledgement') || !adapter.getOrderAcknowledgement || !input.supplierOrderRef) {
    return { ok: false, state: 'manual_review', handshakeId: input.handshakeId, errorClass: 'CAPABILITY_UNAVAILABLE' };
  }

  const context: SupplierAdapterContext = {
    correlationId: input.correlationId,
    idempotencyKey: input.idempotencyKey,
    supplierKey: input.supplierKey,
    territory: input.territory,
  };

  let result: SupplierAdapterResult<SupplierOrderAcknowledgement>;
  try {
    result = await adapter.getOrderAcknowledgement(context, input.supplierOrderRef);
  } catch (error) {
    result = {
      ok: false,
      errorClass: 'UNKNOWN_OUTCOME',
      message: error instanceof Error ? error.message : 'acknowledgement recovery failed',
      externalRef: input.supplierOrderRef,
    };
  }

  if (!result.ok) {
    return {
      ok: false,
      state: result.errorClass === 'PERMANENT_REJECTION' ? 'manual_review' : 'query_before_retry',
      handshakeId: input.handshakeId,
      externalSupplierOrderRef: input.supplierOrderRef,
      errorClass: result.errorClass,
    };
  }

  const ack = result.data;
  const recorded = await recordAcknowledgement(client, input.handshakeId, ack, 'getOrderAcknowledgement');
  if (!recorded) return { ok: false, state: 'reconciliation_required', handshakeId: input.handshakeId };
  const reconciled = ack.state === 'accepted' ? await reconcile(client, input.handshakeId) : null;
  return {
    ok: ack.state === 'accepted' && reconciled?.reconciled === true,
    state: ack.state === 'accepted' && reconciled?.reconciled === true ? 'reconciled' : ack.state,
    handshakeId: input.handshakeId,
    externalSupplierOrderRef: ack.supplierOrderRef,
  };
}