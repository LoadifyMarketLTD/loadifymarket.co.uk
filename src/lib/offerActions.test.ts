import { describe, expect, it } from 'vitest';
import { getOfferActionAvailability } from './offerActions';

describe('getOfferActionAvailability', () => {
  it('allows the offer recipient to accept, reject, and counter a pending offer', () => {
    expect(getOfferActionAvailability({
      status: 'pending',
      currentUserId: 'buyer-1',
      proposedById: 'seller-1',
      recipientId: 'buyer-1',
    })).toEqual({
      canAccept: true,
      canReject: true,
      canCounter: true,
      canCancel: false,
    });
  });

  it('allows the sender to cancel their own pending offer', () => {
    expect(getOfferActionAvailability({
      status: 'pending',
      currentUserId: 'buyer-1',
      proposedById: 'buyer-1',
      recipientId: 'seller-1',
    })).toEqual({
      canAccept: false,
      canReject: false,
      canCounter: false,
      canCancel: true,
    });
  });

  it('hides all actions once the offer is no longer pending', () => {
    expect(getOfferActionAvailability({
      status: 'accepted',
      currentUserId: 'buyer-1',
      proposedById: 'buyer-1',
      recipientId: 'seller-1',
    })).toEqual({
      canAccept: false,
      canReject: false,
      canCounter: false,
      canCancel: false,
    });
  });
});
