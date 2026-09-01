import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repo = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('customer operations runtime boundary', () => {
  it('keeps the exception queue admin-only and read-only', () => {
    const endpoint = repo('netlify/functions/admin-customer-operations-exceptions.ts');
    expect(endpoint).toContain("authenticateActiveAccount(event, admin, ['admin'])");
    expect(endpoint).toContain("const METHODS = 'GET, OPTIONS'");
    expect(endpoint).not.toContain('.insert(');
    expect(endpoint).not.toContain('.update(');
    expect(endpoint).not.toContain('.delete(');
    expect(endpoint).toContain('externalNotificationPerformed: false');
    expect(endpoint).toContain('carrierCaseCreationPerformed: false');
    expect(endpoint).toContain('paymentMutationPerformed: false');
  });

  it('does not claim a certified outbound notification channel', () => {
    const endpoint = repo('netlify/functions/admin-customer-operations-exceptions.ts');
    expect(endpoint).toContain('channels: {}');
    expect(endpoint).toContain('No transactional notification channel is certified by this lane');
  });

  it('deploys the admin exception queue through the configured modern function directory', () => {
    const wrapper = repo('netlify/functions-modern/admin-customer-operations-exceptions.ts');
    expect(wrapper).toContain("../functions/admin-customer-operations-exceptions");
    expect(wrapper).toContain('withLambda(handler)');
  });
});
