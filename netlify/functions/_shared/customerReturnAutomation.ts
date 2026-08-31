export const CUSTOMER_RETURN_AUTOMATION_INTERFACE_VERSION = 1 as const;

export type CustomerReturnDecision =
  | 'eligible_for_return_request'
  | 'manual_review'
  | 'ineligible';

export interface CustomerReturnAutomationInput {
  orderStatus: string;
  deliveredAt?: string | null;
  requestedAt?: Date;
  purchasedQuantity: number;
  requestedQuantity: number;
  reasonCode: string;
  returnWindowDays?: number;
  supplierReturnCapability: boolean;
  carrierLabelCapability: boolean;
}

export interface CustomerReturnAutomationResult {
  interfaceVersion: typeof CUSTOMER_RETURN_AUTOMATION_INTERFACE_VERSION;
  decision: CustomerReturnDecision;
  reason: string;
  supplierReturnRequestAllowed: boolean;
  returnLabelRequestAllowed: boolean;
  refundState: 'not_started' | 'pending_receipt';
  automaticRefundExecutionAllowed: false;
  paymentMutationAllowed: false;
}

const RETURNABLE_ORDER_STATES = new Set(['delivered', 'completed']);

/**
 * Platform return-policy boundary. This does not execute a refund and does not
 * promise a provider label. Provider capability and warehouse receipt remain
 * explicit gates downstream.
 */
export function evaluateCustomerReturnAutomation(
  input: CustomerReturnAutomationInput,
): CustomerReturnAutomationResult {
  const requestedAt = input.requestedAt ?? new Date();
  const returnWindowDays = input.returnWindowDays ?? 14;
  if (!Number.isSafeInteger(returnWindowDays) || returnWindowDays <= 0 || returnWindowDays > 365) {
    throw new Error('returnWindowDays must be between 1 and 365');
  }
  if (!Number.isSafeInteger(input.purchasedQuantity) || input.purchasedQuantity <= 0) {
    throw new Error('purchasedQuantity must be a positive integer');
  }
  if (!Number.isSafeInteger(input.requestedQuantity) || input.requestedQuantity <= 0) {
    return blocked('ineligible', 'invalid_return_quantity');
  }
  if (input.requestedQuantity > input.purchasedQuantity) {
    return blocked('ineligible', 'return_quantity_exceeds_purchase');
  }
  if (!input.reasonCode.trim()) return blocked('ineligible', 'return_reason_required');
  if (!RETURNABLE_ORDER_STATES.has(input.orderStatus.trim().toLowerCase())) {
    return blocked('ineligible', 'order_not_delivered');
  }
  if (!input.deliveredAt || Number.isNaN(Date.parse(input.deliveredAt))) {
    return blocked('manual_review', 'delivery_date_unverified');
  }

  const deliveredAt = Date.parse(input.deliveredAt);
  const ageDays = (requestedAt.getTime() - deliveredAt) / 86_400_000;
  if (ageDays < 0) return blocked('manual_review', 'delivery_date_in_future');
  if (ageDays > returnWindowDays) return blocked('ineligible', 'return_window_expired');

  if (!input.supplierReturnCapability) {
    return {
      ...blocked('manual_review', 'supplier_return_capability_unavailable'),
      refundState: 'pending_receipt',
    };
  }

  return {
    interfaceVersion: CUSTOMER_RETURN_AUTOMATION_INTERFACE_VERSION,
    decision: 'eligible_for_return_request',
    reason: input.carrierLabelCapability ? 'return_ready' : 'return_ready_label_manual',
    supplierReturnRequestAllowed: true,
    returnLabelRequestAllowed: input.carrierLabelCapability,
    refundState: 'pending_receipt',
    automaticRefundExecutionAllowed: false,
    paymentMutationAllowed: false,
  };
}

function blocked(decision: Exclude<CustomerReturnDecision, 'eligible_for_return_request'>, reason: string): CustomerReturnAutomationResult {
  return {
    interfaceVersion: CUSTOMER_RETURN_AUTOMATION_INTERFACE_VERSION,
    decision,
    reason,
    supplierReturnRequestAllowed: false,
    returnLabelRequestAllowed: false,
    refundState: 'not_started',
    automaticRefundExecutionAllowed: false,
    paymentMutationAllowed: false,
  };
}
