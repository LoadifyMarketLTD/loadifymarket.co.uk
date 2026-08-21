import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { SupplierAdapterContext, SupplierAdapterV1 } from './supplierAdapter';
import { adapterSupports } from './supplierAdapter';
import { recordSupplierCommerceOperation } from './supplierCommerceControl';

export const SUPPLIER_RETURNS_INTERFACE_VERSION = 1 as const;

type ReturnPrepared = {
  eligible: true;
  reason: 'supplier_return_ready';
  returnCaseId: string;
  orderId: string;
  fulfilmentLegId: string;
  supplierId: string;
  supplierKey: string;
  providerKey: string;
  adapterVersion: string;
  supplierOrderRef: string;
  reasonCode: string;
  quantity: number;
  idempotencyKey: string;
  correlationId: string;
  interfaceVersion: 1;
};

type RecoveryPrepared = {
  eligible: true;
  reason: 'supplier_recovery_ready';
  returnCaseId: string;
  orderId: string;
  supplierId: string;
  supplierKey: string;
  providerKey: string;
  adapterVersion: string;
  supplierOrderRef: string;
  externalReturnRef: string;
  currency: 'GBP';
  currencyMinorUnitExponent: 2;
  correlationId: string;
  idempotencyKey: string;
  interfaceVersion: 1;
};

export type SupplierReturnRuntimeResult = {
  ok: boolean;
  state: string;
  returnCaseId?: string;
  externalReturnRef?: string;
  recoveryState?: string;
  amount?: number;
  currency?: string;
  reason?: string;
  errorClass?: string;
};

function isReturnPrepared(value: unknown): value is ReturnPrepared {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return row.eligible === true
    && row.reason === 'supplier_return_ready'
    && typeof row.returnCaseId === 'string'
    && typeof row.supplierKey === 'string'
    && typeof row.providerKey === 'string'
    && typeof row.adapterVersion === 'string'
    && typeof row.supplierOrderRef === 'string'
    && typeof row.reasonCode === 'string'
    && typeof row.quantity === 'number'
    && typeof row.idempotencyKey === 'string'
    && typeof row.correlationId === 'string'
    && row.interfaceVersion === SUPPLIER_RETURNS_INTERFACE_VERSION;
}

function isRecoveryPrepared(value: unknown): value is RecoveryPrepared {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return row.eligible === true
    && row.reason === 'supplier_recovery_ready'
    && typeof row.returnCaseId === 'string'
    && typeof row.supplierKey === 'string'
    && typeof row.providerKey === 'string'
    && typeof row.adapterVersion === 'string'
    && typeof row.supplierOrderRef === 'string'
    && typeof row.externalReturnRef === 'string'
    && row.currency === 'GBP'
    && row.currencyMinorUnitExponent === 2
    && typeof row.correlationId === 'string'
    && typeof row.idempotencyKey === 'string'
    && row.interfaceVersion === SUPPLIER_RETURNS_INTERFACE_VERSION;
}

function recoveryState(raw: string): 'requested' | 'pending' | 'partial' | 'recovered' | 'failed' | 'unrecoverable' {
  const state = raw.trim().toLowerCase();
  if (['recovered', 'completed', 'paid', 'succeeded', 'success'].includes(state)) return 'recovered';
  if (['partial', 'partially_recovered', 'partially_paid'].includes(state)) return 'partial';
  if (['failed', 'rejected', 'denied'].includes(state)) return 'failed';
  if (['unrecoverable', 'written_off', 'write_off'].includes(state)) return 'unrecoverable';
  if (['requested', 'created'].includes(state)) return 'requested';
  return 'pending';
}

export async function requestSupplierReturn(
  client: SupabaseClient,
  adapter: SupplierAdapterV1,
  input: {
    orderId: string;
    fulfilmentLegId: string;
    reasonCode: string;
    quantity: number;
    idempotencyKey: string;
    correlationId: string;
  },
): Promise<SupplierReturnRuntimeResult> {
  const { data, error } = await client.rpc('server_prepare_supplier_return_v1', {
    p_order_id: input.orderId,
    p_fulfilment_leg_id: input.fulfilmentLegId,
    p_reason_code: input.reasonCode,
    p_quantity: input.quantity,
    p_idempotency_key: input.idempotencyKey,
    p_correlation_id: input.correlationId,
  });
  if (error || !isReturnPrepared(data)) {
    const reason = data && typeof data === 'object' && typeof (data as { reason?: unknown }).reason === 'string'
      ? String((data as { reason: string }).reason)
      : 'supplier_return_not_ready';
    return { ok: false, state: 'blocked', reason };
  }
  const prepared = data;
  if (
    adapter.interfaceVersion !== SUPPLIER_RETURNS_INTERFACE_VERSION
    || adapter.providerKey !== prepared.providerKey
    || adapter.adapterVersion !== prepared.adapterVersion
    || !adapterSupports(adapter, 'returns')
    || !adapter.requestReturn
  ) {
    return { ok: false, state: 'manual_review', returnCaseId: prepared.returnCaseId, errorClass: 'CAPABILITY_UNAVAILABLE' };
  }

  const context: SupplierAdapterContext = {
    correlationId: prepared.correlationId,
    idempotencyKey: prepared.idempotencyKey,
    supplierKey: prepared.supplierKey,
    territory: 'GB',
  };
  const startedAt = new Date().toISOString();
  try {
    const result = await adapter.requestReturn(context, prepared.supplierOrderRef, prepared.reasonCode);
    if (!result.ok || !result.data.returnRef?.trim()) {
      await recordSupplierCommerceOperation(client, {
        correlationId: prepared.correlationId,
        requestId: prepared.idempotencyKey,
        operation: 'return_recovery',
        providerRef: adapter.providerKey,
        supplierRef: prepared.supplierKey,
        entityType: 'supplier_return_case',
        entityRef: prepared.returnCaseId,
        resultClass: result.ok ? 'MANUAL_REVIEW_REQUIRED' : result.errorClass === 'RATE_LIMITED' ? 'RATE_LIMITED' : result.errorClass === 'PERMANENT_REJECTION' ? 'PERMANENT_REJECTION' : 'RETRYABLE_FAILURE',
        errorClass: result.ok ? 'MALFORMED_RESPONSE' : result.errorClass,
        recoveryState: 'manual_review',
        customerImpact: 'return_authorisation_not_confirmed',
        financialImpact: 'supplier_recovery_not_started',
        startedAt,
        finishedAt: new Date().toISOString(),
      });
      return { ok: false, state: 'manual_review', returnCaseId: prepared.returnCaseId, errorClass: result.ok ? 'MALFORMED_RESPONSE' : result.errorClass };
    }
    const { data: recorded, error: recordError } = await client.rpc('server_record_supplier_return_authorisation_v1', {
      p_return_case_id: prepared.returnCaseId,
      p_external_return_ref: result.data.returnRef.trim(),
      p_authorised: true,
      p_evidence: { provider: adapter.providerKey, source: 'requestReturn' },
    });
    if (recordError || !recorded || typeof recorded !== 'object' || (recorded as { ok?: unknown }).ok !== true) {
      return { ok: false, state: 'reconciliation_required', returnCaseId: prepared.returnCaseId, externalReturnRef: result.data.returnRef };
    }
    return { ok: true, state: 'authorised', returnCaseId: prepared.returnCaseId, externalReturnRef: result.data.returnRef };
  } catch (errorThrown) {
    return {
      ok: false,
      state: 'manual_review',
      returnCaseId: prepared.returnCaseId,
      errorClass: 'UNKNOWN_OUTCOME',
      reason: errorThrown instanceof Error ? errorThrown.message : 'supplier return request outcome unknown',
    };
  }
}

export async function pollSupplierRecovery(
  client: SupabaseClient,
  adapter: SupplierAdapterV1,
  returnCaseId: string,
): Promise<SupplierReturnRuntimeResult> {
  const { data, error } = await client.rpc('server_supplier_recovery_context_v1', { p_return_case_id: returnCaseId });
  if (error || !isRecoveryPrepared(data)) {
    const reason = data && typeof data === 'object' && typeof (data as { reason?: unknown }).reason === 'string'
      ? String((data as { reason: string }).reason)
      : 'supplier_recovery_not_ready';
    return { ok: false, state: 'blocked', returnCaseId, reason };
  }
  const prepared = data;
  if (
    adapter.interfaceVersion !== SUPPLIER_RETURNS_INTERFACE_VERSION
    || adapter.providerKey !== prepared.providerKey
    || adapter.adapterVersion !== prepared.adapterVersion
    || !adapterSupports(adapter, 'reimbursement')
    || !adapter.getReimbursement
  ) {
    return { ok: false, state: 'manual_review', returnCaseId, errorClass: 'CAPABILITY_UNAVAILABLE' };
  }

  const context: SupplierAdapterContext = {
    correlationId: prepared.correlationId,
    idempotencyKey: prepared.idempotencyKey,
    supplierKey: prepared.supplierKey,
    territory: 'GB',
  };
  try {
    const result = await adapter.getReimbursement(context, prepared.supplierOrderRef);
    if (!result.ok) return { ok: false, state: 'pending', returnCaseId, errorClass: result.errorClass };
    if (result.data.currency && result.data.currency.toUpperCase() !== prepared.currency) {
      return { ok: false, state: 'manual_review', returnCaseId, errorClass: 'MALFORMED_RESPONSE', reason: 'supplier recovery currency mismatch' };
    }
    const state = recoveryState(result.data.state);
    const amountMinor = result.data.amountMinor ?? 0;
    if (!Number.isSafeInteger(amountMinor) || amountMinor < 0) {
      return { ok: false, state: 'manual_review', returnCaseId, errorClass: 'MALFORMED_RESPONSE', reason: 'invalid reimbursement amountMinor' };
    }
    if ((state === 'partial' || state === 'recovered') && amountMinor <= 0) {
      return { ok: false, state: 'manual_review', returnCaseId, errorClass: 'MALFORMED_RESPONSE', reason: 'financial recovery missing amount' };
    }
    const amount = amountMinor / (10 ** prepared.currencyMinorUnitExponent);
    const fingerprint = createHash('sha256')
      .update([returnCaseId, state, String(amountMinor), result.externalRef ?? '', prepared.currency].join('|'))
      .digest('hex');
    const { data: recorded, error: recordError } = await client.rpc('server_record_supplier_recovery_evidence_v1', {
      p_return_case_id: returnCaseId,
      p_event_key: `supplier-recovery:${fingerprint}`,
      p_external_recovery_ref: result.externalRef ?? null,
      p_amount: amount,
      p_currency: prepared.currency,
      p_state: state,
      p_occurred_at: new Date().toISOString(),
      p_evidence: { provider: adapter.providerKey, rawState: result.data.state, amountMinor },
    });
    if (recordError || !recorded || typeof recorded !== 'object' || (recorded as { ok?: unknown }).ok !== true) {
      return { ok: false, state: 'reconciliation_required', returnCaseId };
    }
    return { ok: state === 'recovered', state, returnCaseId, recoveryState: state, amount, currency: prepared.currency };
  } catch (errorThrown) {
    return { ok: false, state: 'pending', returnCaseId, errorClass: 'UNKNOWN_OUTCOME', reason: errorThrown instanceof Error ? errorThrown.message : 'recovery query failed' };
  }
}

export async function reconcileSupplierFinancials(client: SupabaseClient, orderId: string): Promise<Record<string, unknown> | null> {
  const { data, error } = await client.rpc('server_reconcile_supplier_financials_v1', { p_order_id: orderId });
  return error || !data || typeof data !== 'object' ? null : data as Record<string, unknown>;
}
