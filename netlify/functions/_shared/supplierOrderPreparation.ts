import type { SupabaseClient } from '@supabase/supabase-js';

export const SUPPLIER_ORDER_PREPARATION_INTERFACE_VERSION = 1;

export interface SupplierOrderPreparationInput {
  buyerId: string;
  publicProductId: string;
  quantity: number;
  shippingDecisionId: string;
  shippingAddress: Record<string, unknown>;
  billingAddress: Record<string, unknown>;
  idempotencyKey: string;
  correlationId: string;
  riskSignals?: Record<string, unknown>;
  riskPolicyKey?: string;
  reservationMinutes?: number;
}

export interface SupplierOrderPreparationResult {
  prepared: boolean;
  reason: string;
  interfaceVersion: number;
  preparationId?: string;
  orderId?: string;
  orderNumber?: string;
  orderItemId?: string;
  reservationId?: string;
  fulfilmentLegId?: string;
  shippingDecisionId?: string;
  reservationExpiresAt?: string;
  state?: string;
  paymentSnapshot?: Record<string, unknown>;
}

export interface SupplierPaymentPreparationDecision {
  ready: boolean;
  reason: string;
  interfaceVersion: number;
  preparationId?: string;
  orderId?: string;
  reservationId?: string;
  reservationExpiresAt?: string;
  paymentSnapshot?: Record<string, unknown>;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function validPreparation(value: unknown): value is SupplierOrderPreparationResult {
  if (!isObject(value)) return false;
  if (
    typeof value.prepared !== 'boolean'
    || typeof value.reason !== 'string'
    || value.interfaceVersion !== SUPPLIER_ORDER_PREPARATION_INTERFACE_VERSION
  ) return false;
  if (!value.prepared) return true;
  return typeof value.preparationId === 'string'
    && typeof value.orderId === 'string'
    && typeof value.orderItemId === 'string'
    && typeof value.reservationId === 'string'
    && typeof value.fulfilmentLegId === 'string'
    && typeof value.shippingDecisionId === 'string'
    && isObject(value.paymentSnapshot);
}

function validPaymentDecision(value: unknown): value is SupplierPaymentPreparationDecision {
  if (!isObject(value)) return false;
  if (
    typeof value.ready !== 'boolean'
    || typeof value.reason !== 'string'
    || value.interfaceVersion !== SUPPLIER_ORDER_PREPARATION_INTERFACE_VERSION
  ) return false;
  if (!value.ready) return true;
  return typeof value.preparationId === 'string'
    && typeof value.orderId === 'string'
    && typeof value.reservationId === 'string'
    && typeof value.reservationExpiresAt === 'string'
    && isObject(value.paymentSnapshot);
}

export async function prepareSupplierCheckoutOrder(
  client: SupabaseClient,
  input: SupplierOrderPreparationInput,
): Promise<SupplierOrderPreparationResult> {
  try {
    const { data, error } = await client.rpc('server_prepare_supplier_checkout_order_v1', {
      p_buyer_id: input.buyerId,
      p_public_product_id: input.publicProductId,
      p_quantity: input.quantity,
      p_shipping_decision_id: input.shippingDecisionId,
      p_shipping_address: input.shippingAddress,
      p_billing_address: input.billingAddress,
      p_idempotency_key: input.idempotencyKey,
      p_correlation_id: input.correlationId,
      p_risk_signals: input.riskSignals || {},
      p_risk_policy_key: input.riskPolicyKey || 'supplier_commerce_default',
      p_reservation_minutes: input.reservationMinutes || 30,
    });
    if (error || !validPreparation(data)) throw error || new Error('invalid supplier checkout preparation');
    return data;
  } catch {
    return {
      prepared: false,
      reason: 'supplier_checkout_preparation_unavailable',
      interfaceVersion: SUPPLIER_ORDER_PREPARATION_INTERFACE_VERSION,
    };
  }
}

export async function getSupplierPaymentPreparation(
  client: SupabaseClient,
  preparationId: string,
  buyerId: string,
): Promise<SupplierPaymentPreparationDecision> {
  try {
    const { data, error } = await client.rpc('server_supplier_payment_preparation_decision_v1', {
      p_preparation_id: preparationId,
      p_buyer_id: buyerId,
    });
    if (error || !validPaymentDecision(data)) throw error || new Error('invalid supplier payment preparation');
    return data;
  } catch {
    return {
      ready: false,
      reason: 'supplier_payment_preparation_unavailable',
      interfaceVersion: SUPPLIER_ORDER_PREPARATION_INTERFACE_VERSION,
    };
  }
}

export async function releaseSupplierCheckoutPreparation(
  client: SupabaseClient,
  preparationId: string,
  reason: string,
): Promise<{ ok: boolean; reason: string; interfaceVersion: number }> {
  try {
    const { data, error } = await client.rpc('server_release_supplier_checkout_preparation_v1', {
      p_preparation_id: preparationId,
      p_reason: reason,
    });
    if (error || !isObject(data) || typeof data.ok !== 'boolean' || typeof data.reason !== 'string' || data.interfaceVersion !== 1) {
      throw error || new Error('invalid supplier checkout release response');
    }
    return { ok: data.ok, reason: data.reason, interfaceVersion: 1 };
  } catch {
    return { ok: false, reason: 'supplier_checkout_release_unavailable', interfaceVersion: 1 };
  }
}
