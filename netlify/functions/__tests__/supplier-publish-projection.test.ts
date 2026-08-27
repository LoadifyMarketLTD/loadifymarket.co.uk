import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repo = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const canonical = repo('supabase/678_supplier_publish_projection.sql');
const deploy = repo('supabase/migrations/20260827114500_supplier_publish_projection.sql');

describe('Supplier Commerce E2E remediation Stage 3 — publish projection', () => {
  it('keeps numbered and deployable migration copies identical', () => {
    expect(deploy).toBe(canonical);
  });

  it('allows platform supplier listings without inventing a marketplace seller', () => {
    expect(canonical).toContain('ALTER COLUMN "sellerId" DROP NOT NULL');
    expect(canonical).toContain('"commercialMode"=\'loadify_supplier_fulfilled\'');
    expect(canonical).toContain('AND "sellerId" IS NULL');
    expect(canonical).toContain('existing marketplace/direct listing cannot be converted into a supplier-managed listing');
  });

  it('preserves legacy/current marketplace visibility and adds an explicit supplier-publication branch', () => {
    expect(canonical).toContain('DROP POLICY IF EXISTS products_select ON public.products');
    expect(canonical).toContain('public.is_seller_checkout_ready("sellerId")');
    expect(canonical).toContain('"supplierPublicationStatus"=\'active\'');
  });

  it('keeps supplier-managed product writes server-only', () => {
    expect(canonical).toContain('supplier-managed public listings are server-managed only');
    expect(canonical).toContain('REVOKE ALL ON TABLE private.supplier_listing_projections FROM PUBLIC,anon,authenticated,service_role');
    expect(canonical).toContain('GRANT EXECUTE ON FUNCTION public.server_publish_supplier_listing_v1');
    expect(canonical).toContain('TO service_role');
  });

  it('requires the canonical publish control before publish or refresh', () => {
    expect(canonical).toContain("public.server_supplier_commerce_control_decision_v1(\n    'publish'");
    expect(canonical).toContain("'publish_control_disabled'");
  });

  it('requires current supplier stock, price and economics readiness', () => {
    expect(canonical).toContain('public.server_supplier_stock_price_decision_v1');
    expect(canonical).toContain("'loadify_supplier_fulfilled','GB'");
    expect(canonical).toContain("'known_positive_sellable_quantity_required'");
    expect(canonical).toContain("'approved_current_gbp_pricing_snapshot_required'");
  });

  it('uses approved buyer pricing rather than raw supplier price as public listing price', () => {
    expect(canonical).toContain('v_pricing.gross_customer_price-v_pricing.customer_shipping_charge');
    expect(canonical).not.toContain('supplierPriceMinor / 100');
    expect(canonical).not.toContain('amount_minor / 100');
  });

  it('creates one replay-safe public projection per canonical product and variant', () => {
    expect(canonical).toContain('private.supplier_listing_projections');
    expect(canonical).toContain('UNIQUE(canonical_product_id,external_variant_ref)');
    expect(canonical).toContain('supplier publication idempotency key collision');
    expect(canonical).toContain("'replayed',true");
  });

  it('binds every new buyer listing back to the Stage 1 canonical identity bridge', () => {
    expect(canonical).toContain('public.server_link_supplier_product_listing_v1');
    expect(canonical).toContain("'supplier_publish_v1'");
    expect(canonical).toContain('supplier publication identity bridge failed');
  });

  it('keeps hold/unpublish available even when publish is disabled', () => {
    expect(canonical).toContain('public.server_set_supplier_listing_state_v1');
    expect(canonical).toContain("v_state NOT IN ('held','unpublished')");
    expect(canonical).toContain("'safetyAction',true");
    const stateFn = canonical.split('CREATE OR REPLACE FUNCTION public.server_set_supplier_listing_state_v1')[1] ?? '';
    expect(stateFn).not.toContain("server_supplier_commerce_control_decision_v1(\n    'publish'");
  });

  it('does not enable Supplier Commerce or create provider/pilot data', () => {
    expect(canonical).not.toContain('SET enabled=true');
    expect(canonical).not.toContain('enabled = true');
    expect(canonical).not.toContain('INSERT INTO private.supplier_foundation_suppliers');
    expect(canonical).not.toContain('INSERT INTO private.supplier_pilot_programs');
    expect(canonical).not.toContain('AVASAM_');
  });
});
