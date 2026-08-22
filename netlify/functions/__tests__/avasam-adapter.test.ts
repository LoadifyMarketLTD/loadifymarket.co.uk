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

  it('prevents provider callers from overriding trusted authentication or correlation headers', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } }),
    );
    const client = new AvasamClient({ baseUrl: 'https://example.invalid', apiToken: 'trusted-token' });
    await client.request(
      { correlationId: 'trusted-correlation', idempotencyKey: 'trusted-idempotency' },
      '/health',
      { headers: { Authorization: 'Bearer attacker-token', 'X-Correlation-Id': 'attacker-correlation', 'Idempotency-Key': 'attacker-idempotency' } },
    );
    const [, init] = fetchMock.mock.calls[0];
    const headers = new Headers(init?.headers);
    expect(headers.get('Authorization')).toBe('Bearer trusted-token');
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

  it('rejects non-HTTPS provider base URLs before network access', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    const client = new AvasamClient({ baseUrl: 'http://example.invalid' });
    const result = await client.request({ correlationId: 'correlation-only' }, '/health');
    expect(result.ok).toBe(false);
    expect(result && !result.ok ? result.errorClass : null).toBe('AUTH_CONFIGURATION_FAILURE');
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockRestore();
  });
});
