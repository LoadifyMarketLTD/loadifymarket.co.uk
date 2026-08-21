import type { SupabaseClient } from '@supabase/supabase-js';

export const SUPPLIER_ORDER_ORCHESTRATOR_INTERFACE_VERSION = 1 as const;

export type CommerceRiskAction = 'ALLOW' | 'REVIEW' | 'HOLD' | 'RESTRICT' | 'BLOCK';

export interface SupplierReservationInput {
  orderId: string;
  orderItemId: string;
  supplierOfferId: string;
  commercialMode: 'loadify_supplier_fulfilled';
  quantity: number;
  territory?: string;
  externalVariantRef?: string;
  reservationKey: string;
  orchestrationIdempotencyKey: string;
  correlationId: string;
  riskSignals?: Record<string, unknown>;
  riskPolicyKey?: string;
  reservationMinutes?: number;
}

export interface SupplierReservationDecision {
  eligible: boolean;
  reason: string;
  interfaceVersion: 1;
  orchestrationId?: string;
  fulfilmentLegId?: string;
  reservationId?: string;
  status?: string;
  expiresAt?: string;
  reservedQuantity?: number;
  availableBeforeReservation?: number;
  risk?: {
    eligible?: boolean;
    action?: CommerceRiskAction;
    riskScore?: number;
    reason?: string;
  };
}

function isReservationDecision(value: unknown): value is SupplierReservationDecision {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  if (typeof row.eligible !== 'boolean' || typeof row.reason !== 'string' || row.interfaceVersion !== 1) return false;
  if (!row.eligible) return true;
  return typeof row.orchestrationId === 'string'
    && typeof row.fulfilmentLegId === 'string'
    && typeof row.reservationId === 'string'
    && typeof row.expiresAt === 'string'
    && typeof row.reservedQuantity === 'number';
}

export async function reserveSupplierOffer(
  client: SupabaseClient,
  input: SupplierReservationInput,
): Promise<SupplierReservationDecision> {
  try {
    const { data, error } = await client.rpc('server_reserve_supplier_offer_v1', {
      p_order_id: input.orderId,
      p_order_item_id: input.orderItemId,
      p_supplier_offer_id: input.supplierOfferId,
      p_commercial_mode: input.commercialMode,
      p_quantity: input.quantity,
      p_territory: input.territory || 'GB',
      p_external_variant_ref: input.externalVariantRef || '',
      p_reservation_key: input.reservationKey,
      p_orchestration_idempotency_key: input.orchestrationIdempotencyKey,
      p_correlation_id: input.correlationId,
      p_risk_signals: input.riskSignals || {},
      p_risk_policy_key: input.riskPolicyKey || 'supplier_commerce_default',
      p_reservation_minutes: input.reservationMinutes ?? 30,
    });
    if (error || !isReservationDecision(data)) throw error || new Error('invalid reservation evidence');
    return data;
  } catch {
    return {
      eligible: false,
      reason: 'supplier_reservation_unavailable',
      interfaceVersion: SUPPLIER_ORDER_ORCHESTRATOR_INTERFACE_VERSION,
    };
  }
}

export async function releaseSupplierReservation(
  client: SupabaseClient,
  reservationKey: string,
  reason: string,
): Promise<{ ok: boolean; reason: string; interfaceVersion: 1; reservationId?: string; status?: string }> {
  try {
    const { data, error } = await client.rpc('server_release_supplier_reservation_v1', {
      p_reservation_key: reservationKey,
      p_reason: reason,
    });
    if (error || !data || typeof data !== 'object') throw error || new Error('invalid release evidence');
    const row = data as Record<string, unknown>;
    if (typeof row.ok !== 'boolean' || typeof row.reason !== 'string' || row.interfaceVersion !== 1) throw new Error('invalid release evidence');
    return data as { ok: boolean; reason: string; interfaceVersion: 1; reservationId?: string; status?: string };
  } catch {
    return { ok: false, reason: 'supplier_reservation_release_unavailable', interfaceVersion: 1 };
  }
}

export interface RiskPolicyInput {
  policyKey: string;
  version: number;
  status: 'draft' | 'approved';
  reviewScore: number;
  holdScore: number;
  restrictScore: number;
  blockScore: number;
  evidence: Record<string, unknown>;
  effectiveFrom?: string;
}

export async function mutateSupplierRiskPolicy(
  client: SupabaseClient,
  actorId: string,
  input: RiskPolicyInput,
): Promise<{ ok: true; data: unknown } | { ok: false; error: string }> {
  try {
    const { data, error } = await client.rpc('server_admin_supplier_risk_policy_v1', {
      p_actor_id: actorId,
      p_policy_key: input.policyKey,
      p_version: input.version,
      p_status: input.status,
      p_review_score: input.reviewScore,
      p_hold_score: input.holdScore,
      p_restrict_score: input.restrictScore,
      p_block_score: input.blockScore,
      p_evidence: input.evidence,
      p_effective_from: input.effectiveFrom || null,
    });
    if (error) return { ok: false, error: error.message || 'risk policy mutation failed' };
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'risk policy mutation failed' };
  }
}

export async function readSupplierOrderOrchestrationStatus(
  client: SupabaseClient,
  actorId: string,
  orderId: string,
): Promise<{ ok: true; data: unknown } | { ok: false; error: string }> {
  try {
    const { data, error } = await client.rpc('server_admin_supplier_order_orchestration_status_v1', {
      p_actor_id: actorId,
      p_order_id: orderId,
    });
    if (error || !data || typeof data !== 'object') return { ok: false, error: error?.message || 'orchestration status unavailable' };
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'orchestration status unavailable' };
  }
}
