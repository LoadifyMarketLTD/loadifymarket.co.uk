import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repo = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const canonical = repo('supabase/680_supplier_payment_order_materialisation.sql');
const deploy = repo('supabase/migrations/20260827122500_supplier_payment_order_materialisation.sql');

for (const sql of [canonical, deploy]) {
  describe(`Supplier Commerce Stage 4B materialisation contract — ${sql === canonical ? 'canonical' : 'deploy'}`, () => {
    it('preserves marketplace tax evidence and adds supplier pricing evidence', () => {
      expect(sql).toContain("'checkout_verified_tax_v1'");
      expect(sql).toContain("'supplier_pricing_snapshot_v1'");
      expect(sql).toContain("'supplier_pricing_snapshots_v1'");
    });

    it('requires supplier payment-session commercial evidence v2', () => {
      expect(sql).toContain('private.payment_session_has_supplier_snapshot_v2');
      expect(sql).toContain("p_metadata->>'commercialSnapshotVersion'<>'2'");
      expect(sql).toContain("p_metadata->>'commercialMode'<>'loadify_supplier_fulfilled'");
      expect(sql).toContain("v_platform->>'returnResponsibility'<>'loadify'");
    });

    it('requires reservation, fulfilment leg and shipping decision before payment-session insertion', () => {
      expect(sql).toContain("v_item->>'reservationId'");
      expect(sql).toContain("v_item->>'fulfilmentLegId'");
      expect(sql).toContain("v_item->>'shippingDecisionId'");
      expect(sql).toContain("v_item->>'shippingServiceRef'");
    });

    it('keeps marketplace v1 accepted while supplier v2 is accepted separately', () => {
      expect(sql).toContain('private.payment_session_has_commercial_snapshot_v1(NEW.metadata)');
      expect(sql).toContain('private.payment_session_has_supplier_snapshot_v2(NEW.metadata)');
    });

    it('materialises only an already-prepared canonical supplier order', () => {
      expect(sql).toContain('public.server_materialize_paid_supplier_order_v1');
      expect(sql).toContain('pre-payment canonical supplier order is required');
      expect(sql).toContain("v_order.\"commercialModeSnapshot\" IS DISTINCT FROM 'loadify_supplier_fulfilled'");
      expect(sql).toContain('v_order."sellerId" IS NOT NULL');
    });

    it('rechecks exact route and active reservation before paid transition', () => {
      expect(sql).toContain('v_order_item."supplierCanonicalProductIdSnapshot"');
      expect(sql).toContain('v_order_item."supplierOfferIdSnapshot"');
      expect(sql).toContain("r.status='active'");
      expect(sql).toContain('r.expires_at>now()');
      expect(sql).toContain('supplier fulfilment leg identity mismatch at payment materialisation');
    });

    it('does not equate payment success with supplier order success', () => {
      expect(sql).not.toContain('submitOrder(');
      expect(sql).not.toContain('supplier_accepted');
      expect(sql).not.toContain('external_supplier_order_ref');
      expect(sql).toContain("status='paid'");
    });

    it('does not enable Supplier Commerce', () => {
      expect(sql).not.toContain('SET enabled=true');
      expect(sql).not.toContain('enabled = true');
      expect(sql).not.toContain('INSERT INTO private.supplier_pilot_programs');
    });
  });
}
