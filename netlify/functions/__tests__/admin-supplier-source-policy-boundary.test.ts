import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const endpoint = readFileSync(
  resolve(process.cwd(), 'netlify/functions/admin-supplier-source-policy.ts'),
  'utf8',
);

describe('admin supplier source policy boundary', () => {
  it('is admin-only and read-only', () => {
    expect(endpoint).toContain("authenticateActiveAccount(event, admin, ['admin'])");
    expect(endpoint).toContain("const METHODS = 'GET, OPTIONS'");
    expect(endpoint).not.toContain('.insert(');
    expect(endpoint).not.toContain('.update(');
    expect(endpoint).not.toContain('.delete(');
  });

  it('exposes provider-neutral and no-warehouse guarantees', () => {
    expect(endpoint).toContain('providerNeutral: true');
    expect(endpoint).toContain('noWarehouseAssumption: true');
    expect(endpoint).toContain('discoveryCannotPublishDirectly: true');
    expect(endpoint).toContain('supplierAuthorityRequiredBeforeCommerce: true');
  });
});
