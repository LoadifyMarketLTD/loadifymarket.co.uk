import { afterEach, describe, expect, it } from 'vitest';
import { buildInkthreadableRequest, inkthreadableCredentialsFromEnv } from '../_shared/inkthreadableClient';

const CREDS = { appId: 'APP-123456', signingKey: 'test-signing-key-1234567890' };

afterEach(() => {
  delete process.env.INKTHREADABLE_APP_ID;
  delete process.env.INKTHREADABLE_SIGNING_KEY;
});

describe('Inkthreadable controlled API client', () => {
  it('fails closed when server credentials are absent', () => {
    expect(inkthreadableCredentialsFromEnv()).toBeNull();
  });

  it('loads credentials only from server environment', () => {
    process.env.INKTHREADABLE_APP_ID = CREDS.appId;
    process.env.INKTHREADABLE_SIGNING_KEY = CREDS.signingKey;
    expect(inkthreadableCredentialsFromEnv()).toEqual(CREDS);
  });

  it('signs POST bodies without exposing the signing key', () => {
    const built = buildInkthreadableRequest(CREDS, {
      method: 'POST',
      endpoint: '/api/orders.php',
      body: { reference: 'LOADIFY-TEST', items: [{ part_number: 'TEST-1', quantity: 1 }] },
    });
    expect(built).not.toBeNull();
    expect(built?.url).toContain('AppId=APP-123456');
    expect(built?.url).toMatch(/Signature=[a-f0-9]{40}/);
    expect(built?.url).not.toContain(CREDS.signingKey);
    expect(built?.body).not.toContain(CREDS.signingKey);
  });

  it('adds JSON format and signs read requests', () => {
    const built = buildInkthreadableRequest(CREDS, {
      method: 'GET',
      endpoint: '/api/order.php',
      query: { id: '123' },
    });
    expect(built).not.toBeNull();
    expect(built?.url).toContain('format=JSON');
    expect(built?.url).toContain('id=123');
    expect(built?.url).toMatch(/Signature=[a-f0-9]{40}/);
  });

  it('supports cancellation transport without a request body', () => {
    const built = buildInkthreadableRequest(CREDS, {
      method: 'DELETE',
      endpoint: '/api/orders.php',
      query: { id: '123' },
    });
    expect(built).not.toBeNull();
    expect(built?.body).toBeUndefined();
    expect(built?.url).toMatch(/Signature=[a-f0-9]{40}/);
  });
});
