import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { executeSupplierRuntimeHttp } = vi.hoisted(() => ({
  executeSupplierRuntimeHttp: vi.fn(),
}));

vi.mock('../_shared/supplierRuntimeHttp', () => ({
  executeSupplierRuntimeHttp,
}));

import {
  fetchTradeprintSandboxProductAttributes,
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
