import { describe, expect, it } from 'vitest';
import { evaluateCustomerReturnAutomation } from '../_shared/customerReturnAutomation';

describe('customer return escrow-completion boundary', () => {
  const base = {
    deliveredAt: '2026-09-01T12:00:00.000Z',
    requestedAt: new Date('2026-09-04T12:00:00.000Z'),
    purchasedQuantity: 1,
    requestedQuantity: 1,
    reasonCode: 'changed_mind',
    returnWindowDays: 14,
    supplierReturnCapability: false,
    carrierLabelCapability: false,
  };

  it('rejects a delivered order until canonical escrow completion', () => {
    const result = evaluateCustomerReturnAutomation({
      ...base,
      orderStatus: 'delivered',
    });

    expect(result.decision).toBe('ineligible');
    expect(result.reason).toBe('order_not_completed');
    expect(result.automaticRefundExecutionAllowed).toBe(false);
    expect(result.paymentMutationAllowed).toBe(false);
  });

  it('allows completed orders to continue into capability/manual-review evaluation', () => {
    const result = evaluateCustomerReturnAutomation({
      ...base,
      orderStatus: 'completed',
    });

    expect(result.decision).toBe('manual_review');
    expect(result.reason).toBe('supplier_return_capability_unavailable');
    expect(result.refundState).toBe('pending_receipt');
    expect(result.automaticRefundExecutionAllowed).toBe(false);
    expect(result.paymentMutationAllowed).toBe(false);
  });

  it('keeps the delivery-date return window anchored to the actual delivered timestamp', () => {
    const result = evaluateCustomerReturnAutomation({
      ...base,
      orderStatus: 'completed',
      requestedAt: new Date('2026-09-20T12:00:00.000Z'),
    });

    expect(result.decision).toBe('ineligible');
    expect(result.reason).toBe('return_window_expired');
  });
});
