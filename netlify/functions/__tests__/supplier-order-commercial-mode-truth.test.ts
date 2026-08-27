import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repo = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const canonical = repo('supabase/677_order_commercial_mode_truth.sql');
const deploy = repo('supabase/migrations/20260827104000_order_commercial_mode_truth.sql');

describe('Supplier Commerce E2E remediation Stage 2 — immutable commercial-mode truth', () => {
  it('keeps numbered and deployable migration copies identical', () => {
    expect(deploy).toBe(canonical);
  });

  it('keeps one public customer-order truth and introduces only the three Gate B modes', () => {
    expect(canonical).toContain('ALTER TABLE public.orders');
    expect(canonical).toContain('"commercialModeSnapshot" text');
    for (const mode of ['marketplace_seller', 'loadify_supplier_fulfilled', 'loadify_direct']) {
      expect(canonical).toContain(`'${mode}'`);
    }
    expect(canonical).not.toContain('CREATE TABLE public.supplier_orders');
    expect(canonical).not.toContain('CREATE TABLE private.customer_orders');
  });

  it('allows Loadify-sale modes without a fake marketplace sellerId while preserving legacy/current marketplace rows', () => {
    expect(canonical).toContain('ALTER COLUMN "sellerId" DROP NOT NULL');
    expect(canonical).toContain('"commercialModeSnapshot" IS NULL\n      AND "sellerId" IS NOT NULL');
    expect(canonical).toContain('"commercialModeSnapshot"=\'marketplace_seller\'\n      AND "sellerId" IS NOT NULL');
    expect(canonical).toContain('"commercialModeSnapshot" IN (\'loadify_supplier_fulfilled\',\'loadify_direct\')\n      AND "sellerId" IS NULL');
  });

  it('snapshots legal seller, merchant of record, invoice issuer, payment recipient and return responsibility', () => {
    for (const field of [
      'legalSellerRefSnapshot',
      'legalSellerNameSnapshot',
      'merchantOfRecordRefSnapshot',
      'merchantOfRecordNameSnapshot',
      'invoiceIssuerRefSnapshot',
      'invoiceIssuerNameSnapshot',
      'paymentRecipientRefSnapshot',
      'paymentRecipientNameSnapshot',
      'returnResponsibilitySnapshot',
    ]) {
      expect(canonical).toContain(`"${field}"`);
    }
  });

  it('requires marketplace seller commercial roles to resolve to the exact seller identity', () => {
    expect(canonical).toContain('"legalSellerRefSnapshot"="sellerId"::text');
    expect(canonical).toContain('"merchantOfRecordRefSnapshot"="legalSellerRefSnapshot"');
    expect(canonical).toContain('"invoiceIssuerRefSnapshot"="legalSellerRefSnapshot"');
    expect(canonical).toContain('"paymentRecipientRefSnapshot"="legalSellerRefSnapshot"');
    expect(canonical).toContain('"returnResponsibilitySnapshot"=\'marketplace_seller\'');
  });

  it('requires Loadify-sale commercial roles to remain Loadify-owned without sellerId overload', () => {
    expect(canonical).toContain('"returnResponsibilitySnapshot"=\'loadify\'');
    expect(canonical).toContain('"merchantOfRecordNameSnapshot"="legalSellerNameSnapshot"');
    expect(canonical).toContain('"invoiceIssuerNameSnapshot"="legalSellerNameSnapshot"');
    expect(canonical).toContain('"paymentRecipientNameSnapshot"="legalSellerNameSnapshot"');
  });

  it('captures supplier route identity separately on order items', () => {
    expect(canonical).toContain('"supplierCanonicalProductIdSnapshot" uuid REFERENCES private.canonical_products(id)');
    expect(canonical).toContain('"supplierOfferIdSnapshot" uuid REFERENCES private.supplier_offers(id)');
    expect(canonical).toContain('"supplierVariantRefSnapshot" text');
    expect(canonical).toContain('"fulfillerTypeSnapshot" text');
    expect(canonical).toContain('"fulfillerTypeSnapshot"=\'supplier\'');
  });

  it('binds supplier route snapshots back to the Stage 1 public-product identity bridge', () => {
    expect(canonical).toContain('private.supplier_product_listing_links');
    expect(canonical).toContain('WHERE public_product_id=NEW."productId"');
    expect(canonical).toContain('order item public product must map to supplier canonical product snapshot');
    expect(canonical).toContain('order item supplier offer snapshot must match canonical supplier product snapshot');
  });

  it('prevents retroactive reconstruction or mutation of paid commercial truth', () => {
    expect(canonical).toContain('historical paid order commercial mode may not be reconstructed after the fact');
    expect(canonical).toContain('order commercial mode snapshot is immutable once captured');
    expect(canonical).toContain('historical order item commercial mode may not be reconstructed after the fact');
    expect(canonical).toContain('order item commercial mode/route snapshot is immutable once captured');
  });

  it('keeps server decision access service-role only and enables nothing', () => {
    expect(canonical).toContain('public.server_order_commercial_mode_decision_v1');
    expect(canonical).toContain('REVOKE ALL ON FUNCTION public.server_order_commercial_mode_decision_v1(uuid)');
    expect(canonical).toContain('TO service_role');
    expect(canonical).not.toContain('enabled = true');
    expect(canonical).not.toContain('AVASAM_');
  });
});
