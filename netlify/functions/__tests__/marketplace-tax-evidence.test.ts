import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  buildSellerNonVatProductEvidence,
  resolveMarketplaceTaxV1,
} from '../_shared/marketplaceTax';

const read = (relativePath: string) => readFileSync(new URL(relativePath, import.meta.url), 'utf8');
const webCheckout = read('../create-checkout.ts');
const mobileCheckout = read('../create-payment-intent.ts');
const createProduct = read('../create-product.ts');
const updateProduct = read('../update-product.ts');
const invoice = read('../generate-invoice.ts');
const migration = read('../../../supabase/612_marketplace_tax_evidence_boundary.sql');

const product = {
  id: 'p1',
  price: 25,
  listingContext: 'product',
  ...buildSellerNonVatProductEvidence(25),
};

const seller = {
  country: 'GB',
  isVatRegistered: false,
  vatNumber: null,
  businessAddress: { postcode: 'BB1 1AA' },
};

const gbAddress = { country: 'United Kingdom', postcode: 'BB1 1AA' };

describe('marketplace tax evidence P1', () => {
  it('allows only the narrow GB non-VAT physical-product transaction class', () => {
    const result = resolveMarketplaceTaxV1({
      seller,
      products: [product],
      shippingAddress: gbAddress,
      billingAddress: gbAddress,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.applyReverseCharge).toBe(false);
    expect(result.vatAmountPence).toBe(0);
    expect(result.snapshot).toMatchObject({
      version: 1,
      jurisdiction: 'GB',
      destinationCountry: 'GB',
      treatment: 'seller_non_vat_declared',
      sellerVatRegistered: false,
      reverseCharge: false,
      vatAmountPence: 0,
      evidenceVersion: 1,
    });
  });

  it.each([
    ['seller country missing', { seller: { ...seller, country: null } }],
    ['seller VAT registered', { seller: { ...seller, isVatRegistered: true } }],
    ['seller VAT conflict', { seller: { ...seller, vatNumber: 'GB123456789' } }],
    ['international destination', { shippingAddress: { country: 'France' } }],
    ['service', { products: [{ ...product, listingContext: 'service' }] }],
    ['missing product evidence', { products: [{ ...product, taxTreatmentStatus: null }] }],
    ['legacy 20 percent product evidence', { products: [{ ...product, vatRate: 0.2, priceExVat: 20.83 }] }],
  ])('fails closed when %s', (_label, override) => {
    const result = resolveMarketplaceTaxV1({
      seller,
      products: [product],
      shippingAddress: gbAddress,
      billingAddress: gbAddress,
      ...override,
    });
    expect(result.ok).toBe(false);
  });

  it('web and mobile use the same resolver and persist the same tax snapshot', () => {
    for (const source of [webCheckout, mobileCheckout]) {
      expect(source).toContain('resolveMarketplaceTaxV1');
      expect(source).toContain('taxSnapshot: taxDecision.snapshot');
      expect(source).toContain('applyReverseCharge = taxDecision.applyReverseCharge');
      expect(source).not.toContain('isVatVerified');
      expect(source).not.toContain('VAT_RATE');
      expect(source).not.toContain('/ 1.20');
    }
  });

  it('product write paths no longer invent a blanket 20 percent VAT treatment', () => {
    for (const source of [createProduct, updateProduct]) {
      expect(source).toContain('buildSellerNonVatProductEvidence');
      expect(source).toContain('taxTreatmentStatus');
      expect(source).toContain('taxEvidenceVersion');
      expect(source).not.toContain('vatRate = 0.20');
      expect(source).not.toContain('price / 1.20');
      expect(source).not.toContain('nextPrice / 1.20');
    }
  });

  it('database materialization remains one atomic boundary and is tax-evidence gated', () => {
    expect(migration).toContain('CREATE OR REPLACE FUNCTION private.payment_session_has_marketplace_tax_snapshot_v1');
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.server_materialize_paid_order_v1');
    expect(migration).toContain('payment_session_has_commercial_snapshot_v1');
    expect(migration).toContain('payment_session_has_marketplace_tax_snapshot_v1');
    expect(migration).toContain('v_vat := 0;');
    expect(migration).toContain('"taxDecisionSnapshot"');
    expect(migration).toContain('"taxTreatmentSnapshot"');
    expect(migration).toContain("'checkout_verified_tax_v1'");
    expect(migration).not.toContain('v_product_paid / 1.20');
    expect(migration).not.toContain('v_item_price / 1.20');
  });

  it('invoice renders immutable tax evidence and does not infer reverse charge from mutable buyer state', () => {
    expect(invoice).toContain('taxDecisionSnapshot');
    expect(invoice).toContain('checkout_verified_tax_v1');
    expect(invoice).toContain('VAT — not charged by seller');
    expect(invoice).not.toContain('isVatVerified');
    expect(invoice).not.toContain('VAT (20%)');
    expect(invoice).not.toContain('VITE_VAT_NUMBER');
  });
});
