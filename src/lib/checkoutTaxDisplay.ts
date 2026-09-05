export interface CheckoutTaxProduct {
  price: number;
  vatRate?: number | null;
  taxTreatmentStatus?: string | null;
  taxTreatmentSource?: string | null;
}

export interface CheckoutTaxItem {
  product: CheckoutTaxProduct;
  quantity: number;
}

/**
 * UI-only VAT display derived from persisted product tax evidence.
 * The server checkout remains authoritative. Unknown evidence is never guessed.
 */
export function calculateCheckoutVat(items: CheckoutTaxItem[]): number | null {
  let vatPence = 0;

  for (const item of items) {
    const quantity = Number(item.quantity);
    const price = Number(item.product.price);
    const rate = item.product.vatRate;

    if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(price) || price < 0) return null;

    if (
      item.product.taxTreatmentStatus === 'seller_non_vat_declared' &&
      item.product.taxTreatmentSource === 'seller_profile_non_vat_declaration_v1' &&
      Number(rate) === 0
    ) {
      continue;
    }

    if (rate == null || !Number.isFinite(Number(rate)) || Number(rate) < 0) return null;
    const numericRate = Number(rate);
    if (numericRate === 0) continue;

    const grossPence = Math.round(price * 100) * quantity;
    vatPence += Math.round((grossPence * numericRate) / (100 + numericRate));
  }

  return vatPence / 100;
}
