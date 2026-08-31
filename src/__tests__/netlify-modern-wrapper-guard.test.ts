import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const criticalHandlers = [
  'register',
  'register-intent',
  'register-social-intent',
  'start-seller-activation',
  'seller-onboarding-status',
  'set-seller-onboarding',
  'recheck-activation',
  'connect-onboard',
  'connect-status',
  'create-checkout',
  'create-payment-intent',
  'create-product',
  'update-product',
  'admin-user-status',
  'admin-sellers',
  'admin-orders',
] as const;

describe('Netlify modern function deployment guard', () => {
  it.each(criticalHandlers)('%s has a published functions-modern wrapper', (name) => {
    const modernPath = `netlify/functions-modern/${name}.ts`;
    const sourcePath = `netlify/functions/${name}.ts`;

    expect(existsSync(sourcePath), `${sourcePath} should exist`).toBe(true);
    expect(existsSync(modernPath), `${modernPath} should exist because netlify.toml publishes functions-modern`).toBe(true);

    const wrapper = readFileSync(modernPath, 'utf8');
    expect(wrapper).toContain(`../functions/${name}`);
    expect(wrapper).toContain('withLambda');
  });
});
