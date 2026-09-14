import Stripe from 'stripe';

export interface StripeProcessingFeeEvidence {
  chargeId: string;
  balanceTransactionId: string;
  grossPence: number;
  processingFeePence: number;
  netPence: number;
  currency: string;
}

function objectId(value: string | { id: string } | null | undefined): string | null {
  return typeof value === 'string' ? value : value?.id ?? null;
}

/**
 * Resolve Stripe's immutable balance-transaction evidence for a successful charge.
 * Settlement must fail closed when the fee cannot be proven; estimating a fee can
 * either overcharge the seller or leave the platform paying the processor.
 */
export async function retrieveStripeProcessingFee(
  stripe: Stripe,
  chargeId: string,
): Promise<StripeProcessingFeeEvidence> {
  const charge = await stripe.charges.retrieve(chargeId, {
    expand: ['balance_transaction'],
  });
  const expanded = typeof charge.balance_transaction === 'object'
    ? charge.balance_transaction
    : null;
  const balanceTransactionId = objectId(charge.balance_transaction);
  if (!balanceTransactionId) {
    throw new Error(`Charge ${chargeId} has no Stripe balance transaction`);
  }

  const balanceTransaction = expanded
    ?? await stripe.balanceTransactions.retrieve(balanceTransactionId);
  if (balanceTransaction.currency.toLowerCase() !== charge.currency.toLowerCase()) {
    throw new Error(`Charge ${chargeId} balance-transaction currency mismatch`);
  }
  if (balanceTransaction.amount !== charge.amount) {
    throw new Error(`Charge ${chargeId} balance-transaction amount mismatch`);
  }
  if (!Number.isSafeInteger(balanceTransaction.fee) || balanceTransaction.fee < 0) {
    throw new Error(`Charge ${chargeId} has invalid Stripe processing-fee evidence`);
  }

  return {
    chargeId,
    balanceTransactionId,
    grossPence: balanceTransaction.amount,
    processingFeePence: balanceTransaction.fee,
    netPence: balanceTransaction.net,
    currency: balanceTransaction.currency.toLowerCase(),
  };
}

export function calculateSellerSettlementPence(input: {
  grossPence: number;
  commissionPence: number;
  processingFeePence: number;
  platformFeeVatPence?: number;
  connectFeePence?: number;
  adjustmentsPence?: number;
}): number {
  const values = [
    input.grossPence,
    input.commissionPence,
    input.processingFeePence,
    input.platformFeeVatPence ?? 0,
    input.connectFeePence ?? 0,
    input.adjustmentsPence ?? 0,
  ];
  if (!values.every((value) => Number.isSafeInteger(value) && value >= 0)) {
    throw new Error('Settlement contains an invalid monetary amount');
  }

  const result = input.grossPence
    - input.commissionPence
    - input.processingFeePence
    - (input.platformFeeVatPence ?? 0)
    - (input.connectFeePence ?? 0)
    - (input.adjustmentsPence ?? 0);
  if (!Number.isSafeInteger(result) || result <= 0) {
    throw new Error('Settlement deductions equal or exceed the seller gross amount');
  }
  return result;
}
