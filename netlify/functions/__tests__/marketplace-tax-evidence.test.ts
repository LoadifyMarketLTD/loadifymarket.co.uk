import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildSellerNonVatProductEvidence,
  resolveMarketplaceTaxV1,
} from '../_shared/marketplaceTax';

const readRepo = (relativePath: string) =>
  readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');

const webCheckout = readRepo('netlify/functions/create-checkout.ts');
const mobileCheckout = readRepo('netlify/functions/create-payment-intent.ts');
const createProduct = readRepo('netlify/functions/create-product.ts');
const updateProduct = readRepo('netlify/functions/update-product.ts');
const connectOnboard = readRepo('netlify/functions/connect-onboard.ts');
const connectStatus = readRepo('netlify/functions/connect-status.ts');
const invoice = readRepo('netlify/functions/generate-invoice.ts');
const cutoverPreflight = readRepo('supabase/611_zz_marketplace_tax_cutover_preflight.sql');
const taxMigration = readRepo('supabase/612_marketplace_tax_evidence_boundary.sql');
const declarationMigration = readRepo('supabase/613_seller_tax_declaration_evidence.sql');
const declarationSnapshotMigration = readRepo('supabase/614_strengthen_marketplace_tax_snapshot_declaration.sql');
const locationEvidenceMigration = readRepo('supabase/615_authoritative_seller_tax_location_evidence.sql');
const sellerProfile = readRepo('src/pages/pixel-perfect/seller/SellerProfile.tsx');

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
  businessAddress: { postcode: 'BB1 1AA', countryCode: 'GB' },
  taxDeclarationConfirmed: true,
  taxDeclarationVersion: 1,
  taxDeclarationSource: 'seller_self_declaration_v1',
  taxDeclarationCapturedAt: '2026-08-20T19:00:00.000Z',
};

const gbAddress = { country: 'United Kingdom', postcode: 'BB1 1AA' };

describe('marketplace tax evidence P1', () => {
  it('allows only the narrow GB explicitly-declared non-VAT physical-product transaction class', () => {
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
      sellerDeclarationVersion: 1,
      sellerDeclarationSource: 'seller_self_declaration_v1',
      sellerDeclarationCapturedAt: seller.taxDeclarationCapturedAt,
      reverseCharge: false,
      vatAmountPence: 0,
      evidenceVersion: 1,
    });
  });

  it.each([
    ['seller country missing', { seller: { ...seller, country: null } }],
    ['seller declaration not confirmed', { seller: { ...seller, taxDeclarationConfirmed: false } }],
    ['seller declaration version missing', { seller: { ...seller, taxDeclarationVersion: null } }],
    ['seller declaration source missing', { seller: { ...seller, taxDeclarationSource: null } }],
    ['seller declaration timestamp missing', { seller: { ...seller, taxDeclarationCapturedAt: null } }],
    ['seller VAT registered', { seller: { ...seller, isVatRegistered: true } }],
    ['seller VAT conflict', { seller: { ...seller, vatNumber: 'GB123456789' } }],
    ['Northern Ireland seller region', { seller: { ...seller, businessAddress: { postcode: 'BT1 1AA', countryCode: 'GB' } } }],
    ['Channel Islands seller region', { seller: { ...seller, businessAddress: { postcode: 'JE2 3AA', countryCode: 'GB' } } }],
    ['Isle of Man seller region outside current GB boundary', { seller: { ...seller, businessAddress: { postcode: 'IM1 1AA', countryCode: 'GB' } } }],
    ['international destination', { shippingAddress: { country: 'France' } }],
    ['Northern Ireland destination', { shippingAddress: { country: 'GB', postcode: 'BT1 1AA' } }],
    ['Channel Islands destination', { shippingAddress: { country: 'GB', postcode: 'GY1 1AA' } }],
    ['Isle of Man destination outside current GB boundary', { shippingAddress: { country: 'GB', postcode: 'IM1 1AA' } }],
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
      expect(source).toContain('taxDeclarationConfirmed');
      expect(source).toContain('taxDeclarationCapturedAt');
      expect(source).not.toContain('isVatVerified');
      expect(source).not.toContain('VAT_RATE');
      expect(source).not.toContain('/ 1.20');
    }
  });

  it('product write paths require declaration evidence and never invent blanket 20 percent VAT', () => {
    for (const source of [createProduct, updateProduct]) {
      expect(source).toContain('buildSellerNonVatProductEvidence');
      expect(source).toContain('hasExplicitSellerNonVatDeclaration');
      expect(source).toContain('taxTreatmentStatus');
      expect(source).toContain('taxEvidenceVersion');
      expect(source).toContain('taxDeclarationCapturedAt');
      expect(source).not.toContain('vatRate = 0.20');
      expect(source).not.toContain('price / 1.20');
      expect(source).not.toContain('nextPrice / 1.20');
    }
  });

  it('captures seller declaration evidence without backfilling historical default false values', () => {
    expect(declarationMigration).toContain('"taxDeclarationConfirmed" boolean NOT NULL DEFAULT false');
    expect(declarationMigration).toContain('seller_self_declaration_v1');
    expect(declarationMigration).toContain('capture_seller_tax_declaration_v1');
    expect(declarationMigration).not.toContain('UPDATE public.seller_profiles');
    expect(sellerProfile).toContain('taxDeclarationConfirmed');
    expect(sellerProfile).toContain('I confirm that the VAT registration status shown above is accurate');
    expect(sellerProfile).toContain('setSellerCountry("GB")');
  });

  it('binds seller declaration to server-only Stripe Connect tax-location evidence', () => {
    expect(locationEvidenceMigration).toContain('"taxCountry" text');
    expect(locationEvidenceMigration).toContain('"taxPostcode" text');
    expect(locationEvidenceMigration).toContain('stripe_connect_account_v1');
    expect(locationEvidenceMigration).toContain('private.protect_seller_tax_location_evidence_v1()');
    expect(locationEvidenceMigration).toContain("auth.role() IS DISTINCT FROM 'service_role'");
    expect(locationEvidenceMigration).toContain('v_location_supported');
    expect(locationEvidenceMigration).toContain('NEW."taxDeclarationConfirmed" := false');
    expect(locationEvidenceMigration).toContain("v_tax_postcode !~ '^(BT|GY|JE|IM|GX|BF)'");
    expect(connectOnboard).toContain("country: 'GB'");
    expect(connectOnboard).toContain("taxCountrySource: 'stripe_connect_account_v1'");
    expect(connectStatus).toContain("stripeUpdate.taxCountrySource = 'stripe_connect_account_v1'");
    expect(connectStatus).toContain('stripeUpdate.taxPostcode = stripeTaxPostcode');
  });

  it('blocks tax materializer cutover while pre-P1 payments are in flight', () => {
    expect(cutoverPreflight).toContain("WHERE ps.status = 'pending'");
    expect(cutoverPreflight).toContain("WHERE o.status = 'awaiting_payment'");
    expect(cutoverPreflight).toContain('P1 tax cutover blocked: pending payment_sessions exist');
    expect(cutoverPreflight).toContain('P1 tax cutover blocked: awaiting_payment orders exist');
  });

  it('database materialization remains one atomic boundary and is tax-evidence gated', () => {
    expect(taxMigration).toContain('CREATE OR REPLACE FUNCTION private.payment_session_has_marketplace_tax_snapshot_v1');
    expect(taxMigration).toContain('CREATE OR REPLACE FUNCTION public.server_materialize_paid_order_v1');
    expect(taxMigration).toContain('payment_session_has_commercial_snapshot_v1');
    expect(taxMigration).toContain('payment_session_has_marketplace_tax_snapshot_v1');
    expect(taxMigration).toContain('v_vat := 0;');
    expect(taxMigration).toContain('"taxDecisionSnapshot"');
    expect(taxMigration).toContain('"taxTreatmentSnapshot"');
    expect(taxMigration).toContain("'checkout_verified_tax_v1'");
    expect(taxMigration).not.toContain('v_product_paid / 1.20');
    expect(taxMigration).not.toContain('v_item_price / 1.20');

    expect(declarationSnapshotMigration).toContain("sellerDeclarationSource' = 'seller_self_declaration_v1");
    expect(declarationSnapshotMigration).toContain('sellerDeclarationCapturedAt');
    expect(declarationSnapshotMigration).toContain('payment_session_has_marketplace_tax_snapshot_v1');
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
