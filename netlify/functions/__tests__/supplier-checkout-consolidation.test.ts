import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repo = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const canonical = repo('supabase/679_supplier_checkout_consolidation.sql');
const deploy = repo('supabase/migrations/20260827120500_supplier_checkout_consolidation.sql');
const helper = repo('netlify/functions/_shared/supplierCheckout.ts');
const executableSql = (sql: string) => sql
  .split('\n')
  .filter((line) => !line.trim().startsWith('--'))
  .join('\n');

describe('Supplier Commerce E2E remediation Stage 4A — checkout consolidation', () => {
  it('keeps numbered and deployable executable SQL identical', () => {
    expect(executableSql(deploy)).toBe(executableSql(canonical));
  });

  it('repairs checkout control scope for controlled pilot supplier identity', () => {
    expect(canonical).toContain('CREATE OR REPLACE FUNCTION public.server_supplier_offer_checkout_guard_v1');
    expect(canonical).toContain("'supplierRef',v_offer.supplier_id::text");
    expect(canonical).toContain("'offerRef',v_offer.id::text");
    expect(canonical).toContain("'checkout'");
  });

  it('resolves checkout from public listing through the canonical supplier projection', () => {
    expect(canonical).toContain('public.server_supplier_listing_checkout_decision_v1');
    expect(canonical).toContain('private.supplier_listing_projections');
    expect(canonical).toContain('private.supplier_product_listing_links');
    expect(canonical).toContain('supplier_listing_identity_mismatch');
  });

  it('requires active supplier publication and no fake seller identity', () => {
    expect(canonical).toContain('v_product."commercialMode" IS DISTINCT FROM \'loadify_supplier_fulfilled\'');
    expect(canonical).toContain('OR v_product."sellerId" IS NOT NULL');
    expect(canonical).toContain('OR v_product."supplierPublicationStatus"<>\'active\'');
  });

  it('requires canonical checkout stock/price/economics guard and exact projected pricing', () => {
    expect(canonical).toContain('public.server_supplier_offer_checkout_guard_v1');
    expect(canonical).toContain('buyer_listing_pricing_projection_stale');
    expect(canonical).toContain('buyer_listing_price_projection_stale');
    expect(canonical).toContain('requested_quantity_exceeds_sellable_quantity');
  });

  it('returns immutable route/evidence ids needed by payment and reservation stages', () => {
    for (const field of [
      'canonicalProductId', 'supplierOfferId', 'supplierId', 'externalVariantRef',
      'pricingSnapshotId', 'stockObservationId', 'priceObservationId',
      'unitPricePence', 'customerShippingChargePence', 'publicationVersion',
    ]) expect(canonical).toContain(`'${field}'`);
  });

  it('exposes the decision through a fail-closed typed server helper', () => {
    expect(helper).toContain('server_supplier_listing_checkout_decision_v1');
    expect(helper).toContain('supplier_listing_checkout_unavailable');
    expect(helper).toContain("commercialMode?: 'loadify_supplier_fulfilled'");
    expect(helper).toContain("currency?: 'GBP'");
  });

  it('does not create a reservation, payment, supplier order or enable commerce', () => {
    expect(canonical).not.toContain('INSERT INTO public.payment_sessions');
    expect(canonical).not.toContain('INSERT INTO private.supplier_stock_reservations');
    expect(canonical).not.toContain('submitOrder(');
    expect(canonical).not.toContain('SET enabled=true');
  });
});
