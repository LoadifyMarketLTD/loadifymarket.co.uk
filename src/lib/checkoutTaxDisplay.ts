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
 *
 * The current marketplace tax boundary only authorises the explicit
 * seller-non-VAT declaration path for checkout. Anything else is treated as
 * unknown here rather than guessed; the server remains authoritative.
 */
export function calculateCheckoutVat(items: CheckoutTaxItem[]): number | null {
  for (const item of items) {
    const quantity = Number(item.quantity);
    const price = Number(item.product.price);

    if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(price) || price < 0) {
      return null;
    }

    const hasCanonicalNonVatEvidence =
      item.product.taxTreatmentStatus === 'seller_non_vat_declared'
      && item.product.taxTreatmentSource === 'seller_profile_non_vat_declaration_v1'
      && Number(item.product.vatRate) === 0;

    if (!hasCanonicalNonVatEvidence) return null;
  }

  return 0;
}
