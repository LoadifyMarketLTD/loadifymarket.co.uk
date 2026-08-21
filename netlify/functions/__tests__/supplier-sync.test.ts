import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import {
  SUPPLIER_SYNC_INTERFACE_VERSION,
  evaluateSupplierCheckoutGuard,
  evaluateSupplierStockPrice,
} from '../_shared/supplierSync';
import { runSupplierStockPriceSync } from '../_shared/supplierSyncRuntime';
import type { SupplierAdapterV1 } from '../_shared/supplierAdapter';

const repo = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const migration = repo('supabase/628_supplier_stock_price_sync.sql');
const guards = repo('supabase/629_supplier_stock_price_sync_guards.sql');
const versioning = repo('supabase/630_supplier_sync_policy_versioning_closure.sql');
const drift = repo('supabase/631_supplier_price_drift_closure.sql');
const adapter = repo('netlify/functions/_shared/supplierAdapter.ts');
const control = repo('netlify/functions/_shared/supplierCommerceControl.ts');
const runtime = repo('netlify/functions/_shared/supplierSyncRuntime.ts');
const adminApi = repo('netlify/functions/admin-supplier-sync.ts');

const OFFER_ID = '11111111-1111-4111-8111-111111111111';
const PRODUCT_ID = '22222222-2222-4222-8222-222222222222';

describe('Phase H Stock + Price Sync', () => {
  it('uses the canonical provider-neutral adapter stock and price capabilities', () => {
    expect(adapter).toContain("| 'stock'");
    expect(adapter).toContain("| 'price'");
    expect(adapter).toContain('getStock?');
    expect(adapter).toContain('getPrices?');
    expect(runtime).toContain("adapterSupports(adapter, 'stock')");
    expect(runtime).toContain("adapterSupports(adapter, 'price')");
  });

  it('extends the canonical control plane with stock_sync and price_sync, both OFF by default', () => {
    expect(migration).toContain("'stock_sync', 'global', NULL, false");
    expect(migration).toContain("'price_sync', 'global', NULL, false");
    expect(guards).toContain("'stock_sync','price_sync'");
    expect(control).toContain("| 'stock_sync'");
    expect(control).toContain("| 'price_sync'");
    expect(migration).not.toContain('SET enabled = true');
    expect(guards).not.toContain('SET enabled = true');
  });

  it('keeps raw supplier stock and raw supplier price as append-only evidence, not buyer truth', () => {
    expect(migration).toContain('private.supplier_stock_observations');
    expect(migration).toContain('private.supplier_price_observations');
    expect(migration).toContain('Raw supplier stock is not Loadify sellable stock');
    expect(migration).toContain('not buyer price truth');
    expect(guards).toContain('supplier sync observations are append-only');
    expect(guards).toContain('BEFORE UPDATE OR DELETE ON private.supplier_stock_observations');
    expect(guards).toContain('BEFORE UPDATE OR DELETE ON private.supplier_price_observations');
  });

  it('requires an approved versioned freshness/safety policy before sellability', () => {
    expect(migration).toContain('private.supplier_offer_sync_policies');
    expect(migration).toContain('stock_max_age_seconds');
    expect(migration).toContain('price_max_age_seconds');
    expect(migration).toContain('safety_stock_quantity');
    expect(migration).toContain('allow_unknown_quantity');
    expect(versioning).toContain('supplier_offer_sync_policy_version_unique');
    expect(versioning).toContain('supplier_offer_sync_policy_one_current_approved_unique');
    expect(guards).toContain('approved sync policy is immutable');
  });

  it('fails closed on stale, missing, unknown or exhausted stock evidence', () => {
    for (const reason of ['stock_observation_missing', 'stock_stale', 'stock_unavailable', 'stock_quantity_unknown', 'safety_stock_exhausted']) {
      expect(drift).toContain(`'${reason}'`);
    }
    expect(drift).toContain('GREATEST(v_stock.quantity-v_policy.safety_stock_quantity,0)');
  });

  it('fails closed on missing/stale price and requires current Phase G economics', () => {
    expect(drift).toContain("'price_observation_missing'");
    expect(drift).toContain("'price_stale'");
    expect(drift).toContain('server_supplier_commercial_decision_v1');
    expect(drift).toContain("'commercial_economics_not_ready'");
  });

  it('blocks supplier price drift until landed-cost/pricing evidence is recomputed', () => {
    expect(drift).toContain('v_landed.supplier_product_cost*100');
    expect(drift).toContain("'supplier_price_changed'");
    expect(drift).toContain("'supplier_price_currency_changed'");
    expect(drift).toContain('expectedSupplierPriceMinor');
  });

  it('requires supplier foundation readiness for both stock and price capabilities', () => {
    expect(drift).toContain("server_supplier_foundation_decision_v1(v_supplier.supplier_key,v_offer.territory,'stock')");
    expect(drift).toContain("server_supplier_foundation_decision_v1(v_supplier.supplier_key,v_offer.territory,'price')");
    expect(drift).toContain("'stock_capability_not_ready'");
    expect(drift).toContain("'price_capability_not_ready'");
  });

  it('provides a server-side checkout guard instead of trusting UI stock', () => {
    expect(guards).toContain('public.server_supplier_offer_checkout_guard_v1');
    expect(guards).toContain("server_supplier_commerce_control_decision_v1('checkout'");
    expect(guards).toContain('server_supplier_stock_price_decision_v1');
    expect(guards).toContain("'checkout_control_disabled'");
    expect(guards).toContain("'stock_price_not_ready'");
  });

  it('keeps Phase H storage private and mutations service-role only', () => {
    for (const table of ['supplier_offer_sync_policies', 'supplier_stock_observations', 'supplier_price_observations']) {
      expect(migration).toContain(`REVOKE ALL ON TABLE private.${table} FROM PUBLIC, anon, authenticated, service_role`);
    }
    expect(guards).toContain('GRANT EXECUTE ON FUNCTION public.server_record_supplier_sync_observation_v1');
    expect(guards).toContain('GRANT EXECUTE ON FUNCTION public.server_admin_supplier_sync_policy_v1');
    expect(guards).toContain('GRANT EXECUTE ON FUNCTION public.server_supplier_offer_checkout_guard_v1');
  });

  it('uses active-admin authority and rejects secret-bearing policy payloads', () => {
    expect(guards).toContain("u.role='admin'");
    expect(guards).toContain('u."isActive"=true');
    expect(adminApi).toContain("authenticateActiveAccount(event, admin, ['admin'])");
    expect(adminApi).toContain('password|secret|access[_-]?token');
  });

  it('fails closed when stock/price decision evidence is malformed', async () => {
    const rpc = vi.fn(async () => ({ data: { eligible: true }, error: null }));
    const client = { rpc } as unknown as SupabaseClient;
    await expect(evaluateSupplierStockPrice(client, {
      supplierOfferId: OFFER_ID,
      canonicalProductId: PRODUCT_ID,
      commercialMode: 'loadify_supplier_fulfilled',
    })).resolves.toEqual({
      eligible: false,
      reason: 'supplier_sync_unavailable',
      interfaceVersion: SUPPLIER_SYNC_INTERFACE_VERSION,
    });
  });

  it('accepts only structurally complete stock/price readiness evidence', async () => {
    const expected = {
      eligible: true,
      reason: 'stock_price_ready',
      supplierOfferId: OFFER_ID,
      canonicalProductId: PRODUCT_ID,
      stockObservationId: '33333333-3333-4333-8333-333333333333',
      priceObservationId: '44444444-4444-4444-8444-444444444444',
      pricingSnapshotId: '55555555-5555-4555-8555-555555555555',
      availability: 'in_stock' as const,
      sellableQuantity: 7,
      supplierPriceMinor: 1299,
      currency: 'GBP',
      stockObservedAt: '2026-08-21T00:00:00.000Z',
      priceObservedAt: '2026-08-21T00:00:00.000Z',
      policyVersion: 2,
      interfaceVersion: 1,
    };
    const rpc = vi.fn(async () => ({ data: expected, error: null }));
    const client = { rpc } as unknown as SupabaseClient;
    await expect(evaluateSupplierStockPrice(client, {
      supplierOfferId: OFFER_ID,
      canonicalProductId: PRODUCT_ID,
      commercialMode: 'loadify_supplier_fulfilled',
    })).resolves.toEqual(expected);
  });

  it('keeps checkout eligibility fail-closed when its RPC is unavailable', async () => {
    const rpc = vi.fn(async () => ({ data: null, error: new Error('db unavailable') }));
    const client = { rpc } as unknown as SupabaseClient;
    await expect(evaluateSupplierCheckoutGuard(client, {
      supplierOfferId: OFFER_ID,
      canonicalProductId: PRODUCT_ID,
      commercialMode: 'loadify_supplier_fulfilled',
    })).resolves.toEqual({ eligible: false, reason: 'supplier_checkout_guard_unavailable', interfaceVersion: 1 });
  });

  it('runs provider-neutral stock and price ingestion only through the server RPC boundary', async () => {
    const rpc = vi.fn(async (name: string) => {
      if (name === 'server_record_supplier_sync_observation_v1') return { data: { accepted: true, changed: true }, error: null };
      if (name === 'server_record_supplier_commerce_operation_v1') return { data: 'op-1', error: null };
      return { data: null, error: null };
    });
    const client = { rpc } as unknown as SupabaseClient;
    const supplierAdapter: SupplierAdapterV1 = {
      interfaceVersion: 1,
      providerKey: 'provider-a',
      adapterVersion: '1.2.3',
      capabilities: ['stock', 'price'],
      getStock: vi.fn(async () => ({ ok: true, data: [{ externalVariantRef: 'v1', quantity: 10, availability: 'in_stock', observedAt: '2026-08-21T00:00:00.000Z' }] })),
      getPrices: vi.fn(async () => ({ ok: true, data: [{ externalVariantRef: 'v1', amountMinor: 1299, currency: 'GBP', observedAt: '2026-08-21T00:00:00.000Z' }] })),
    };

    await expect(runSupplierStockPriceSync(client, supplierAdapter, {
      correlationId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      idempotencyKey: 'sync-1',
      supplierKey: 'supplier-a',
      territory: 'GB',
    }, {
      supplierOfferId: OFFER_ID,
      supplierKey: 'supplier-a',
      offerKey: 'offer-a',
      canonicalProductId: PRODUCT_ID,
      externalVariantRefs: ['v1'],
      territory: 'GB',
    })).resolves.toEqual({ ok: true, stockAccepted: 1, priceAccepted: 1, blocked: false });

    expect(rpc).toHaveBeenCalledWith('server_record_supplier_sync_observation_v1', expect.objectContaining({ p_kind: 'stock' }));
    expect(rpc).toHaveBeenCalledWith('server_record_supplier_sync_observation_v1', expect.objectContaining({ p_kind: 'price' }));
  });
});
