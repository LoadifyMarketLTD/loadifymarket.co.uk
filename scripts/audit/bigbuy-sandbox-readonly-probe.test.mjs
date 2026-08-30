import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runBigBuySandboxReadOnlyProbe } from './bigbuy-sandbox-readonly-probe.mjs';

const ORIGINAL_ENV = { ...process.env };

function response(status, payload) {
  return new Response(payload === null ? '' : JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function seedControlledEnvironment() {
  process.env.BIGBUY_API_ENVIRONMENT = 'sandbox';
  process.env.BIGBUY_API_KEY = 'synthetic-fixture-credential';
  process.env.BIGBUY_PROBE_PARENT_TAXONOMY = '123';
  process.env.BIGBUY_PROBE_PRODUCT_ID = '111';
  process.env.BIGBUY_PROBE_PRODUCT_SKU = 'PRODUCT-111';
  process.env.BIGBUY_PROBE_VARIATION_ID = '222';
  process.env.BIGBUY_PROBE_VARIATION_SKU = 'VAR-222';
}

function successfulProbeFetchMock() {
  return vi.fn()
    .mockResolvedValueOnce(response(401, { message: 'unauthorized' }))
    .mockResolvedValueOnce(response(200, [{ id: 111, sku: 'PRODUCT-111', wholesalePrice: 9876.54, active: 1 }]))
    .mockResolvedValueOnce(response(200, [{ id: 222, sku: 'VAR-222', product: 111, wholesalePrice: 8765.43 }]))
    .mockResolvedValueOnce(response(200, [{ id: 111, sku: 'PRODUCT-111', stocks: [{ quantity: 4321, minHandlingDays: 0, maxHandlingDays: 1, warehouse: 1 }] }]))
    .mockResolvedValueOnce(response(200, [{ id: 222, sku: 'VAR-222', stocks: [{ quantity: 1234, minHandlingDays: 1, maxHandlingDays: 3, warehouse: 2 }] }]));
}

describe('BigBuy explicit sandbox read-only probe', () => {
  beforeEach(() => {
    seedControlledEnvironment();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    process.env = { ...ORIGINAL_ENV };
  });

  it('uses only fixed sandbox GET requests and returns sanitized evidence', async () => {
    const fetchMock = successfulProbeFetchMock();
    vi.stubGlobal('fetch', fetchMock);

    const evidence = await runBigBuySandboxReadOnlyProbe();

    expect(fetchMock).toHaveBeenCalledTimes(5);
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();
    for (const [url, init] of fetchMock.mock.calls.slice(1)) {
      expect(String(url)).toMatch(/^https:\/\/api\.sandbox\.bigbuy\.eu\/rest\/catalog\//);
      expect(String(url)).not.toContain('/order');
      expect(init.method).toBe('GET');
      expect(init.body).toBeUndefined();
      expect(init.headers.Authorization).toBe('Bearer synthetic-fixture-credential');
    }

    const serialized = JSON.stringify(evidence);
    expect(serialized).not.toContain('synthetic-fixture-credential');
    expect(serialized).not.toContain('PRODUCT-111');
    expect(serialized).not.toContain('VAR-222');
    expect(serialized).not.toContain('9876.54');
    expect(serialized).not.toContain('8765.43');
    expect(serialized).not.toContain('4321');
    expect(serialized).not.toContain('1234');
    expect(evidence.safety).toEqual({
      ordersCalled: false,
      piiProcessed: false,
      capabilityPromotionPerformed: false,
      fullProviderPayloadLogged: false,
    });
  });

  it('fails before network access when production is requested', async () => {
    process.env.BIGBUY_API_ENVIRONMENT = 'production';
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(runBigBuySandboxReadOnlyProbe()).rejects.toThrow('sandbox-only');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('requires explicit credential and controlled scope before network access', async () => {
    delete process.env.BIGBUY_API_KEY;
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(runBigBuySandboxReadOnlyProbe()).rejects.toThrow('Missing BIGBUY_API_KEY');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not accept a successful unauthenticated response as authentication proof', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(200, [])));
    await expect(runBigBuySandboxReadOnlyProbe()).rejects.toThrow('negative authentication control was not rejected with 401/403');
  });
});
