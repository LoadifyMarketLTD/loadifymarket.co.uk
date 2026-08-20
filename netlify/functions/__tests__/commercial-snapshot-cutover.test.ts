import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (relativePath: string) => readFileSync(new URL(relativePath, import.meta.url), 'utf8');

const webCheckout = read('../create-checkout.ts');
const mobileCheckout = read('../create-payment-intent.ts');
const webhook = read('../stripe-webhook.ts');
const invoice = read('../generate-invoice.ts');
const migration = read('../../../supabase/610_snapshot_order_commercial_identity.sql');
const taxMigration = read('../../../supabase/612_reconcile_marketplace_vat_contract.sql');

describe('commercial snapshot cutover contract', () => {
  it.each([
    ['web checkout', webCheckout],
    ['mobile checkout', mobileCheckout],
  ])('%s persists the same versioned immutable evidence shape', (_name, source) => {
    expect(source).toContain('commercialSnapshotVersion: 1');
    expect(source).toContain('taxSnapshotVersion: 1');
    expect(source).toContain("taxTreatment: 'seller_not_vat_registered'");
    expect(source).toContain('buyerSnapshot');
    expect(source).toContain('sellerSnapshot');
    expect(source).toContain('businessAddress: sellerBusinessAddress');
    expect(source).toContain('isVatRegistered: false');
    expect(source).toContain('image:');
    expect(source).toContain('listingContext:');
    expect(source).toContain(".select('email, firstName, lastName')");
    expect(source).toContain('businessName');
    expect(source).toContain('isB2B: isB2BBuyer');
    expect(source).toContain('reverseCharge: false');
    expect(source).toContain('shippingAmountPence');
    expect(source).toContain('totalPence');
  });

  it.each([
    ['web checkout', webCheckout],
    ['mobile checkout', mobileCheckout],
  ])('%s never derives price reduction/reverse charge from buyer VAT verification', (_name, source) => {
    expect(source).toContain('const applyReverseCharge = false;');
    expect(source).toContain('const chargeableSubtotalPence = catalogSubtotalPence;');
    expect(source).not.toContain('item.price / (1 + VAT_RATE)');
    expect(source).not.toContain('isB2BBuyer && Boolean(buyerProfile?.isVatVerified)');
  });

  it('webhook delegates the complete paid persistence unit to one canonical DB transaction', () => {
    expect(webhook).toContain("sb.rpc('server_materialize_paid_order_v1'");
    expect(webhook).toContain('p_payment_session_id: paymentSessionId');
    expect(webhook).toContain('p_payment_intent_id: paymentIntentId');
    expect(webhook).toContain('p_commission_rate: commissionRate');
    expect(webhook).toContain('firstPaidTransition');

    // The webhook must no longer coordinate the transactional persistence unit
    // through separate HTTP/database requests.
    expect(webhook).not.toContain(".upsert(orderItems, { onConflict: 'orderId,productId'");
    expect(webhook).not.toContain("sb.rpc('finalize_paid_order_item'");
    expect(webhook).not.toContain(".update({ status: 'paid' })");
  });

  it('the foundation RPC owns order + item snapshots + stock finalization + paid transition atomically', () => {
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.server_materialize_paid_order_v1');
    expect(migration).toContain('FROM public.payment_sessions ps');
    expect(migration).toContain('FOR UPDATE;');
    expect(migration).toContain('PERFORM public.finalize_paid_order_item');

    // 612 is the later CREATE OR REPLACE and therefore the effective contract.
    expect(taxMigration).toContain('CREATE OR REPLACE FUNCTION public.server_materialize_paid_order_v1');
    expect(taxMigration).toContain('INSERT INTO public.orders');
    expect(taxMigration).toContain('INSERT INTO public.order_items');
    expect(taxMigration).toContain('PERFORM public.finalize_paid_order_item');
    expect(taxMigration).toContain(`SET status = 'paid'`);
    expect(taxMigration).toContain(`status = 'completed'`);
    expect(taxMigration).toContain('v_persisted_item_count <> v_item_count');
    expect(taxMigration).toContain('v_finalized_item_count <> v_item_count');
    expect(taxMigration).toContain("GRANT EXECUTE ON FUNCTION public.server_materialize_paid_order_v1");
    expect(taxMigration).toContain('TO service_role;');
  });

  it('keeps retry behavior idempotent and user-facing side effects first-transition-only', () => {
    expect(taxMigration).toContain("v_order.status NOT IN ('awaiting_payment', 'paid')");
    expect(taxMigration).toContain('ON CONFLICT ("orderId", "productId") DO NOTHING');
    expect(taxMigration).toContain('v_first_paid_transition := false');
    expect(webhook).toContain('if (result.firstPaidTransition)');
    expect(webhook).toContain('if (!result.firstPaidTransition) return;');
  });

  it('keeps the database cutover fail-closed for incomplete or unsupported tax evidence', () => {
    expect(migration).toContain('payment_session_has_commercial_snapshot_v1');
    expect(migration).toContain('trg_require_payment_session_commercial_snapshot_v1');
    expect(taxMigration).toContain('trg_00_enrich_marketplace_payment_tax_snapshot');
    expect(taxMigration).toContain('generic marketplace VAT reverse charge is not an authorised tax route');
    expect(taxMigration).toContain('VAT-registered marketplace seller requires explicit verified tax treatment');
    expect(taxMigration).toContain("v_tax_treatment IS DISTINCT FROM 'seller_not_vat_registered'");
    expect(taxMigration).toContain('v_vat := 0;');
    expect(taxMigration).not.toContain('v_product_paid / 1.20');
  });

  it('protects the product price/tax contract at the database boundary', () => {
    expect(taxMigration).toContain('ALTER COLUMN "vatRate" SET DEFAULT 0');
    expect(taxMigration).toContain('trg_00_enforce_marketplace_product_tax_contract');
    expect(taxMigration).toContain('NEW."vatRate" := 0;');
    expect(taxMigration).toContain('NEW."priceExVat" := NEW.price;');
    expect(taxMigration).toContain('isVatRegistered" = false');
  });

  it('renders post-cutover marketplace invoices from seller tax snapshots, never Loadify VAT identity', () => {
    expect(invoice).toContain('sellerBusinessAddressSnapshot');
    expect(invoice).toContain('sellerVatRegisteredSnapshot');
    expect(invoice).toContain("taxTreatmentSnapshot === 'seller_not_vat_registered'");
    expect(invoice).toContain('VAT has not been charged on this order');
    expect(invoice).toContain('The sales contract is between the buyer and the seller');
    expect(invoice).not.toContain('process.env.VITE_VAT_NUMBER');
    expect(invoice).not.toContain('VAT (20%)');
    expect(invoice).not.toContain('VAT Reverse Charge:');
  });
});