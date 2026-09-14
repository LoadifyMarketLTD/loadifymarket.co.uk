import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('full order refund reconciliation contract', () => {
  it('restores finalized stock exactly once and closes cancellation requests atomically', () => {
    const source = read('supabase/migrations/20260914143000_atomic_full_order_refund_reconciliation.sql');
    expect(source).toContain('"stockFinalizedAt" IS NOT NULL');
    expect(source).toContain('"stockRestoredAt" IS NULL');
    expect(source).toContain('SET "stockRestoredAt" = now()');
    expect(source).toContain("SET status = 'refunded', \"escrowStatus\" = 'refunded'");
    expect(source).toContain("status IN ('requested', 'approved')");
    expect(source).toContain('REVOKE ALL ON FUNCTION public.reconcile_full_order_refund(uuid) FROM PUBLIC, anon, authenticated');
  });

  it('uses the same reconciliation boundary for admin refunds and webhook retries', () => {
    expect(read('netlify/functions/create-refund.ts')).toContain('reconcileFullOrderRefund(supabase, orderId)');
    expect(read('netlify/functions/stripe-webhook.ts')).toContain('reconcileFullOrderRefund(supabase!, payment.orderId)');
  });

  it('does not finalize or reverse seller funds before Stripe confirms the refund', () => {
    const source = read('netlify/functions/create-refund.ts');
    expect(source).toContain("refund.status === 'failed' || refund.status === 'canceled'");
    expect(source).toContain("refund.status !== 'succeeded'");
    expect(source).toContain('statusCode: 202');
    expect(source.indexOf("refund.status !== 'succeeded'")).toBeLessThan(source.indexOf('let transferReversalId'));
  });

  it('reconciles an asynchronous Stripe refund only after a succeeded refund update', () => {
    const source = read('netlify/functions/stripe-webhook.ts');
    expect(source).toContain("case 'refund.updated':");
    expect(source).toContain("case 'refund.failed':");
    expect(source).toContain("if (refund.status !== 'succeeded') return;");
    expect(source).toContain('await handleRefund(charge);');
  });
});
