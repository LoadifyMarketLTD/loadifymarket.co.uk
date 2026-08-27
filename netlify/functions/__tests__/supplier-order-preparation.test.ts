import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repo = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const canonical = repo('supabase/682_supplier_order_preparation_and_release.sql');
const deploy = repo('supabase/migrations/20260827133000_supplier_order_preparation_and_release.sql');
const runtime = repo('netlify/functions/_shared/supplierOrderPreparation.ts');

for (const sql of [canonical, deploy]) {
  describe(`Supplier Commerce Stage 5B pre-payment preparation — ${sql === canonical ? 'canonical' : 'deploy'}`, () => {
    it('removes only the retired offers-engine global listing lock', () => {
      expect(sql).toContain('DROP INDEX IF EXISTS public.one_active_order_per_listing');
      expect(sql).not.toContain('DROP TABLE public.orders');
      expect(sql).not.toContain('DROP TABLE public.order_items');
    });

    it('creates one durable checkout preparation attached to the canonical order', () => {
      expect(sql).toContain('private.supplier_checkout_preparations');
      expect(sql).toContain('order_id uuid NOT NULL UNIQUE REFERENCES public.orders');
      expect(sql).toContain('reservation_id uuid NOT NULL UNIQUE REFERENCES private.supplier_stock_reservations');
      expect(sql).toContain('payment_snapshot jsonb NOT NULL');
      expect(sql).toContain('supplier checkout preparation identity/evidence is immutable');
    });

    it('captures exact immutable supplier shipping evidence on the order item', () => {
      expect(sql).toContain('supplierShippingDecisionIdSnapshot');
      expect(sql).toContain('supplierShippingServiceRefSnapshot');
      expect(sql).toContain('supplierShippingCostMinorSnapshot');
      expect(sql).toContain('customerShippingChargeSnapshot');
      expect(sql).toContain('order item supplier shipping snapshot is immutable once captured');
    });

    it('requires an awaiting-payment supplier order and rechecks current checkout truth before reservation', () => {
      expect(sql).toContain("v_order.status<>'awaiting_payment'");
      expect(sql).toContain("v_order.\"commercialModeSnapshot\" IS DISTINCT FROM 'loadify_supplier_fulfilled'");
      expect(sql).toContain('public.server_supplier_listing_checkout_decision_v1');
      expect(sql).toContain('supplier_checkout_recheck_failed');
    });

    it('closes controlled-pilot reservation scope with supplier, offer, product and territory', () => {
      expect(sql).toContain("'supplierRef',v_offer.supplier_id::text");
      expect(sql).toContain("'offerRef',v_offer.id::text");
      expect(sql).toContain("'productRef',v_offer.canonical_product_id::text");
      expect(sql).toContain("'territory',v_offer.territory");
      expect(sql).toContain("server_supplier_commerce_control_decision_v1('reservation'");
    });

    it('serialises checkout idempotency and creates order plus reservation in one SQL transaction', () => {
      expect(sql).toContain('pg_advisory_xact_lock');
      expect(sql).toContain('supplier checkout preparation idempotency collision');
      expect(sql).toContain('INSERT INTO public.orders');
      expect(sql).toContain('INSERT INTO public.order_items');
      expect(sql).toContain('server_reserve_supplier_checkout_v2');
      expect(sql).toContain("state='ready_for_payment'");
    });

    it('uses Loadify as legal seller/MoR for supplier-fulfilled buyer truth without a fake marketplace seller', () => {
      expect(sql).toContain("'xdrive-logistics-ltd:13171804'");
      expect(sql).toContain("'XDrive Logistics Ltd trading as Loadify Market'");
      expect(sql).toContain("'loadify_supplier_fulfilled'");
      expect(sql).toContain("'returnResponsibility','loadify'");
      expect(sql).toContain('VALUES(v_buyer.id,NULL,v_product.id');
    });

    it('builds the exact payment snapshot required by Stage 4B before Stripe may be called', () => {
      expect(sql).toContain("'commercialSnapshotVersion',2");
      expect(sql).toContain("'reservationId',v_reservation->>'reservationId'");
      expect(sql).toContain("'shippingDecisionId',v_shipping.id");
      expect(sql).toContain('private.payment_session_has_supplier_snapshot_v2(v_payment_snapshot)');
      expect(sql).toContain('server_supplier_payment_preparation_decision_v1');
    });

    it('releases only pre-payment state and refuses paid, consumed or active-payment state', () => {
      expect(sql).toContain('paid_supplier_checkout_requires_post_payment_cancellation');
      expect(sql).toContain('active_payment_session_must_be_cancelled_first');
      expect(sql).toContain('consumed_reservation_requires_post_payment_cancellation');
      expect(sql).toContain("status='cancelled'");
      expect(sql).toContain("status='released'");
    });

    it('does not enable Supplier Commerce or perform Stripe/provider calls', () => {
      expect(sql).not.toContain('SET enabled=true');
      expect(sql).not.toContain('stripe.checkout');
      expect(sql).not.toContain('stripe.paymentIntents');
      expect(sql).not.toContain('adapter.submitOrder');
      expect(sql).not.toContain('adapter.cancelOrder');
    });
  });
}

describe('Supplier Commerce Stage 5B server helper', () => {
  it('uses only canonical preparation/payment/release RPC boundaries', () => {
    expect(runtime).toContain('server_prepare_supplier_checkout_order_v1');
    expect(runtime).toContain('server_supplier_payment_preparation_decision_v1');
    expect(runtime).toContain('server_release_supplier_checkout_preparation_v1');
  });

  it('fails closed on invalid/unavailable preparation evidence', () => {
    expect(runtime).toContain('supplier_checkout_preparation_unavailable');
    expect(runtime).toContain('supplier_payment_preparation_unavailable');
    expect(runtime).toContain('supplier_checkout_release_unavailable');
  });
});
