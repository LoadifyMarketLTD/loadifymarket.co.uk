import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('admin cancellation review contract', () => {
  it('returns open requests with orders and supports audited rejection without overwriting buyer details', () => {
    const source = read('netlify/functions/admin-orders.ts');
    expect(source).toContain(".from('order_cancellation_requests')");
    expect(source).toContain("op === 'reject_cancellation_request'");
    expect(source).toContain(".eq('status', 'requested')");
    expect(source).toContain(".from('audit_logs')");
    expect(source).toContain("action: 'reject_order_cancellation_request'");
    expect(source).not.toContain("status: 'rejected', details: reason");
    expect(source).toContain("title: 'Cancellation request declined'");
  });

  it('presents approval through the canonical Stripe refund action', () => {
    const source = read('src/pages/pixel-perfect/admin/AdminOrders.tsx');
    expect(source).toContain('Approve & issue Stripe refund');
    expect(source).toContain('reject_cancellation_request');
  });
});
