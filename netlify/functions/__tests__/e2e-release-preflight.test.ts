import { spawnSync } from 'node:child_process';
import process from 'node:process';
import { describe, expect, it } from 'vitest';

const script = 'scripts/verify-e2e-release-env.mjs';

const validEnv: NodeJS.ProcessEnv = {
  ...process.env,
  E2E_BASE_URL: 'https://loadifymarket.co.uk',
  E2E_TARGET_SHA: 'aa56c9dd2e153a6e76721618175a1d9c134bf8b2',
  E2E_RELEASE_TARGET: 'production',
  E2E_ALLOW_PRODUCTION_READONLY: 'ALLOW_PRODUCTION_ROLE_E2E',
  E2E_BUYER_EMAIL: 'buyer-e2e@example.test',
  E2E_BUYER_PASSWORD: 'BuyerE2EPassword!2026',
  E2E_SELLER_EMAIL: 'seller-e2e@example.test',
  E2E_SELLER_PASSWORD: 'SellerE2EPassword!2026',
  E2E_ADMIN_EMAIL: 'admin-e2e@example.test',
  E2E_ADMIN_PASSWORD: 'AdminE2EPassword!2026',
  E2E_FOREIGN_ORDER_ID: '11111111-1111-4111-8111-111111111111',
};

function run(env: NodeJS.ProcessEnv) {
  return spawnSync(process.execPath, [script], {
    cwd: process.cwd(),
    env,
    encoding: 'utf8',
    shell: false,
  });
}

describe('credentialed E2E release preflight', () => {
  it('passes with a complete production release configuration without printing credentials', () => {
    const result = run(validEnv);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Credentialed E2E release preflight PASS');
    expect(result.stdout).toContain('target=production');
    expect(result.stdout).toContain('baseURL=https://loadifymarket.co.uk');
    expect(result.stdout).toContain('foreignOrderFixture=configured');
    expect(result.stdout).not.toContain(validEnv.E2E_BUYER_PASSWORD);
    expect(result.stdout).not.toContain(validEnv.E2E_SELLER_PASSWORD);
    expect(result.stdout).not.toContain(validEnv.E2E_ADMIN_PASSWORD);
  });

  it('fails when any credential is missing', () => {
    const env = { ...validEnv };
    delete env.E2E_SELLER_PASSWORD;
    const result = run(env);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('E2E_SELLER_PASSWORD is required');
  });

  it('fails closed on production without explicit readonly acknowledgement', () => {
    const env = { ...validEnv };
    delete env.E2E_ALLOW_PRODUCTION_READONLY;
    const result = run(env);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('E2E_ALLOW_PRODUCTION_READONLY=ALLOW_PRODUCTION_ROLE_E2E');
  });

  it('rejects duplicate role identities', () => {
    const env = { ...validEnv, E2E_ADMIN_EMAIL: validEnv.E2E_BUYER_EMAIL };
    const result = run(env);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Buyer, Seller, and Admin E2E accounts must be distinct');
  });

  it('rejects a non-UUID foreign-order fixture', () => {
    const env = { ...validEnv, E2E_FOREIGN_ORDER_ID: 'not-an-order-id' };
    const result = run(env);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('E2E_FOREIGN_ORDER_ID must be a valid UUID');
  });
});
