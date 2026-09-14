import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const webhook = () => readFileSync(resolve(process.cwd(), 'netlify/functions/stripe-webhook.ts'), 'utf8');

describe('Stripe refund and dispute seller recovery', () => {
  it('does not mark a partial refund as a full refund or reverse the full transfer', () => {
    const source = webhook();
    expect(source).toContain('charge.amount_refunded >= charge.amount');
    expect(source).toContain("{ escrowStatus: 'partial_refund' }");
    expect(source).toContain('stripe && isFullRefund');
  });

  it('reverses a released seller transfer when Stripe creates a chargeback', () => {
    const source = webhook();
    expect(source).toContain('order-dispute-transfer:${dispute.id}');
    expect(source).toContain('Seller transfer reversed after Stripe chargeback');
    expect(source).toContain("status: 'cancelled'");
  });
});
