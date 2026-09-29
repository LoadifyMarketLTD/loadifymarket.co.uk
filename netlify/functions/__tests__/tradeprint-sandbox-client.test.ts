import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { executeSupplierRuntimeHttp } = vi.hoisted(() => ({
  executeSupplierRuntimeHttp: vi.fn(),
}));

vi.mock('../_shared/supplierRuntimeHttp', () => ({
  executeSupplierRuntimeHttp,
}));

import {
  fetchTradeprintSandboxExpectedDelivery,
  fetchTradeprintSandboxPriceList,
  fetchTradeprintSandboxProductAttributes,
  fetchTradeprintSandboxQuantities,
  tradeprintSandboxBaseUrl,
  tradeprintSandboxCredentialsFromEnv,
} from '../_shared/tradeprintSandboxClient';

const CREDS = {
  username: 'sandbox-user',
  password: 'sandbox-password-123',
};

beforeEach(() => {
  executeSupplierRuntimeHttp.mockReset();
});

afterEach(() => {
  delete process.env.TRADEPRINT_SANDBOX_USERNAME;
  delete process.env.TRADEPRINT_SANDBOX_PASSWORD;
});
describe('Tradeprint sandbox client', () => {
  it('is hard-pinned to the sandbox environment', () => {
    expect(tradeprintSandboxBaseUrl()).toBe(
      'https://sandbox.orders.tradeprint.io/v2',
    );
  });

  it('fails closed when sandbox credentials are absent', () => {
    expect(tradeprintSandboxCredentialsFromEnv()).toBeNull();
  });

  it('loads credentials only from server environment', () => {
    process.env.TRADEPRINT_SANDBOX_USERNAME = CREDS.username;
    process.env.TRADEPRINT_SANDBOX_PASSWORD = CREDS.password;
    expect(tradeprintSandboxCredentialsFromEnv()).toEqual(CREDS);
  });

  it('logs in then performs read-only product discovery', async () => {
    executeSupplierRuntimeHttp
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: JSON.stringify({
          success: true,
          result: { token: 'sandbox-token-1234567890' },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: JSON.stringify({
          success: true,
          result: { Flyers: { attributes: ['Paper Type'] } },
        }),
      });
    const result = await fetchTradeprintSandboxProductAttributes(CREDS);

    expect(result).toEqual({
      ok: true,
      status: 200,
      data: { Flyers: { attributes: ['Paper Type'] } },
    });
    expect(executeSupplierRuntimeHttp).toHaveBeenCalledTimes(2);

    const login = executeSupplierRuntimeHttp.mock.calls[0][0];
    expect(login.url).toBe(
      'https://sandbox.orders.tradeprint.io/v2/login',
    );
    expect(login.method).toBe('POST');
    expect(login.body).toContain(CREDS.username);
    expect(login.body).toContain(CREDS.password);

    const discovery = executeSupplierRuntimeHttp.mock.calls[1][0];
    expect(discovery.url).toBe(
      'https://sandbox.orders.tradeprint.io/v2/products-v2/attributes-v2',
    );
    expect(discovery.method).toBe('GET');
    expect(discovery.headers.authorization).toBe(
      'Bearer sandbox-token-1234567890',
    );
  });

  it('fails closed on malformed login responses', async () => {
    executeSupplierRuntimeHttp.mockResolvedValueOnce({
      ok: true,
      status: 200,
      body: JSON.stringify({ success: true, result: {} }),
    });

    const result = await fetchTradeprintSandboxProductAttributes(CREDS);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errorClass).toBe('MALFORMED_RESPONSE');
    expect(executeSupplierRuntimeHttp).toHaveBeenCalledTimes(1);
  });
});

describe('Tradeprint sandbox product discovery extensions', () => {
  const mockSuccess = () => {
    executeSupplierRuntimeHttp
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: JSON.stringify({
          success: true,
          result: { token: 'sandbox-token-1234567890' },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: JSON.stringify({ success: true, result: { ok: true } }),
      });
  };

  it('builds a sandbox price-list request for one product', async () => {
    mockSuccess();
    await fetchTradeprintSandboxPriceList(CREDS, 'Flyers');
    const request = executeSupplierRuntimeHttp.mock.calls[1][0];
    expect(request.url).toBe(
      'https://sandbox.orders.tradeprint.io/v2/products-v2/Flyers',
    );
    expect(request.method).toBe('POST');
    expect(JSON.parse(request.body)).toEqual({ format: 'json', markup: 0 });
  });

  it('builds a sandbox quantities request', async () => {
    mockSuccess();
    await fetchTradeprintSandboxQuantities(CREDS, {
      productId: 'PRD-SRJ3LY4F',
      serviceLevel: 'Saver',
      productionData: { 'Sides Printed': 'Double Sided' },
    });
    const request = executeSupplierRuntimeHttp.mock.calls[1][0];
    expect(request.url).toBe(
      'https://sandbox.orders.tradeprint.io/v2/products-v2/quantities-v2',
    );
    expect(JSON.parse(request.body)).toMatchObject({
      productId: 'PRD-SRJ3LY4F',
      serviceLevel: 'Saver',
    });
  });

  it('builds a sandbox expected-delivery request', async () => {
    mockSuccess();
    await fetchTradeprintSandboxExpectedDelivery(CREDS, {
      productId: 'PRD-SRJ3LY4F',
      serviceLevel: 'Saver',
      artworkService: 'Just Print',
      productionData: { 'Paper Type': '100gsm Premium Smooth White Paper' },
      quantity: 500,
      postcode: 'DD2 1TP',
    });
    const request = executeSupplierRuntimeHttp.mock.calls[1][0];
    expect(request.url).toBe(
      'https://sandbox.orders.tradeprint.io/v2/products/expectedDeliveryDate',
    );
    expect(JSON.parse(request.body)).toMatchObject({
      quantity: 500,
      deliveryAddress: { postcode: 'DD2 1TP' },
    });
  });
});

import {
  TRADEPRINT_SANDBOX_CATALOG_FAMILIES,
  TRADEPRINT_SANDBOX_DISCOVERED_FAMILY_COUNT,
  TRADEPRINT_SANDBOX_DISCOVERED_VARIANT_ROW_COUNT,
} from '../_shared/tradeprintSandboxCatalog';

describe('Tradeprint sandbox verified catalogue manifest', () => {
  it('captures all currently exposed sandbox product families fail-closed', () => {
    expect(TRADEPRINT_SANDBOX_DISCOVERED_FAMILY_COUNT).toBe(17);
    expect(TRADEPRINT_SANDBOX_DISCOVERED_VARIANT_ROW_COUNT).toBe(206602);
    expect(TRADEPRINT_SANDBOX_CATALOG_FAMILIES.map((family) => family.productName)).toContain('Flyers');
    expect(TRADEPRINT_SANDBOX_CATALOG_FAMILIES.map((family) => family.productName)).toContain('Perfect Bound Booklets');
    expect(TRADEPRINT_SANDBOX_CATALOG_FAMILIES.every((family) => family.sandboxAvailable === true)).toBe(true);
    expect(TRADEPRINT_SANDBOX_CATALOG_FAMILIES.every((family) => family.publicationAllowed === false)).toBe(true);
  });
});
