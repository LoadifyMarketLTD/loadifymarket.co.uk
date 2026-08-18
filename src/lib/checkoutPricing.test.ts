import { describe, expect, it } from 'vitest';
import { calculateCheckoutPricing, poundsFromPence } from '@/lib/checkoutPricing';

describe('checkoutPricing', () => {
  it('keeps normal VAT-inclusive checkout totals at penny precision', () => {
    const result = calculateCheckoutPricing(
      [
        { price: 5.32, quantity: 1 },
        { price: 12.99, quantity: 2 },
      ],
      4.99,
      false,
    );

    expect(result.catalogSubtotalPence).toBe(3130);
    expect(result.shippingPence).toBe(499);
    expect(result.totalPence).toBe(3629);
    expect(result.vatIncludedPence).toBe(521);
    expect(result.reverseChargeAdjustmentPence).toBe(0);
    expect(poundsFromPence(result.totalPence)).toBe(36.29);
  });

  it('mirrors server reverse-charge rounding per unit', () => {
    const result = calculateCheckoutPricing(
      [
        { price: 5.32, quantity: 1 },
        { price: 12.99, quantity: 2 },
      ],
      4.99,
      true,
    );

    // create-checkout rounds each VAT-exclusive unit to pence before quantity.
    expect(result.chargeableSubtotalPence).toBe(2609);
    expect(result.reverseChargeAdjustmentPence).toBe(521);
    expect(result.vatIncludedPence).toBe(0);
    expect(result.totalPence).toBe(3108);
  });

  it('keeps service-only shipping at zero', () => {
    const result = calculateCheckoutPricing([{ price: 80, quantity: 1 }], 0, false);
    expect(result.shippingPence).toBe(0);
    expect(result.totalPence).toBe(8000);
  });
});
