export interface CheckoutPricingItem {
  price: number;
  quantity: number;
}

export interface CheckoutPricingBreakdown {
  catalogSubtotalPence: number;
  chargeableSubtotalPence: number;
  shippingPence: number;
  vatIncludedPence: number;
  reverseChargeAdjustmentPence: number;
  totalPence: number;
}

const VAT_DIVISOR = 1.2;

function validQuantity(value: number): number {
  return Number.isInteger(value) && value > 0 ? value : 0;
}

/**
 * Mirrors create-checkout.ts exactly: round each unit price to pence first,
 * then multiply by quantity. Reverse charge removes the 20% VAT component from
 * item prices only; shipping remains the server-authoritative selected rate.
 */
export function calculateCheckoutPricing(
  items: CheckoutPricingItem[],
  shippingAmount: number,
  applyReverseCharge: boolean,
): CheckoutPricingBreakdown {
  const catalogSubtotalPence = items.reduce(
    (sum, item) => sum + Math.round(Number(item.price) * 100) * validQuantity(item.quantity),
    0,
  );

  const netEquivalentSubtotalPence = items.reduce(
    (sum, item) => sum + Math.round((Number(item.price) / VAT_DIVISOR) * 100) * validQuantity(item.quantity),
    0,
  );

  const chargeableSubtotalPence = applyReverseCharge
    ? netEquivalentSubtotalPence
    : catalogSubtotalPence;

  const shippingPence = Number.isFinite(shippingAmount)
    ? Math.max(0, Math.round(shippingAmount * 100))
    : 0;

  return {
    catalogSubtotalPence,
    chargeableSubtotalPence,
    shippingPence,
    vatIncludedPence: applyReverseCharge
      ? 0
      : Math.max(0, catalogSubtotalPence - netEquivalentSubtotalPence),
    reverseChargeAdjustmentPence: applyReverseCharge
      ? Math.max(0, catalogSubtotalPence - chargeableSubtotalPence)
      : 0,
    totalPence: chargeableSubtotalPence + shippingPence,
  };
}

export function poundsFromPence(pence: number): number {
  return pence / 100;
}
