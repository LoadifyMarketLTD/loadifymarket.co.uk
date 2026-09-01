import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repo = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('BigBuy sandbox verification runtime boundary', () => {
  it('deploys through the canonical modern Netlify wrapper', () => {
    const wrapper = repo('netlify/functions-modern/admin-bigbuy-sandbox-verification.ts');
    expect(wrapper).toContain("../functions/admin-bigbuy-sandbox-verification");
    expect(wrapper).toContain("../function-runtime/lambdaCompat");
    expect(wrapper).toContain('withLambda(handler)');
  });

  it('requires active admin authority and sandbox-only configuration', () => {
    const endpoint = repo('netlify/functions/admin-bigbuy-sandbox-verification.ts');
    expect(endpoint).toContain("authenticateActiveAccount(event, admin, ['admin'])");
    expect(endpoint).toContain("environment !== 'sandbox'");
    expect(endpoint).toContain("requiredEnv('BIGBUY_API_KEY')");
    expect(endpoint).toContain("BIGBUY_PROBE_PARENT_TAXONOMY");
    expect(endpoint).toContain("BIGBUY_PROBE_PRODUCT_ID");
    expect(endpoint).toContain("BIGBUY_PROBE_PRODUCT_SKU");
    expect(endpoint).toContain("BIGBUY_PROBE_VARIATION_ID");
    expect(endpoint).toContain("BIGBUY_PROBE_VARIATION_SKU");
  });

  it('does not accept arbitrary provider identifiers from the request body', () => {
    const endpoint = repo('netlify/functions/admin-bigbuy-sandbox-verification.ts');
    expect(endpoint).not.toContain('event.body');
    expect(endpoint).not.toContain('queryStringParameters');
    expect(endpoint).toContain('sandboxConfigFromEnvironment');
  });

  it('cannot activate BigBuy or perform provider/payment/order mutations', () => {
    const endpoint = repo('netlify/functions/admin-bigbuy-sandbox-verification.ts');
    expect(endpoint).not.toContain('createSupplierProviderAdapter');
    expect(endpoint).not.toContain('submitOrder');
    expect(endpoint).not.toContain('mutateSupplierImport');
    expect(endpoint).not.toContain('stripe.');
    expect(endpoint).toContain('capabilityPromotionPerformed: false');
    expect(endpoint).toContain('hostedActivationChanged: false');
    expect(endpoint).toContain('runtimeAdapterEnabled: false');
  });

  it('keeps the provider registry activation guard unchanged', () => {
    const registry = repo('netlify/functions/_shared/supplierProviderRegistry.ts');
    expect(registry).toContain("key: 'bigbuy'");
    expect(registry).toContain("codeState: 'scaffolded_unverified'");
    expect(registry).toContain('verifiedCapabilities: []');
    expect(registry).toContain("hostedActivation: 'off'");
    expect(registry).toContain("return new InactiveSupplierAdapterV1(key)");
  });
});
