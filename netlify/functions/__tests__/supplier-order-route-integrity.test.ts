import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repo = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const mixedLeg = repo('supabase/638_supplier_order_mixed_leg_and_release_closure.sql');
const integrity = repo('supabase/639_supplier_order_route_integrity_closure.sql');

describe('Phase I fulfilment route integrity closure', () => {
  it('supports marketplace-seller and Loadify-direct legs while supplier legs remain reservation-driven', () => {
    expect(mixedLeg).toContain('server_plan_order_fulfilment_leg_v1');
    expect(integrity).toContain("v_fulfiller NOT IN ('marketplace_seller','loadify_direct')");
    expect(integrity).toContain("'supplier_leg_requires_supplier_reservation_rpc'");
  });

  it('keeps route identities mutually exclusive', () => {
    expect(integrity).toContain("fulfiller_type='supplier' AND supplier_offer_id IS NOT NULL AND seller_id IS NULL");
    expect(integrity).toContain("fulfiller_type='loadify_direct' AND supplier_offer_id IS NULL AND seller_id IS NULL");
    expect(integrity).toContain("fulfiller_type='marketplace_seller' AND supplier_offer_id IS NULL AND seller_id IS NOT NULL");
  });

  it('binds marketplace seller legs to the product seller and rejects seller identity on Loadify Direct', () => {
    expect(integrity).toContain("v_product.\"sellerId\"<>p_seller_id");
    expect(integrity).toContain("'marketplace_seller_identity_mismatch'");
    expect(integrity).toContain("'loadify_direct_does_not_accept_marketplace_seller_identity'");
  });

  it('requires supplier leg items to use the exact leg supplier offer and canonical product', () => {
    expect(integrity).toContain('NEW.supplier_offer_id<>v_leg.supplier_offer_id');
    expect(integrity).toContain('supplier fulfilment item must use the leg supplier offer and canonical product');
    expect(integrity).toContain('fulfilment item canonical product must match supplier offer');
  });

  it('prevents supplier-offer identity from leaking into non-supplier legs', () => {
    expect(integrity).toContain('non-supplier fulfilment item cannot carry supplier offer identity');
  });

  it('uses checkout control without mislabelling marketplace seller identity as supplierRef', () => {
    const plannerStart = integrity.indexOf('CREATE OR REPLACE FUNCTION public.server_plan_order_fulfilment_leg_v1');
    const planner = integrity.slice(plannerStart);
    expect(planner).toContain("server_supplier_commerce_control_decision_v1('checkout'");
    expect(planner).not.toContain("'supplierRef'");
  });

  it('keeps supplier submission and acknowledgement deferred to Phase J', () => {
    expect(mixedLeg).not.toContain('submitOrder');
    expect(integrity).not.toContain('submitOrder');
    expect(integrity).not.toContain('external supplier order ID');
    expect(integrity).not.toContain('supplier acknowledgement');
  });
});
