import { afterEach, describe, expect, it } from 'vitest';
import { resolveSupplierAcquisitionConfig } from '../_shared/supplierAcquisitionConfig';
import { acquireSupplierPayload } from '../_shared/supplierRemoteAcquisition';

const ENV_NAME = 'SUPPLIER_ACQUISITION_TEST_V1';

afterEach(() => {
  delete process.env[ENV_NAME];
});

describe('supplier acquisition server config', () => {
  it('resolves a bound HTTP config from env without returning secret material separately', () => {
    process.env[ENV_NAME] = JSON.stringify({
      kind: 'http',
      supplierKey: 'acme-uk',
      transport: 'feed_url',
      sourceFormat: 'csv',
      url: 'https://feeds.example.com/catalog.csv',
      allowedHosts: ['feeds.example.com'],
      headers: { authorization: 'Bearer hidden-value' },
      timeoutMs: 5000,
      maxBytes: 100000,
    });
    const result = resolveSupplierAcquisitionConfig('env:' + ENV_NAME);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.envName).toBe(ENV_NAME);
    expect(result.config).toMatchObject({
      kind: 'http',
      supplierKey: 'acme-uk',
      transport: 'feed_url',
      sourceFormat: 'csv',
    });
  });

  it('rejects invalid config references and HTTP hosts outside the allowlist', () => {
    expect(resolveSupplierAcquisitionConfig('supplier-config/test')).toMatchObject({
      ok: false,
      code: 'CONFIG_REF_INVALID',
    });
    process.env[ENV_NAME] = JSON.stringify({
      kind: 'http',
      supplierKey: 'acme-uk',
      transport: 'feed_url',
      sourceFormat: 'json',
      url: 'https://other.example.com/catalog.json',
      allowedHosts: ['feeds.example.com'],
    });
    expect(resolveSupplierAcquisitionConfig('env:' + ENV_NAME)).toMatchObject({
      ok: false,
      code: 'CONFIG_INVALID',
    });
  });

  it('requires SFTP host-key verification and exactly one authentication method', () => {
    process.env[ENV_NAME] = JSON.stringify({
      kind: 'sftp',
      supplierKey: 'acme-uk',
      transport: 'sftp',
      sourceFormat: 'csv',
      host: 'sftp.example.com',
      username: 'supplier',
      password: 'hidden',
      remotePath: '/feeds/catalog.csv',
    });
    expect(resolveSupplierAcquisitionConfig('env:' + ENV_NAME)).toMatchObject({
      ok: false,
      code: 'CONFIG_INVALID',
    });
  });

  it('blocks loopback/private HTTP resolution before any supplier request', async () => {
    const result = await acquireSupplierPayload({
      kind: 'http',
      supplierKey: 'acme-uk',
      transport: 'feed_url',
      sourceFormat: 'json',
      url: 'https://localhost/catalog.json',
      allowedHosts: ['localhost'],
      timeoutMs: 1000,
      maxBytes: 4096,
    });
    expect(result).toMatchObject({
      ok: false,
      code: 'HTTP_DNS_BLOCKED',
    });
  });
});
