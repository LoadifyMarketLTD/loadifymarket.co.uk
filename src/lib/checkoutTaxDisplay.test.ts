import { describe, expect, it } from 'vitest';
import { calculateCheckoutVat } from './checkoutTaxDisplay';

const nonVatProduct = {
  price: 9.99,
  vatRate: 0,
  taxTreatmentStatus: 'seller_non_vat_declared',
  taxTreatmentSource: 'seller_profile_non_vat_declaration_v1',
};

describe('calculateCheckoutVat', () => {
  it('shows zero VAT for canonical seller non-VAT evidence', () => {
    expect(calculateCheckoutVat([{ product: nonVatProduct, quantity: 1 }])).toBe(0);
  });

  it('keeps zero VAT across multiple canonical non-VAT items', () => {
    expect(calculateCheckoutVat([
      { product: nonVatProduct, quantity: 2 },
      { product: { ...nonVatProduct, price: 15.5 }, quantity: 1 },
    ])).toBe(0);
  });

  it('does not invent VAT when tax evidence is missing', () => {
    expect(calculateCheckoutVat([{ product: { price: 9.99 }, quantity: 1 }])).toBeNull();
  });

  it('does not infer a positive VAT amount from unsupported or legacy evidence', () => {
    expect(calculateCheckoutVat([{
      product: {
        price: 25,
        vatRate: 0.2,
        taxTreatmentStatus: 'legacy_vat',
        taxTreatmentSource: 'legacy',
      },
      quantity: 1,
    }])).toBeNull();
  });

  it('fails closed for invalid quantity or price', () => {
    expect(calculateCheckoutVat([{ product: nonVatProduct, quantity: 0 }])).toBeNull();
    expect(calculateCheckoutVat([{ product: { ...nonVatProduct, price: -1 }, quantity: 1 }])).toBeNull();
  });
});
