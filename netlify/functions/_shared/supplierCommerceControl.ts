import type { SupabaseClient } from '@supabase/supabase-js';

export const SUPPLIER_COMMERCE_INTERFACE_VERSION = 1 as const;

export type SupplierCommerceOperation =
  | 'import'
  | 'publish'
  | 'checkout'
  | 'reservation'
  | 'supplier_order'
  | 'tracking_ingest'
  | 'return_recovery'
  | 'stock_sync'
  | 'price_sync';

export interface SupplierCommerceScope {
  providerRef?: string;
  supplierRef?: string;
  offerRef?: string;
  productRef?: string;
  categoryRef?: string;
  territory?: string;
  cohort?: string;
}

export interface SupplierCommerceControlDecision {
  enabled: boolean;
  reason: string;
  operation?: SupplierCommerceOperation;
  interfaceVersion: 1;
  controlVersion?: number;
  scopeType?: string;
  scopeRef?: string;
}

const FAIL_CLOSED_DECISION: SupplierCommerceControlDecision = {
  enabled: false,
  reason: 'control_unavailable',
  interfaceVersion: SUPPLIER_COMMERCE_INTERFACE_VERSION,
};

function isDecision(value: unknown): value is SupplierCommerceControlDecision {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.enabled === 'boolean'
    && typeof candidate.reason === 'string'
    && candidate.interfaceVersion === SUPPLIER_COMMERCE_INTERFACE_VERSION
  );
}

/**
 * Canonical server-side Supplier Commerce rollout / kill-switch guard.
 *
 * Unknown configuration, RPC failures and malformed responses are deliberately
 * treated as disabled. Supplier Commerce must never fail open because the
 * control plane is unavailable.
 */
export async function evaluateSupplierCommerceControl(
  supabase: SupabaseClient,
  operation: SupplierCommerceOperation,
  scope: SupplierCommerceScope = {},
): Promise<SupplierCommerceControlDecision> {
  try {
    const { data, error } = await supabase.rpc('server_supplier_commerce_control_decision_v1', {
      p_operation: operation,
      p_scope: scope,
    });

    if (error || !isDecision(data)) {
      return { ...FAIL_CLOSED_DECISION };
    }

    return data;
  } catch {
    return { ...FAIL_CLOSED_DECISION };
  }
}

export type SupplierCommerceResultClass =
  | 'SUCCESS'
  | 'ACCEPTED_PENDING'
  | 'BLOCKED_BY_CONTROL'
  | 'RETRYABLE_FAILURE'
  | 'PERMANENT_REJECTION'
  | 'AUTH_CONFIGURATION_FAILURE'
  | 'RATE_LIMITED'
  | 'PRICE_CHANGED'
  | 'STOCK_CHANGED'
  | 'UNKNOWN_OUTCOME'
  | 'MANUAL_REVIEW_REQUIRED';

export type SupplierCommerceRecoveryState =
  | 'none'
  | 'retry_pending'
  | 'query_before_retry'
  | 'reconcile'
  | 'manual_review'
  | 'resolved';

export interface SupplierCommerceOperationEvidence {
  correlationId: string;
  requestId?: string | null;
  operation: string;
  providerRef?: string | null;
  supplierRef?: string | null;
  entityType?: string | null;
  entityRef?: string | null;
  resultClass: SupplierCommerceResultClass;
  errorClass?: string | null;
  recoveryState?: SupplierCommerceRecoveryState;
  retryCount?: number;
  externalRef?: string | null;
  customerImpact?: string | null;
  financialImpact?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
}

/**
 * Persists structured operational evidence without accepting arbitrary raw
 * provider payloads, secrets or buyer PII.
 */
export async function recordSupplierCommerceOperation(
  supabase: SupabaseClient,
  evidence: SupplierCommerceOperationEvidence,
): Promise<{ ok: true; id: string | null } | { ok: false }> {
  try {
    const { data, error } = await supabase.rpc('server_record_supplier_commerce_operation_v1', {
      p_correlation_id: evidence.correlationId,
      p_request_id: evidence.requestId ?? null,
      p_operation: evidence.operation,
      p_provider_ref: evidence.providerRef ?? null,
      p_supplier_ref: evidence.supplierRef ?? null,
      p_entity_type: evidence.entityType ?? null,
      p_entity_ref: evidence.entityRef ?? null,
      p_result_class: evidence.resultClass,
      p_error_class: evidence.errorClass ?? null,
      p_recovery_state: evidence.recoveryState ?? 'none',
      p_retry_count: evidence.retryCount ?? 0,
      p_external_ref: evidence.externalRef ?? null,
      p_customer_impact: evidence.customerImpact ?? null,
      p_financial_impact: evidence.financialImpact ?? null,
      p_started_at: evidence.startedAt ?? null,
      p_finished_at: evidence.finishedAt ?? null,
    });

    if (error) return { ok: false };
    return { ok: true, id: typeof data === 'string' ? data : null };
  } catch {
    return { ok: false };
  }
}
