import Stripe from 'stripe';

export interface OrderTransferLookup {
  orderId: string;
  transferGroup?: string | null;
  knownTransferId?: string | null;
  expectedAmountPence?: number | null;
  expectedDestination?: string | null;
}

/**
 * Resolve the one Stripe Transfer that belongs to a marketplace order.
 *
 * The database transfer ID is preferred. If a process crashed after Stripe
 * created the transfer but before the DB write committed, transfer_group lets us
 * recover the transfer from Stripe without sending money again.
 */
export async function findOrderTransfer(
  stripe: Stripe,
  lookup: OrderTransferLookup,
): Promise<Stripe.Transfer | null> {
  let transfer: Stripe.Transfer | null = null;

  if (lookup.knownTransferId) {
    transfer = await stripe.transfers.retrieve(lookup.knownTransferId);
  } else if (lookup.transferGroup) {
    const transfers = await stripe.transfers.list({
      transfer_group: lookup.transferGroup,
      limit: 100,
    });
    const matches = transfers.data.filter(
      (candidate) => candidate.metadata?.orderId === lookup.orderId,
    );

    if (matches.length > 1) {
      throw new Error(
        `Multiple Stripe transfers found for order ${lookup.orderId}; manual reconciliation required`,
      );
    }
    transfer = matches[0] ?? null;
  }

  if (!transfer) return null;

  if (transfer.currency.toLowerCase() !== 'gbp') {
    throw new Error(`Unexpected transfer currency for order ${lookup.orderId}`);
  }
  if (
    lookup.expectedAmountPence != null &&
    transfer.amount !== lookup.expectedAmountPence
  ) {
    throw new Error(`Stripe transfer amount mismatch for order ${lookup.orderId}`);
  }
  if (
    lookup.expectedDestination &&
    String(transfer.destination) !== lookup.expectedDestination
  ) {
    throw new Error(`Stripe transfer destination mismatch for order ${lookup.orderId}`);
  }

  return transfer;
}

export function isTransferFullyReversed(transfer: Stripe.Transfer): boolean {
  return transfer.reversed || transfer.amount_reversed >= transfer.amount;
}

/**
 * Use a caller-supplied deterministic idempotency key so refund, dispute and
 * escrow compensation paths converge on one reversal instead of racing to
 * reverse the same seller transfer twice.
 */
export async function reverseOrderTransfer(
  stripe: Stripe,
  transfer: Stripe.Transfer,
  idempotencyKey: string,
  metadata: Record<string, string>,
): Promise<Stripe.TransferReversal> {
  if (isTransferFullyReversed(transfer)) {
    const existing = transfer.reversals?.data?.[0];
    if (existing) return existing;

    const reversals = await stripe.transfers.listReversals(transfer.id, { limit: 1 });
    if (reversals.data[0]) return reversals.data[0];
    throw new Error(`Transfer ${transfer.id} is reversed but no reversal record was returned`);
  }

  return stripe.transfers.createReversal(
    transfer.id,
    { metadata },
    { idempotencyKey },
  );
}

export async function reconcilePaidOrderPayout(
  sb: import('@supabase/supabase-js').SupabaseClient,
  input: {
    sellerId: string;
    orderId: string;
    amount: number;
    transferId: string;
    note: string;
  },
): Promise<string> {
  const { data: existing, error: lookupError } = await sb
    .from('payouts')
    .select('id, stripeTransferId')
    .eq('orderId', input.orderId)
    .eq('stripeTransferId', input.transferId)
    .maybeSingle<{ id: string; stripeTransferId: string | null }>();
  if (lookupError) throw lookupError;

  if (existing) {
    const { error } = await sb
      .from('payouts')
      .update({
        amount: input.amount,
        currency: 'GBP',
        status: 'paid',
        paidAt: new Date().toISOString(),
        notes: input.note,
      })
      .eq('id', existing.id);
    if (error) throw error;
    return existing.id;
  }

  const { data: inserted, error: insertError } = await sb
    .from('payouts')
    .insert({
      sellerId: input.sellerId,
      orderId: input.orderId,
      amount: input.amount,
      currency: 'GBP',
      status: 'paid',
      stripeTransferId: input.transferId,
      paidAt: new Date().toISOString(),
      notes: input.note,
    })
    .select('id')
    .maybeSingle<{ id: string }>();

  if (!insertError && inserted) return inserted.id;
  if (insertError?.code !== '23505') {
    throw insertError ?? new Error(`Unable to record Stripe transfer for order ${input.orderId}`);
  }

  // Another invocation recorded the transfer between our lookup and insert.
  const { data: raced, error: racedError } = await sb
    .from('payouts')
    .select('id, stripeTransferId')
    .eq('orderId', input.orderId)
    .not('stripeTransferId', 'is', null)
    .limit(1)
    .maybeSingle<{ id: string; stripeTransferId: string }>();
  if (racedError || !raced) {
    throw racedError ?? new Error(`Payout reconciliation race for order ${input.orderId}`);
  }
  if (raced.stripeTransferId !== input.transferId) {
    throw new Error(`Conflicting Stripe transfers recorded for order ${input.orderId}`);
  }

  const { error: updateError } = await sb
    .from('payouts')
    .update({
      amount: input.amount,
      currency: 'GBP',
      status: 'paid',
      paidAt: new Date().toISOString(),
      notes: input.note,
    })
    .eq('id', raced.id);
  if (updateError) throw updateError;
  return raced.id;
}
