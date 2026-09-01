import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repo = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('shadow mode runtime boundary', () => {
  it('keeps shadow evaluation active-admin-only and persistence-free', () => {
    const endpoint = repo('netlify/functions/admin-shadow-mode-evaluation.ts');
    expect(endpoint).toContain("authenticateActiveAccount(event, admin, ['admin'])");
    expect(endpoint).toContain("const METHODS = 'POST, OPTIONS'");
    expect(endpoint).not.toContain('.insert(');
    expect(endpoint).not.toContain('.update(');
    expect(endpoint).not.toContain('.delete(');
    expect(endpoint).not.toContain('submitOrder(');
    expect(endpoint).not.toContain('cancelOrder(');
    expect(endpoint).not.toContain('requestReturn(');
    expect(endpoint).not.toContain('stripe.');
    expect(endpoint).not.toContain('@sendgrid/mail');
    expect(endpoint).toContain('persistencePerformed: false');
    expect(endpoint).toContain('providerMutationPerformed: false');
    expect(endpoint).toContain('customerNotificationPerformed: false');
    expect(endpoint).toContain('carrierCaseCreationPerformed: false');
    expect(endpoint).toContain('customerPiiDisclosurePerformed: false');
    expect(endpoint).toContain('paymentMutationPerformed: false');
    expect(endpoint).toContain('automaticRefundExecutionPerformed: false');
  });

  it('uses canonical shipment facts instead of accepting arbitrary system facts from the caller', () => {
    const endpoint = repo('netlify/functions/admin-shadow-mode-evaluation.ts');
    expect(endpoint).toContain(".from('shipments')");
    expect(endpoint).toContain(".from('shipment_events')");
    expect(endpoint).toContain('evaluateShipmentStall({');
    expect(endpoint).not.toContain('inputFacts?:');
  });

  it('deploys through the configured modern function directory', () => {
    const wrapper = repo('netlify/functions-modern/admin-shadow-mode-evaluation.ts');
    expect(wrapper).toContain("../functions/admin-shadow-mode-evaluation");
    expect(wrapper).toContain('withLambda(handler)');
  });
});
