import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runAvasamBearerReadOnlyProbe } from './avasam-readonly-token-transport-probe.mjs';

const ORIGINAL_ENV = { ...process.env };

function response(status, payload) {
  return new Response(payload === null ? '' : JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('Avasam controlled read-only token transport probe', () => {
  beforeEach(() => {
    process.env.AVASAM_API_BASE_URL = 'https://app.avasam.com';
    process.env.AVASAM_CONSUMER_KEY = 'test-consumer-secret-value';
    process.env.AVASAM_SECRET_KEY = 'test-secret-secret-value';
    process.env.AVASAM_PROBE_SKU = 'S0671779793';
    process.env.AVASAM_PROBE_TRANSPORT = 'authorization-raw';
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    process.env = { ...ORIGINAL_ENV };
  });

  it('proves raw Authorization only when the unauthenticated control fails and the authenticated call returns the documented inventory envelope', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(200, {
        access_token: 'fake-access-token',
        expires_at: '2026-08-29T16:30:00.000Z',
      }))
      .mockResolvedValueOnce(response(401, { message: 'unauthorized' }))
      .mockResolvedValueOnce(response(200, {
        data: [{ SKU: 'S0671779793', Price: 10, Stock: 2 }],
        total: 1,
      }));
    vi.stubGlobal('fetch', fetchMock);

    const evidence = await runAvasamBearerReadOnlyProbe();

    expect(evidence).toEqual({
      endpoint: '/apiseeker/ProductModule/GetInventoryListWithFilter',
      transport: 'authorization-raw',
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);

    const tokenCall = fetchMock.mock.calls[0];
    expect(tokenCall[0]).toBe('https://app.avasam.com/api/auth/request-token');
    expect(JSON.parse(tokenCall[1].body)).toEqual({
      consumer_key: 'test-consumer-secret-value',
      secret_key: 'test-secret-secret-value',
    });

    const controlCall = fetchMock.mock.calls[1];
    const authenticatedCall = fetchMock.mock.calls[2];
    expect(controlCall[0]).toBe('https://app.avasam.com/apiseeker/ProductModule/GetInventoryListWithFilter');
    expect(controlCall[1].headers.Authorization).toBeUndefined();
    expect(JSON.parse(controlCall[1].body)).toMatchObject({
      Supplier: 'S0671779793',
      limit: 1,
      page: 0,
    });
    expect(authenticatedCall[1].headers.Authorization).toBe('fake-access-token');
    expect(authenticatedCall[1].headers.Authorization).not.toContain('Bearer ');

    const emitted = [
      ...console.log.mock.calls,
      ...console.error.mock.calls,
    ].map(args => args.join(' ')).join('\n');
    expect(emitted).not.toContain('fake-access-token');
    expect(emitted).not.toContain('test-consumer-secret-value');
    expect(emitted).not.toContain('test-secret-secret-value');
    expect(emitted).not.toContain('"Price"');
    expect(emitted).not.toContain('"Stock"');
  });

  it('fails closed when raw Authorization does not produce a valid read-only response', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(response(200, {
        access_token: 'fake-access-token',
        expires_at: '2026-08-29T16:30:00.000Z',
      }))
      .mockResolvedValueOnce(response(401, { message: 'unauthorized' }))
      .mockResolvedValueOnce(response(401, { message: 'unauthorized' })));

    await expect(runAvasamBearerReadOnlyProbe()).rejects.toThrow('authorization-raw transport was not proven');
  });

  it('fails closed if the supposedly unauthenticated control already returns a valid inventory envelope', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(response(200, {
        access_token: 'fake-access-token',
        expires_at: '2026-08-29T16:30:00.000Z',
      }))
      .mockResolvedValueOnce(response(200, { data: [], total: 0 }))
      .mockResolvedValueOnce(response(200, { data: [], total: 0 })));

    await expect(runAvasamBearerReadOnlyProbe()).rejects.toThrow('authorization-raw transport was not proven');
  });

  it('requires all secrets and the explicitly scoped probe SKU before any network access', async () => {
    delete process.env.AVASAM_SECRET_KEY;
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(runAvasamBearerReadOnlyProbe()).rejects.toThrow('Missing AVASAM_SECRET_KEY');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
