import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repo = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const canonical = repo('supabase/685_supplier_payment_handshake_shipping_closure.sql');
const deploy = repo('supabase/migrations/20260827141000_supplier_payment_handshake_shipping_closure.sql');
const paidHandoff = repo('supabase/686_supplier_paid_reservation_handoff.sql');
const paidHandoffDeploy = repo('supabase/migrations/20260827142000_supplier_paid_reservation_handoff.sql');
const runtime = repo('netlify/functions/_shared/supplierOrderHandshake.ts');

for (const sql of [canonical, deploy]) {
  describe(`Stage 6 shipping-bound supplier handshake — ${sql === canonical ? 'canonical' : 'deploy'}`, () => {
    it('binds immutable shipping identity to the supplier handshake', () => {
      expect(sql).toContain('shipping_decision_id uuid REFERENCES private.supplier_shipping_decisions');
      expect(sql).toContain('shipping_service_ref text');
      expect(sql).toContain('shipping_binding_fingerprint text');
      expect(sql).toContain('supplier order handshake shipping identity is immutable once bound');
    });

    it('requires the exact paid checkout preparation and shipping decision', () => {
      expect(sql).toContain("AND p.state='paid'");
      expect(sql).toContain('p.shipping_decision_id=v_order_item."supplierShippingDecisionIdSnapshot"');
      expect(sql).toContain('d.pricing_snapshot_id=v_res.pricing_snapshot_id');
      expect(sql).toContain('d.service_ref=v_order_item."supplierShippingServiceRefSnapshot"');
      expect(sql).toContain('d.supplier_shipping_cost_minor=v_order_item."supplierShippingCostMinorSnapshot"');
    });

    it('removes the old service-role prepare bypass and exposes only shipping-bound v2', () => {
      expect(sql).toContain('server_prepare_supplier_order_handshake_v2');
      expect(sql).toContain('REVOKE EXECUTE ON FUNCTION public.server_prepare_supplier_order_handshake_v1');
      expect(sql).toContain("'shippingServiceRef',v_handshake.shipping_service_ref");
    });
  });
}

describe('Stage 6 paid reservation handoff', () => {
  it('keeps canonical and deploy SQL identical', () => {
    expect(paidHandoffDeploy).toBe(paidHandoff);
  });

  it('requires a canonical paid preparation with an active unexpired reservation', () => {
    expect(paidHandoff).toContain("WHERE order_id=NEW.id AND state='prepared'");
    expect(paidHandoff).toContain("SET state='paid',paid_at=now()");
    expect(paidHandoff).toContain("SET status='reserved'");
    expect(paidHandoff).toContain("SET state='reserved'");
    expect(paidHandoff).toContain("r.status='active'");
    expect(paidHandoff).toContain('r.expires_at>now()');
  });
});

describe('Stage 6 provider-neutral submission runtime', () => {
  it('uses the v2 shipping-bound preparation and passes the selected service to the adapter', () => {
    expect(runtime).toContain('SUPPLIER_ORDER_HANDSHAKE_INTERFACE_VERSION = 2');
    expect(runtime).toContain('server_prepare_supplier_order_handshake_v2');
    expect(runtime).toContain("reason: 'supplier_order_handshake_shipping_ready'");
    expect(runtime).toContain('shippingServiceRef: string');
    expect(runtime).toContain('shippingServiceRef: prepared.shippingServiceRef');
  });

  it('keeps adapter interface V1 separate from handshake evidence V2', () => {
    expect(runtime).toContain('adapter.interfaceVersion !== 1');
    expect(runtime).not.toContain('adapter.interfaceVersion !== SUPPLIER_ORDER_HANDSHAKE_INTERFACE_VERSION');
  });
});