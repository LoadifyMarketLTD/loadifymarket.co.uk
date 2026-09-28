import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260928175500_universal_supplier_stock_price_scheduler.sql'),
  'utf8',
);
const scheduler = readFileSync(
  resolve(process.cwd(), 'netlify/functions-modern/universal-supplier-stock-price-scheduled.ts'),
  'utf8',
);

describe('Universal supplier stock/price scheduler boundary', () => {
  it('selects only approved supplier offers with verified automated-read stock and price bindings', () => {
    expect(migration).toContain("o.status='approved'");
    expect(migration).toContain("s.lifecycle_status='approved'");
    expect(migration).toContain("ci.status='linked'");
    expect(migration).toContain("stock_profile.capability='stock'");
    expect(migration).toContain("price_profile.capability='price'");
    expect(migration).toContain("stock_profile.status='verified'");
    expect(migration).toContain("price_profile.status='verified'");
    expect(migration).toContain("stock_profile.execution_mode='automated_read'");
    expect(migration).toContain("price_profile.execution_mode='automated_read'");
  });

  it('keeps selector service-role-only and free of external or commerce mutation', () => {
    expect(migration).toContain('server_supplier_stock_price_sync_due_v1');
    expect(migration).toContain('FROM PUBLIC, anon, authenticated');
    expect(migration).toContain('TO service_role');
    expect(migration).toContain("'externalMutationPerformed', false");
    expect(migration).toContain("'marketplacePublicationPerformed', false");
    expect(migration).toContain("'checkoutMutationPerformed', false");
    expect(migration).not.toContain('INSERT INTO public.orders');
    expect(migration).not.toContain('supplier_marketplace_projections');
  });

  it('uses the provider-neutral integration runtime and adapter rather than a provider-specific adapter', () => {
    expect(scheduler).toContain('loadSupplierIntegrationRuntime');
    expect(scheduler).toContain('UniversalDirectSupplierAdapterV1');
    expect(scheduler).not.toContain('createAvasamAdapterV1');
    expect(scheduler).not.toContain('AVASAM_PILOT_SKU');
  });

  it('fails closed before provider access unless policy and both sync controls allow execution', () => {
    expect(scheduler).toContain('!policy.providerReadsAllowed || !policy.observationWritesAllowed');
    expect(scheduler).toContain("evaluateSupplierCommerceControl(admin, 'stock_sync'");
    expect(scheduler).toContain("evaluateSupplierCommerceControl(admin, 'price_sync'");
    expect(scheduler).toContain("code: 'SYNC_CONTROL_DISABLED'");
  });

  it('applies the circuit breaker and writes only canonical observations', () => {
    expect(scheduler).toContain('evaluateSupplierFeedBatch');
    expect(scheduler).toContain('persistSupplierStockPriceSnapshots');
    expect(scheduler).toContain("requireStockQuantity: true");
    expect(scheduler).toContain("batch.decision === 'auto_quarantine'");
    expect(scheduler).toContain('publicSellabilityAllowed: false');
    expect(scheduler).toContain('marketplacePublicationAllowed: false');
  });

  it('runs on a bounded 15-minute schedule', () => {
    expect(scheduler).toContain("schedule: '*/15 * * * *'");
    expect(scheduler).toContain('p_limit: 5');
    expect(scheduler).toContain('.slice(0, 5)');
  });
});
