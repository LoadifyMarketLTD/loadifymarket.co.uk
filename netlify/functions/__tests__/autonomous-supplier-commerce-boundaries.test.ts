import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repo = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('Autonomous Supplier Commerce integration boundaries', () => {
  it('keeps the direct supplier ingress disabled by default and HMAC-bound', () => {
    const endpoint = repo('netlify/functions/direct-supplier-signed-feed.ts');
    expect(endpoint).toContain('DIRECT_SUPPLIER_SIGNED_FEED_ENDPOINT_ENABLED');
    expect(endpoint).toContain("return jsonResponse(404, { error: 'Not found' }");
    expect(endpoint).toContain("event.headers['x-loadify-supplier-timestamp']");
    expect(endpoint).toContain("event.headers['x-loadify-supplier-signature']");
    expect(endpoint).toContain('processDirectSupplierSignedFeed');
    expect(endpoint).toContain('commercialActivationPerformed: false');
    expect(endpoint).toContain('marketplaceListingPerformed: false');
  });

  it('does not activate BigBuy in the autonomous scheduler', () => {
    const scheduler = repo('netlify/functions/autonomous-supplier-commerce.ts');
    expect(scheduler).toContain('createAvasamAdapterV1');
    expect(scheduler).not.toContain('createBigBuy');
    expect(scheduler).not.toContain('BIGBUY_API_KEY');
    expect(scheduler).toContain('policy.providerReadsAllowed');
    expect(scheduler).toContain('policy.observationWritesAllowed');
  });

  it('persists supplier observations only through the canonical server RPC boundary', () => {
    const runtime = repo('netlify/functions/_shared/supplierSyncRuntime.ts');
    expect(runtime).toContain('persistSupplierStockPriceSnapshots');
    expect(runtime).toContain("server_record_supplier_sync_observation_v1");
    expect(runtime).not.toContain(".from('supplier_stock_observations')");
    expect(runtime).not.toContain(".from('supplier_price_observations')");
  });

  it('binds buyer support and return eligibility to the active authenticated buyer identity', () => {
    const support = repo('netlify/functions/customer-order-assistant.ts');
    const returns = repo('netlify/functions/customer-return-eligibility.ts');
    for (const source of [support, returns]) {
      expect(source).toContain('authenticateActiveAccount(event, admin)');
      expect(source).toContain(".eq('buyerId', auth.actor.id)");
    }
    expect(returns).toContain('supplierReturnCapability: false');
    expect(returns).toContain('carrierLabelCapability: false');
  });

  it('packages both autonomous jobs as scheduled Netlify functions', () => {
    const config = repo('netlify.toml');
    expect(config).toContain('[functions."autonomous-supplier-commerce"]');
    expect(config).toContain('schedule = "17 * * * *"');
    expect(config).toContain('[functions."autonomous-shipment-stall-monitor"]');
    expect(config).toContain('schedule = "43 * * * *"');
  });

  it('keeps the stall monitor side-effect free until verified sinks exist', () => {
    const monitor = repo('netlify/functions/autonomous-shipment-stall-monitor.ts');
    expect(monitor).toContain('thresholdHours: 48');
    expect(monitor).toContain('externalMutationPerformed: false');
    expect(monitor).not.toContain('sgMail.send');
    expect(monitor).not.toContain("fetch('");
  });
});
