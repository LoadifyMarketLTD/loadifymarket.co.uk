import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(process.cwd(), 'src/pages/OrderSuccessPage.tsx'), 'utf8');

describe('order success buyer reference contract', () => {
  it('shows the Loadify order number and does not expose Stripe checkout session refs in buyer UI', () => {
    expect(source).toContain('Order number: {orderNumber}');
    expect(source).not.toContain('sessionId.slice(');
    expect(source).not.toContain('Ref: {sessionId');
  });

  it('checks checkout status through the server boundary instead of reading payment_sessions directly', () => {
    expect(source).toContain('/.netlify/functions/checkout-status');
    expect(source).not.toContain("from('payment_sessions')");
  });
});
