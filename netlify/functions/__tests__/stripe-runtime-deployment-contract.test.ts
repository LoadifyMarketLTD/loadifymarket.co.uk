import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('Stripe runtime deployment contract', () => {
  it('keeps payment-session-cleanup deployed through the active modern wrapper', () => {
    const wrapper = read('netlify/functions-modern/payment-session-cleanup.ts');

    expect(wrapper).toContain("import { handler } from '../functions/payment-session-cleanup'");
    expect(wrapper).toContain("import { withLambda } from '../function-runtime/lambdaCompat'");
    expect(wrapper).toContain('export default withLambda(handler)');
  });

  it('schedules the canonical payment reconciliation loop every five minutes', () => {
    const netlify = read('netlify.toml');
    const cleanup = read('netlify/functions/payment-session-cleanup.ts');

    expect(cleanup).toContain("schedule('*/5 * * * *'");
    expect(netlify).toContain('[functions."payment-session-cleanup"]');
    expect(netlify).toContain('schedule = "*/5 * * * *"');
  });

  it('keeps webhook verification dual-secret and fail closed', () => {
    const webhook = read('netlify/functions/stripe-webhook.ts');

    expect(webhook).toContain('process.env.STRIPE_WEBHOOK_SECRET?.trim()');
    expect(webhook).toContain('process.env.STRIPE_CONNECT_WEBHOOK_SECRET?.trim()');
    expect(webhook).toContain("return { statusCode: 400, body: JSON.stringify({ error: 'Webhook signature verification failed' }) }");
  });

  it('has handlers for the standard and Connect event families used by Loadify', () => {
    const webhook = read('netlify/functions/stripe-webhook.ts');

    for (const eventType of [
      'checkout.session.completed',
      'checkout.session.expired',
      'payment_intent.succeeded',
      'payment_intent.payment_failed',
      'payment_intent.canceled',
      'charge.refunded',
      'charge.dispute.created',
      'transfer.created',
      'account.updated',
      'payout.paid',
    ]) {
      expect(webhook).toContain(`case '${eventType}':`);
    }
  });
});
