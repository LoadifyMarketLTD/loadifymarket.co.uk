import { describe, expect, it, vi } from 'vitest';
import type Stripe from 'stripe';
import { transferIdsIncludedInPayout } from '../stripe-webhook';

describe('Stripe connected-account payout reconciliation', () => {
  it('returns only transfer sources included in the connected-account payout', async () => {
    const rows = [
      { source: 'tr_order_one' },
      { source: { id: 'tr_order_two' } },
      { source: 'py_bank_payout' },
      { source: null },
      { source: 'tr_order_one' },
    ];
    const list = vi.fn(() => ({
      async *[Symbol.asyncIterator]() {
        for (const row of rows) yield row;
      },
    }));
    const stripe = { balanceTransactions: { list } } as unknown as Stripe;

    await expect(
      transferIdsIncludedInPayout(stripe, 'po_test_123', 'acct_seller_123'),
    ).resolves.toEqual(['tr_order_one', 'tr_order_two']);
    expect(list).toHaveBeenCalledWith(
      { payout: 'po_test_123', limit: 100 },
      { stripeAccount: 'acct_seller_123' },
    );
  });
});
