import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const readRepo = (relativePath: string) =>
  readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');

const webCheckout = readRepo('netlify/functions/create-checkout.ts');
const mobileCheckout = readRepo('netlify/functions/create-payment-intent.ts');
const webhook = readRepo('netlify/functions/stripe-webhook.ts');
const migration = readRepo('supabase/610_snapshot_order_commercial_identity.sql');

describe('commercial snapshot cutover contract', () => {
  it.each([
    ['web checkout', webCheckout],
    ['mobile checkout', mobileCheckout],
  ])('%s persists the same versioned immutable evidence shape', (_name, source) => {
    expect(source).toContain('commercialSnapshotVersion: 1');
    expect(source).toContain('buyerSnapshot');
    expect(source).toContain('sellerSnapshot');
    expect(source).toContain('image:');
    expect(source).toContain('listingContext:');
    expect(source).toContain(".select('email, firstName, lastName')");
    expect(source).toContain('businessName');
    expect(source).toContain('isB2B: isB2BBuyer');
    expect(source).toContain('reverseCharge: applyReverseCharge');
    expect(source).toContain('shippingAmountPence');
    expect(source).toContain('totalPence');
  });

  it('webhook delegates the complete paid persistence unit to one canonical DB transaction', () => {
    expect(webhook).toContain("sb.rpc('server_materialize_paid_order_v1'");
    expect(webhook).toContain('p_payment_session_id: paymentSessionId');
    expect(webhook).toContain('p_payment_intent_id: paymentIntentId');
    expect(webhook).toContain('p_commission_rate: commissionRate');
    expect(webhook).toContain('firstPaidTransition');

    expect(webhook).not.toContain(".upsert(orderItems, { onConflict: 'orderId,productId'");
    expect(webhook).not.toContain("sb.rpc('finalize_paid_order_item'");
    expect(webhook).not.toContain(".update({ status: 'paid' })");
  });

  it('the DB RPC owns order + item snapshots + stock finalization + paid transition atomically', () => {
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.server_materialize_paid_order_v1');
    expect(migration).toContain('FROM public.payment_sessions ps');
    expect(migration).toContain('FOR UPDATE;');
    expect(migration).toContain('INSERT INTO public.orders');
    expect(migration).toContain('INSERT INTO public.order_items');
    expect(migration).toContain('PERFORM public.finalize_paid_order_item');
    expect(migration).toContain(`SET status = 'paid'`);
    expect(migration).toContain(`status = 'completed'`);
    expect(migration).toContain('v_persisted_item_count <> v_item_count');
    expect(migration).toContain('v_finalized_item_count <> v_item_count');
    expect(migration).toContain("GRANT EXECUTE ON FUNCTION public.server_materialize_paid_order_v1");
    expect(migration).toContain('TO service_role;');
  });

  it('keeps retry behavior idempotent and user-facing side effects first-transition-only', () => {
    expect(migration).toContain("v_order.status NOT IN ('awaiting_payment', 'paid')");
    expect(migration).toContain('ON CONFLICT ("orderId", "productId") DO NOTHING');
    expect(migration).toContain('v_first_paid_transition := false');
    expect(webhook).toContain('if (result.firstPaidTransition)');
    expect(webhook).toContain('if (!result.firstPaidTransition) return;');
  });

  it('keeps the database cutover fail-closed for incomplete or legacy evidence', () => {
    expect(migration).toContain('payment_session_has_commercial_snapshot_v1');
    expect(migration).toContain('WHEN others THEN');
    expect(migration).toContain('RETURN false;');
    expect(migration).toContain('IS DISTINCT FROM true');
    expect(migration).toContain('trg_require_payment_session_commercial_snapshot_v1');
    expect(migration).toContain('trg_require_paid_order_commercial_snapshot');
    expect(migration).toContain('trg_require_paid_order_item_product_snapshot');
    expect(migration).toContain(`NEW."commercialSnapshotSource" IS DISTINCT FROM 'checkout_verified'`);
    expect(migration).toContain(`NEW."productSnapshotSource" IS DISTINCT FROM 'checkout_verified'`);
  });
});