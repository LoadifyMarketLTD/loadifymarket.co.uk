import type { SupabaseClient } from '@supabase/supabase-js';
import { recordSupplierCommerceOperation } from './supplierCommerceControl';
import { submitPaidSupplierOrder } from './supplierOrderHandshake';
import {
  resolveBuiltInSupplierAdapterV1,
  resolveExactSupplierAdapterV1,
  type SupplierAdapterResolver,
} from './supplierAdapterResolver';

interface PaidSupplierSubmissionContext {
  ready: true;
  reason: 'supplier_paid_order_submission_context_ready';
  orderId: string;
  fulfilmentLegId: string;
  reservationId: string;
  supplierId: string;
  supplierKey: string;
  supplierOfferId: string;
  providerKey: string;
  adapterVersion: string;
  correlationId: string;
  idempotencyKey: string;
  interfaceVersion: 1;
}

export interface PaidSupplierSubmissionResult {
  ok: boolean;
  state: string;
  reason?: string;
  retryWebhook?: boolean;
  handshakeId?: string;
  externalSupplierOrderRef?: string | null;
  recoveryState?: string;
  errorClass?: string;
}

function isContext(value: unknown): value is PaidSupplierSubmissionContext {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return row.ready === true
    && row.reason === 'supplier_paid_order_submission_context_ready'
    && typeof row.orderId === 'string'
    && typeof row.fulfilmentLegId === 'string'
    && typeof row.reservationId === 'string'
    && typeof row.supplierId === 'string'
    && typeof row.supplierKey === 'string'
    && typeof row.supplierOfferId === 'string'
    && typeof row.providerKey === 'string'
    && typeof row.adapterVersion === 'string'
    && typeof row.correlationId === 'string'
    && typeof row.idempotencyKey === 'string'
    && row.interfaceVersion === 1;
}

/**
 * Advances a canonical paid Supplier-Fulfilled order toward its supplier.
 *
 * The database chooses the exact registered provider/adapter version. The code
 * resolver may only return an implementation with the same identity. Missing or
 * mismatched implementations fail closed and are recorded for manual recovery.
 * Provider UNKNOWN outcomes are never retried from the Stripe webhook path.
 */
export async function processPaidSupplierOrder(
  client: SupabaseClient,
  orderId: string,
  resolver: SupplierAdapterResolver = resolveBuiltInSupplierAdapterV1,
): Promise<PaidSupplierSubmissionResult> {
  const { data, error } = await client.rpc('server_supplier_paid_order_submission_context_v1', {
    p_order_id: orderId,
  });
  if (error) {
    return { ok: false, state: 'context_unavailable', reason: 'supplier_submission_context_unavailable', retryWebhook: true };
  }
  if (!isContext(data)) {
    const reason = data && typeof data === 'object' && typeof (data as { reason?: unknown }).reason === 'string'
      ? String((data as { reason: string }).reason)
      : 'supplier_submission_context_not_ready';
    return { ok: false, state: 'blocked', reason, retryWebhook: false };
  }
  const context = data;

  const adapter = await resolveExactSupplierAdapterV1(
    resolver,
    context.providerKey,
    context.adapterVersion,
  );
  if (!adapter) {
    await recordSupplierCommerceOperation(client, {
      correlationId: context.correlationId,
      requestId: context.idempotencyKey,
      operation: 'supplier_order',
      providerRef: context.providerKey,
      supplierRef: context.supplierKey,
      entityType: 'supplier_fulfilment_leg',
      entityRef: context.fulfilmentLegId,
      resultClass: 'MANUAL_REVIEW_REQUIRED',
      errorClass: 'CAPABILITY_UNAVAILABLE',
      recoveryState: 'manual_review',
      customerImpact: 'customer_payment_succeeded_supplier_adapter_not_available',
      financialImpact: 'supplier_commitment_not_created',
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
    });
    return {
      ok: false,
      state: 'manual_review',
      reason: 'supplier_adapter_not_available_in_build',
      retryWebhook: false,
      errorClass: 'CAPABILITY_UNAVAILABLE',
      recoveryState: 'manual_review',
    };
  }

  const result = await submitPaidSupplierOrder(client, adapter, {
    orderId: context.orderId,
    fulfilmentLegId: context.fulfilmentLegId,
    idempotencyKey: context.idempotencyKey,
    correlationId: context.correlationId,
  });

  return {
    ...result,
    retryWebhook: false,
  };
}