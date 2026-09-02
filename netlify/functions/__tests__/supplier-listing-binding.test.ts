import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import {
  LOADIFY_SUPPLIER_FULFILLED_COMMERCIAL_MODE,
  LOADIFY_SUPPLIER_FULFILLED_LEGAL_SELLER_KEY,
  SUPPLIER_PUBLICATION_BINDING_INTERFACE_VERSION,
  evaluateSupplierPublicationBinding,
} from '../_shared/supplierPublicationBinding';

const repo = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const foundation = repo('supabase/681_supplier_publication_binding_foundation.sql');
const migration = repo('supabase/migrations/20260902065500_supplier_publication_binding_foundation.sql');

const PRODUCT_ID = '11111111-1111-4111-8111-111111111111';
const OFFER_ID = '22222222-2222-4222-8222-222222222222';
const BINDING_ID = '33333333-3333-4333-8333-333333333333';
const CANONICAL_ID = '44444444-4444-4444-8444-444444444444';

describe('Supplier publication binding foundation', () => {
  it('keeps the source and timestamped migration identical', () => {
    expect(migration).toBe(foundation);
  });

  it('creates a private one-to-one bridge from public listing to canonical supplier identity', () => {
    expect(foundation).toContain('CREATE TABLE IF NOT EXISTS private.supplier_publication_bindings');
    expect(foundation).toContain('public_product_id uuid NOT NULL UNIQUE REFERENCES public.products');
    expect(foundation).toContain('canonical_product_id uuid NOT NULL REFERENCES private.canonical_products');
    expect(foundation).toContain('source_import_item_id uuid NOT NULL REFERENCES private.supplier_import_items');
    expect(foundation).toContain("commercial_mode = 'loadify_supplier_fulfilled'");
    expect(foundation).toContain("legal_seller_key = 'xdrive_logistics_ltd_ta_loadify_market'");
    expect(foundation).toContain("status IN ('draft','review','approved','restricted','retired')");
  });

  it('requires admin-reviewed canonical/import evidence before a binding can be approved', () => {
    expect(foundation).toContain('active admin approval is required for supplier publication binding');
    expect(foundation).toContain("v_canonical.status <> 'active'");
    expect(foundation).toContain("v_import_item.status <> 'approved'");
    expect(foundation).toContain('server_supplier_import_decision_v1');
    expect(foundation).toContain('supplier publication source import is not ready');
    expect(foundation).toContain('approved supplier publication binding identity is immutable');
  });

  it('reuses canonical catalog, import and economics truth for selected supplier offers', () => {
    expect(foundation).toContain('server_supplier_catalog_decision_v1');
    expect(foundation).toContain('server_supplier_import_decision_v1');
    expect(foundation).toContain('server_supplier_commercial_decision_v1');
    expect(foundation).toContain("'loadify_supplier_fulfilled'");
    expect(foundation).toContain('supplier_offer_not_bound_to_public_product');
    expect(foundation).toContain("'supplier_listing_binding_ready'");
  });

  it('closes the order-item to arbitrary supplier-offer identity gap fail-closed', () => {
    expect(foundation).toContain('CREATE OR REPLACE FUNCTION private.guard_supplier_fulfilment_item_identity_v1()');
    expect(foundation).toContain('oi."productId"');
    expect(foundation).toContain('server_supplier_listing_binding_decision_v1');
    expect(foundation).toContain('supplier fulfilment item public listing binding is not ready');
    expect(foundation).toContain('public listing binding canonical product must match fulfilment item');
  });

  it('does not publish products or alter seller-facing marketplace visibility/payment paths', () => {
    expect(foundation).not.toMatch(/UPDATE\s+public\.products/i);
    expect(foundation).not.toMatch(/INSERT\s+INTO\s+public\.products/i);
    expect(foundation).not.toContain('CREATE POLICY products_select');
    expect(foundation).not.toContain('is_seller_checkout_ready');
    expect(foundation).not.toContain('stripeAccountId');
    expect(foundation).not.toContain('SET enabled = true');
  });

  it('keeps the binding table private and mutation/decision RPCs service-role only', () => {
    expect(foundation).toContain('REVOKE ALL ON TABLE private.supplier_publication_bindings FROM PUBLIC, anon, authenticated, service_role');
    expect(foundation).toContain('GRANT EXECUTE ON FUNCTION public.server_admin_supplier_publication_binding_v1(uuid, text, jsonb)');
    expect(foundation).toContain('GRANT EXECUTE ON FUNCTION public.server_supplier_listing_binding_decision_v1(uuid, uuid, text)');
    expect(foundation).toContain('TO service_role');
  });

  it('fails closed on invalid input before RPC', async () => {
    const rpc = vi.fn();
    const client = { rpc } as unknown as SupabaseClient;
    await expect(evaluateSupplierPublicationBinding(client, {
      publicProductId: 'not-a-uuid',
      supplierOfferId: OFFER_ID,
    })).resolves.toEqual({
      eligible: false,
      reason: 'supplier_publication_binding_input_invalid',
      interfaceVersion: SUPPLIER_PUBLICATION_BINDING_INTERFACE_VERSION,
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('fails closed when the binding RPC is unavailable or malformed', async () => {
    const rpc = vi.fn(async () => ({ data: { eligible: true }, error: null }));
    const client = { rpc } as unknown as SupabaseClient;
    await expect(evaluateSupplierPublicationBinding(client, {
      publicProductId: PRODUCT_ID,
      supplierOfferId: OFFER_ID,
    })).resolves.toEqual({
      eligible: false,
      reason: 'supplier_publication_binding_unavailable',
      interfaceVersion: SUPPLIER_PUBLICATION_BINDING_INTERFACE_VERSION,
    });
  });

  it('accepts only the exact Loadify Supplier-Fulfilled identity contract', async () => {
    const expected = {
      eligible: true,
      reason: 'supplier_listing_binding_ready',
      bindingId: BINDING_ID,
      publicProductId: PRODUCT_ID,
      canonicalProductId: CANONICAL_ID,
      supplierOfferId: OFFER_ID,
      commercialMode: LOADIFY_SUPPLIER_FULFILLED_COMMERCIAL_MODE,
      legalSellerKey: LOADIFY_SUPPLIER_FULFILLED_LEGAL_SELLER_KEY,
      territory: 'GB',
      interfaceVersion: 1 as const,
    };
    const rpc = vi.fn(async () => ({ data: expected, error: null }));
    const client = { rpc } as unknown as SupabaseClient;

    await expect(evaluateSupplierPublicationBinding(client, {
      publicProductId: PRODUCT_ID,
      supplierOfferId: OFFER_ID,
      territory: 'gb',
    })).resolves.toEqual(expected);
    expect(rpc).toHaveBeenCalledWith('server_supplier_listing_binding_decision_v1', {
      p_public_product_id: PRODUCT_ID,
      p_supplier_offer_id: OFFER_ID,
      p_territory: 'GB',
    });
  });
});
