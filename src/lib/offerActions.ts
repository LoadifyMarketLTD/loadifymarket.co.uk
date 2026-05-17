export interface OfferActionInput {
  status: string;
  currentUserId?: string;
  proposedById?: string;
  recipientId?: string;
}

export interface OfferActionAvailability {
  canAccept: boolean;
  canReject: boolean;
  canCounter: boolean;
  canCancel: boolean;
}

export function getOfferActionAvailability(input: OfferActionInput): OfferActionAvailability {
  const currentUserId = input.currentUserId?.trim();
  const isPending = input.status === 'pending';
  const isRecipient = Boolean(
    isPending &&
    currentUserId &&
    input.recipientId === currentUserId &&
    input.proposedById !== currentUserId,
  );
  const isSender = Boolean(
    isPending &&
    currentUserId &&
    input.proposedById === currentUserId,
  );

  return {
    canAccept: isRecipient,
    canReject: isRecipient,
    canCounter: isRecipient,
    canCancel: isSender,
  };
}
