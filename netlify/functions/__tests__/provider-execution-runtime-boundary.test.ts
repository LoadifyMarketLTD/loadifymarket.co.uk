import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repo = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('provider execution runtime boundary', () => {
  it('keeps the provider execution contract surface admin-only and read-only', () => {
    const endpoint = repo('netlify/functions/admin-provider-execution-contracts.ts');
    expect(endpoint).toContain("authenticateActiveAccount(event, admin, ['admin'])");
    expect(endpoint).toContain("const METHODS = 'GET, OPTIONS'");
    expect(endpoint).not.toContain('.insert(');
    expect(endpoint).not.toContain('.update(');
    expect(endpoint).not.toContain('.delete(');
    expect(endpoint).not.toContain('submitOrder(');
    expect(endpoint).not.toContain('cancelOrder(');
    expect(endpoint).not.toContain('requestReturn(');
    expect(endpoint).toContain('providerWriteActivationPerformed: false');
    expect(endpoint).toContain('customerPiiDisclosurePerformed: false');
    expect(endpoint).toContain('financialMutationPerformed: false');
  });

  it('is deployed through the configured modern function directory', () => {
    const wrapper = repo('netlify/functions-modern/admin-provider-execution-contracts.ts');
    expect(wrapper).toContain("../functions/admin-provider-execution-contracts");
    expect(wrapper).toContain('withLambda(handler)');
  });

  it('keeps Avasam transactional evidence blockers explicit in the canonical policy', () => {
    const policy = repo('netlify/functions/_shared/avasamCommercialCapabilityPolicy.ts');
    expect(policy).toContain('canonical_order_create_endpoint_unconfirmed');
    expect(policy).toContain('stable_provider_order_identifier_missing');
    expect(policy).toContain('idempotency_contract_missing');
    expect(policy).toContain('lost_response_recovery_contract_missing');
    expect(policy).toContain('VERIFIED_MANUAL_ONLY');
  });
});
