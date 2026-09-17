import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('order success checkout status contract', () => {
  it('uses the server-side checkout verifier and shows the order number', () => {
    const source = read('src/pages/OrderSuccessPage.tsx');
    expect(source).toContain('/.netlify/functions/checkout-status?session_id=');
    expect(source).toContain('Order number: {orderNumber}');
    expect(source).not.toContain("from('payment_sessions')");
    expect(source).not.toContain('sessionId.slice(');
  });

  it('publishes checkout-status through the modern Netlify runtime', () => {
    const wrapper = read('netlify/functions-modern/checkout-status.ts');
    const handler = read('netlify/functions/checkout-status.ts');
    expect(wrapper).toContain("../functions/checkout-status");
    expect(handler).toContain(".eq('stripeSessionId', sessionId)");
    expect(handler).toContain('orderNumber');
  });
});
