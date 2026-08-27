import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repo = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const canonical = repo('supabase/683_supplier_cancellation_runtime.sql');
const deploy = repo('supabase/migrations/20260827134500_supplier_cancellation_runtime.sql');
const runtime = repo('netlify/functions/_shared/supplierCancellation.ts');
const control = repo('netlify/functions/_shared/supplierCommerceControl.ts');

for (const sql of [canonical, deploy]) {
  describe(`Supplier Commerce Stage 5C cancellation — ${sql === canonical ? 'canonical' : 'deploy'}`, () => {
    it('adds a dedicated cancellation control that remains disabled by default', () => {
      expect(sql).toContain("'cancellation'");
      expect(sql).toContain("VALUES('cancellation','global',NULL,false");
      expect(sql).toContain("server_supplier_commerce_control_decision_v1('cancellation'");
      expect(sql).not.toContain("VALUES('cancellation','global',NULL,true");
    });

    it('persists exact handshake/provider/adapter identity and append-only events', () => {
      expect(sql).toContain('private.supplier_order_cancellations');
      expect(sql).toContain('handshake_id uuid NOT NULL UNIQUE');
      expect(sql).toContain('provider_key text NOT NULL');
      expect(sql).toContain('adapter_version text NOT NULL');
      expect(sql).toContain('external_supplier_order_ref text NOT NULL');
      expect(sql).toContain('supplier cancellation identity is immutable');
      expect(sql).toContain('supplier cancellation events are append-only');
    });

    it('only prepares cancellation for an accepted supplier order and exact cancellation capability', () => {
      expect(sql).toContain("v_h.state NOT IN ('accepted','reconciled')");
      expect(sql).toContain("v_h.acknowledgement_state<>'accepted'");
      expect(sql).toContain("v_order.status NOT IN ('paid','packed')");
      expect(sql).toContain("v_leg.status<>'supplier_accepted'");
      expect(sql).toContain("a.capabilities @> ARRAY['cancellation']::text[]");
      expect(sql).toContain('a.provider_key=v_h.provider_key');
      expect(sql).toContain('a.adapter_version=v_h.adapter_version');
    });

    it('is idempotent and blocks blind retry after unknown outcomes', () => {
      expect(sql).toContain('supplier cancellation idempotency collision');
      expect(sql).toContain("v_c.state IN ('unknown','reconciliation_required')");
      expect(sql).toContain('query_before_retry_required');
      expect(sql).toContain("'cancellation_outcome_unknown_no_blind_retry'");
    });

    it('keeps supplier cancellation separate from customer refund/order money truth', () => {
      expect(sql).toContain("UPDATE private.supplier_fulfilment_legs SET status='cancelled'");
      expect(sql).toContain("UPDATE private.supplier_order_orchestrations SET state='cancelled'");
      expect(sql).not.toContain("UPDATE public.orders SET status='refunded'");
      expect(sql).not.toContain('stripe.refunds');
    });

    it('performs no provider call in SQL', () => {
      expect(sql).not.toContain('adapter.cancelOrder');
      expect(sql).not.toContain('cancelOrder(');
    });
  });
}

describe('Supplier Commerce Stage 5C provider-neutral runtime', () => {
  it('uses the exact canonical prepare/start/result boundaries and adapter cancellation capability', () => {
    expect(runtime).toContain('server_prepare_supplier_order_cancellation_v1');
    expect(runtime).toContain('server_mark_supplier_order_cancellation_started_v1');
    expect(runtime).toContain('server_record_supplier_order_cancellation_result_v1');
    expect(runtime).toContain("adapterSupports(adapter, 'cancellation')");
    expect(runtime).toContain('adapter.cancelOrder');
  });

  it('never blindly retries an unknown cancellation result', () => {
    expect(runtime).toContain("prepared.state === 'reconciliation_required'");
    expect(runtime).toContain("recoveryState: 'query_before_retry'");
    expect(runtime).toContain("errorClass: 'UNKNOWN_OUTCOME'");
  });

  it('records cancellation as a distinct Supplier Commerce operation', () => {
    expect(control).toContain("| 'cancellation'");
    expect(runtime).toContain("operation: 'cancellation'");
    expect(runtime).toContain('supplier_commitment_cancelled_customer_refund_still_separate');
  });
});
