import type { SupabaseClient } from '@supabase/supabase-js';
import type { SupplierAdapterContext, SupplierAdapterV1 } from './supplierAdapter';

export interface LostResponseRecoveryInput {
  handshakeId: string;
  supplierKey: string;
  territory: string;
  correlationId: string;
  idempotencyKey: string;
}

export interface LostResponseRecoveryResult {
  ok: boolean;
  state: 'reconciled' | 'pending' | 'rejected' | 'unknown' | 'manual_review' | 'reconciliation_required';
  externalSupplierOrderRef?: string | null;
  errorClass?: string;
}

/**
 * Resolves the hardest Phase J case: the provider may have accepted submitOrder
 * but the response (and therefore supplierOrderRef) was lost. The adapter is
 * queried by the SAME idempotency key. This function never calls submitOrder.
 */
export async function recoverSupplierOrderLostResponse(
  client: SupabaseClient,
  adapter: SupplierAdapterV1,
  input: LostResponseRecoveryInput,
): Promise<LostResponseRecoveryResult> {
  if (!adapter.capabilities.includes('acknowledgement') || !adapter.findOrderByIdempotencyKey) {
    return { ok: false, state: 'manual_review', errorClass: 'CAPABILITY_UNAVAILABLE' };
  }

  const context: SupplierAdapterContext = {
    correlationId: input.correlationId,
    idempotencyKey: input.idempotencyKey,
    supplierKey: input.supplierKey,
    territory: input.territory,
  };

  let result;
  try {
    result = await adapter.findOrderByIdempotencyKey(context);
  } catch {
    return { ok: false, state: 'unknown', errorClass: 'UNKNOWN_OUTCOME' };
  }

  if (!result.ok) {
    return {
      ok: false,
      state: result.errorClass === 'PERMANENT_REJECTION' ? 'manual_review' : 'unknown',
      externalSupplierOrderRef: result.externalRef ?? null,
      errorClass: result.errorClass,
    };
  }

  const ack = result.data;
  const { data: recorded, error: recordError } = await client.rpc('server_record_supplier_order_acknowledgement_v1', {
    p_handshake_id: input.handshakeId,
    p_ack_state: ack.state,
    p_external_supplier_order_ref: ack.supplierOrderRef || null,
    p_acknowledged_at: ack.acknowledgedAt,
    p_source: 'findOrderByIdempotencyKey',
  });
  if (recordError || !recorded || typeof recorded !== 'object' || (recorded as { ok?: unknown }).ok !== true) {
    return { ok: false, state: 'reconciliation_required', externalSupplierOrderRef: ack.supplierOrderRef };
  }

  if (ack.state !== 'accepted') {
    return { ok: false, state: ack.state, externalSupplierOrderRef: ack.supplierOrderRef };
  }

  const { data: reconciled, error: reconcileError } = await client.rpc('server_reconcile_supplier_order_handshake_v1', {
    p_handshake_id: input.handshakeId,
  });
  const ok = !reconcileError && !!reconciled && typeof reconciled === 'object' && (reconciled as { reconciled?: unknown }).reconciled === true;
  return {
    ok,
    state: ok ? 'reconciled' : 'reconciliation_required',
    externalSupplierOrderRef: ack.supplierOrderRef,
  };
}
