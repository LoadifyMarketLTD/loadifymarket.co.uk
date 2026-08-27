import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repo = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const canonical = repo('supabase/676_supplier_product_identity_bridge.sql');
const deploy = repo('supabase/migrations/20260827102500_supplier_product_identity_bridge.sql');

describe('Supplier Commerce E2E remediation Stage 1 — product identity bridge', () => {
  it('keeps the numbered and deployable migration copies identical', () => {
    expect(deploy).toBe(canonical);
  });

  it('creates one immutable canonical mapping per buyer-facing public product', () => {
    expect(canonical).toContain('private.supplier_product_listing_links');
    expect(canonical).toContain('public_product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT');
    expect(canonical).toContain('canonical_product_id uuid NOT NULL REFERENCES private.canonical_products(id) ON DELETE RESTRICT');
    expect(canonical).toContain('UNIQUE(public_product_id)');
    expect(canonical).toContain('supplier product listing identity is immutable');
    expect(canonical).toContain('BEFORE UPDATE OR DELETE ON private.supplier_product_listing_links');
  });

  it('does not expose the private bridge to browser roles', () => {
    expect(canonical).toContain('REVOKE ALL ON TABLE private.supplier_product_listing_links FROM PUBLIC, anon, authenticated, service_role');
    expect(canonical).toContain('GRANT EXECUTE ON FUNCTION public.server_link_supplier_product_listing_v1(uuid,uuid,text,jsonb)');
    expect(canonical).toContain('TO service_role');
    expect(canonical).toContain('REVOKE ALL ON FUNCTION public.server_link_supplier_product_listing_v1(uuid,uuid,text,jsonb)');
  });

  it('prevents historical marketplace products from being rebound after they have order history', () => {
    expect(canonical).toContain('ordered_public_product_cannot_be_rebound');
    expect(canonical).toContain('public.order_items oi WHERE oi."productId"=p_public_product_id');
  });

  it('provides a fail-closed service-side order-item to supplier-offer identity decision', () => {
    expect(canonical).toContain('public.server_supplier_order_item_identity_decision_v1');
    expect(canonical).toContain('public_product_not_linked_to_supplier_canonical_product');
    expect(canonical).toContain('order_item_supplier_offer_identity_mismatch');
    expect(canonical).toContain('supplier_order_item_identity_ready');
    expect(canonical).toContain('REVOKE ALL ON FUNCTION public.server_supplier_order_item_identity_decision_v1(uuid,uuid)');
  });

  it('adds the missing canonical-product foreign key to fulfilment leg items', () => {
    expect(canonical).toContain('supplier_fulfilment_leg_items_canonical_product_id_fkey');
    expect(canonical).toContain('FOREIGN KEY (canonical_product_id)');
    expect(canonical).toContain('REFERENCES private.canonical_products(id)');
  });

  it('closes product A -> supplier offer B contamination at the final DB write boundary', () => {
    expect(canonical).toContain('SELECT oi."orderId",oi."productId"');
    expect(canonical).toContain('WHERE public_product_id=v_public_product_id');
    expect(canonical).toContain('supplier fulfilment item public product must be linked to canonical supplier product');
    expect(canonical).toContain('supplier fulfilment item public product canonical identity mismatch');
  });

  it('prevents supplier product identity leaking into marketplace-seller or Loadify-direct fulfilment legs', () => {
    expect(canonical).toContain('NEW.supplier_offer_id IS NOT NULL OR NEW.canonical_product_id IS NOT NULL');
    expect(canonical).toContain('non-supplier fulfilment item cannot carry supplier product identity');
  });

  it('does not activate Supplier Commerce or implement provider side effects', () => {
    expect(canonical).not.toContain('enabled = true');
    expect(canonical).not.toContain('submitOrder(');
    expect(canonical).not.toContain('quoteShipping(');
    expect(canonical).not.toContain('AVASAM_');
  });
});
