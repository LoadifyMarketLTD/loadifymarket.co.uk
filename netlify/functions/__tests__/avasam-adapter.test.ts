import { describe, expect, it, vi } from 'vitest';
import { AvasamAdapterV1 } from '../_shared/avasamAdapter';
import { AvasamClient } from '../_shared/avasamClient';
import { assertSupplierAdapterV1 } from '../_shared/supplierAdapter';

describe('AvasamAdapterV1 foundation', () => {
  it('conforms to SupplierAdapterV1 and exposes no unverified capabilities', () => {
    const adapter = new AvasamAdapterV1();
    assertSupplierAdapterV1(adapter);
    expect(adapter.providerKey).toBe('avasam');
    expect(adapter.interfaceVersion).toBe(1);
    expect(adapter.capabilities).toEqual([]);
  });

  it('fails closed instead of inventing undocumented provider behavior', async () => {
    const adapter = new AvasamAdapterV1();
    const result = await adapter.getStock?.({
      correlationId: 'test-correlation',
      idempotencyKey: 'test-idempotency',
      supplierKey: 'test-supplier',
      territory: 'GB',
    }, ['variant-1']);
    expect(result?.ok).toBe(false);
    expect(result && !result.ok ? result.errorClass : null).toBe('CAPABILITY_UNAVAILABLE');
  });
});

describe('AvasamClient verified Seller API authentication', () => {
  it('requests a token using only the documented consumer and secret JSON fields', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({
        access_token: 'provider-access-token',
        expires_at: '2026-08-29T16:00:00.000Z',
      }), { status: 200, headers: { 'content-type': 'application/json' } }),
    );

    const client = new AvasamClient({
      baseUrl: 'https://app.avasam.com',
      consumerKey: 'consumer-key',
      secretKey: 'secret-key',
    });
    const result = await client.requestToken();

    expect(result).toEqual({
      ok: true,
      data: {
        access_token: 'provider-access-token',
        expires_at: '2026-08-29T16:00:00.000Z',
      },
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://app.avasam.com/api/auth/request-token');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toEqual({
      consumer_key: 'consumer-key',
      secret_key: 'secret-key',
    });
    const headers = new Headers(init?.headers);
    expect(headers.get('Content-Type')).toBe('application/json');
    expect(headers.get('Authorization')).toBeNull();
    expect(headers.get('X-Correlation-Id')).toBeNull();
    expect(headers.get('Idempotency-Key')).toBeNull();
    fetchMock.mockRestore();
  });

  it('fails closed before network access when Seller API credentials are missing', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    const client = new AvasamClient({ baseUrl: 'https://app.avasam.com' });
    const result = await client.requestToken();
    expect(result.ok).toBe(false);
    expect(result && !result.ok ? result.errorClass : null).toBe('AUTH_CONFIGURATION_FAILURE');
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockRestore();
  });

  it('rejects malformed successful token responses instead of accepting ambiguous auth state', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ access_token: '', expires_at: 'not-a-date' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const client = new AvasamClient({
      baseUrl: 'https://app.avasam.com',
      consumerKey: 'consumer-key',
      secretKey: 'secret-key',
    });
    const result = await client.requestToken();
    expect(result.ok).toBe(false);
    expect(result && !result.ok ? result.errorClass : null).toBe('MALFORMED_RESPONSE');
    fetchMock.mockRestore();
  });
});

describe('AvasamClient security boundary', () => {
  it('does not send an idempotency header unless explicitly supplied', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } }),
    );
    const client = new AvasamClient({ baseUrl: 'https://example.invalid' });
    await client.request({ correlationId: 'correlation-only' }, '/health');
    const [, init] = fetchMock.mock.calls[0];
    const headers = new Headers(init?.headers);
    expect(headers.get('X-Correlation-Id')).toBe('correlation-only');
    expect(headers.get('Idempotency-Key')).toBeNull();
    fetchMock.mockRestore();
  });

  it('prevents provider callers from injecting an unverified Authorization token transport', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    const client = new AvasamClient({ baseUrl: 'https://example.invalid' });
    const result = await client.request(
      { correlationId: 'trusted-correlation', idempotencyKey: 'trusted-idempotency' },
      '/health',
      { headers: { Authorization: 'Bearer guessed-token' } },
    );
    expect(result.ok).toBe(false);
    expect(result && !result.ok ? result.errorClass : null).toBe('AUTH_CONFIGURATION_FAILURE');
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockRestore();
  });

  it('prevents provider callers from injecting an unverified Authkey token transport', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    const client = new AvasamClient({ baseUrl: 'https://example.invalid' });
    const result = await client.request(
      { correlationId: 'trusted-correlation' },
      '/health',
      { headers: { Authkey: 'guessed-token' } },
    );
    expect(result.ok).toBe(false);
    expect(result && !result.ok ? result.errorClass : null).toBe('AUTH_CONFIGURATION_FAILURE');
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockRestore();
  });

  it('owns correlation and idempotency headers even when callers try to override them', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } }),
    );
    const client = new AvasamClient({ baseUrl: 'https://example.invalid' });
    await client.request(
      { correlationId: 'trusted-correlation', idempotencyKey: 'trusted-idempotency' },
      '/health',
      { headers: { 'X-Correlation-Id': 'caller-correlation', 'Idempotency-Key': 'caller-idempotency' } },
    );
    const [, init] = fetchMock.mock.calls[0];
    const headers = new Headers(init?.headers);
    expect(headers.get('X-Correlation-Id')).toBe('trusted-correlation');
    expect(headers.get('Idempotency-Key')).toBe('trusted-idempotency');
    fetchMock.mockRestore();
  });

  it('requires a correlation id before any provider request', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    const client = new AvasamClient({ baseUrl: 'https://example.invalid' });
    const result = await client.request({ correlationId: '' }, '/health');
    expect(result.ok).toBe(false);
    expect(result && !result.ok ? result.errorClass : null).toBe('AUTH_CONFIGURATION_FAILURE');
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockRestore();
  });

  it('rejects absolute endpoint paths so configuration cannot override the trusted API host', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    const client = new AvasamClient({ baseUrl: 'https://example.invalid' });
    const result = await client.request({ correlationId: 'correlation-only' }, 'https://attacker.invalid/steal');
    expect(result.ok).toBe(false);
    expect(result && !result.ok ? result.errorClass : null).toBe('AUTH_CONFIGURATION_FAILURE');
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockRestore();
  });

  it('rejects backslash-based URL escape paths before network access', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    const client = new AvasamClient({ baseUrl: 'https://example.invalid' });
    const result = await client.request({ correlationId: 'correlation-only' }, '/\\attacker.invalid/steal');
    expect(result.ok).toBe(false);
    expect(result && !result.ok ? result.errorClass : null).toBe('AUTH_CONFIGURATION_FAILURE');
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockRestore();
  });

  it('rejects non-HTTPS provider base URLs before network access', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    const client = new AvasamClient({ baseUrl: 'http://example.invalid' });
    const result = await client.request({ correlationId: 'correlation-only' }, '/health');
    expect(result.ok).toBe(false);
    expect(result && !result.ok ? result.errorClass : null).toBe('AUTH_CONFIGURATION_FAILURE');
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockRestore();
  });

  it('rejects embedded credentials in the provider base URL', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    const client = new AvasamClient({ baseUrl: 'https://user:password@example.invalid' });
    const result = await client.request({ correlationId: 'correlation-only' }, '/health');
    expect(result.ok).toBe(false);
    expect(result && !result.ok ? result.errorClass : null).toBe('AUTH_CONFIGURATION_FAILURE');
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockRestore();
  });
});
