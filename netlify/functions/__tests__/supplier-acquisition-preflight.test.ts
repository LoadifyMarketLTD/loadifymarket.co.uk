import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const endpoint = readFileSync(
  resolve(process.cwd(), 'netlify/functions/admin-supplier-acquisition-preflight.ts'),
  'utf8',
);

describe('supplier acquisition preflight boundary', () => {
  it('is admin-only and performs no external access', () => {
    expect(endpoint).toContain("authenticateActiveAccount(event, admin, ['admin'])");
    expect(endpoint).toContain('resolveSupplierAcquisitionConfig');
    expect(endpoint).not.toContain('acquireSupplierPayload');
    expect(endpoint).not.toContain('fetch(');
    expect(endpoint).not.toContain('httpsRequest');
    expect(endpoint).not.toContain('SftpClient');
  });

  it('returns only safe provisioning and binding metadata', () => {
    expect(endpoint).toContain('secretMaterialReturned: false');
    expect(endpoint).toContain('externalAccessPerformed: false');
    expect(endpoint).toContain('supplierKeyMatches');
    expect(endpoint).toContain('transportMatches');
    expect(endpoint).toContain('sourceFormatMatches');
    expect(endpoint).not.toContain('privateKey: config.privateKey');
    expect(endpoint).not.toContain('password: config.password');
    expect(endpoint).not.toContain('headers: config.headers');
  });
});
