import { describe, expect, it } from 'vitest';
import { deriveSellerListingLocks } from '../listingLocks';

describe('deriveSellerListingLocks', () => {
  it('classifies active awaiting_payment orders as temporary reservations', () => {
    const locks = deriveSellerListingLocks({
      orders: [
        {
          id: 'order-1',
          orderNumber: 'LM-1000001',
          status: 'awaiting_payment',
          createdAt: '2026-05-17T20:00:00.000Z',
        },
      ],
      product: {
        listingStatus: 'reserved',
        reservedUntil: '2026-05-17T20:20:00.000Z',
      },
      now: new Date('2026-05-17T20:05:00.000Z'),
    });

    expect(locks).toHaveLength(1);
    expect(locks[0]).toMatchObject({
      orderLabel: 'LM-1000001',
      type: 'temporary_reservation',
      typeLabel: 'Temporary reservation',
    });
  });

  it('ignores expired awaiting_payment locks', () => {
    const locks = deriveSellerListingLocks({
      orders: [
        {
          id: 'order-1',
          orderNumber: 'LM-1000001',
          status: 'awaiting_payment',
          createdAt: '2026-05-17T19:00:00.000Z',
        },
      ],
      product: {
        listingStatus: 'active',
        reservedUntil: '2026-05-17T19:10:00.000Z',
      },
      now: new Date('2026-05-17T20:05:00.000Z'),
    });

    expect(locks).toHaveLength(0);
  });

  it('classifies paid/in-progress and delivered history locks distinctly', () => {
    const locks = deriveSellerListingLocks({
      orders: [
        {
          id: 'order-1',
          orderNumber: 'LM-1000001',
          status: 'packed',
        },
        {
          id: 'order-2',
          orderNumber: 'LM-1000002',
          status: 'delivered',
        },
      ],
      product: {
        listingStatus: 'sold',
        reservedUntil: null,
      },
      now: new Date('2026-05-17T20:05:00.000Z'),
    });

    expect(locks).toHaveLength(2);
    expect(locks[0].type).toBe('active_paid_flow');
    expect(locks[1].type).toBe('fulfilled_history');
  });
});
