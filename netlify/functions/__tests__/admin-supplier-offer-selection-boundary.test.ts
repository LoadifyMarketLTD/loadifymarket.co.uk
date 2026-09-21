import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const endpoint = readFileSync(
  resolve(process.cwd(), 'netlify/functions/admin-supplier-offer-selection.ts'),
  'utf8',
);
const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260921091538_supplier_projection_multi_offer_bindings.sql'),
  'utf8',
);

describe('admin supplier offer selection boundary', () => {
  it('requires active admin authority for evaluation and binding mutations', () => {
    expect(endpoint).toContain("authenticateActiveAccount(event, admin, ['admin'])");
    expect(endpoint).toContain("action === 'evaluate'");
    expect(endpoint).toContain("['bind', 'approve', 'disable']");
  });

  it('evaluates through the provider-neutral runtime rather than provider-specific code', () => {
    expect(endpoint).toContain('evaluateProjectionSupplierOffers');
    expect(endpoint).not.toContain('avasam');
    expect(endpoint).not.toContain('syncee');
    expect(endpoint).not.toContain('appscenic');
  });

  it('uses one admin-only RPC to govern projection-offer bindings', () => {
    expect(endpoint).toContain('server_admin_supplier_projection_offer_binding_v1');
    expect(migration).toContain('server_admin_supplier_projection_offer_binding_v1');
    expect(migration).toContain('supplier offer is not interchangeable for this canonical projection');
  });

  it('does not activate providers, submit supplier orders, charge buyers or publish products', () => {
    expect(endpoint).not.toContain('submitOrder');
    expect(endpoint).not.toContain('create-supplier-payment-intent');
    expect(endpoint).not.toContain('server_publish_supplier_marketplace_projection_v1');
    expect(endpoint).not.toContain('productionEnableRequested');
  });
});
