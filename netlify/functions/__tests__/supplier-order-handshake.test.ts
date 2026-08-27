import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import type { SupplierAdapterV1 } from '../_shared/supplierAdapter';
import {
  SUPPLIER_ORDER_HANDSHAKE_INTERFACE_VERSION,
  recoverSupplierOrderAcknowledgement,
  submitPaidSupplierOrder,
} from '../_shared/supplierOrderHandshake';

const repo = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const foundation = repo('supabase/640_supplier_payment_handshake_foundation.sql');
const runtime = repo('supabase/641_supplier_payment_handshake_runtime_guards.sql');
const reconciliation = repo('supabase/642_supplier_payment_handshake_reconciliation.sql');
const shippingClosure = repo('supabase/685_supplier_payment_handshake_shipping_closure.sql');
const helper = repo('netlify/functions/_shared/supplierOrderHandshake.ts');
const adminApi = repo('netlify/functions/admin-supplier-order-handshake.ts');

const UUID = '11111111-1111-4111-8111-111111111111';
const LEG = '22222222-2222-4222-8222-222222222222';
const HANDSHAKE = '33333333-3333-4333-8333-333333333333';
const RESERVATION = '44444444-4444-4444-8444-444444444444';
const PAYMENT = '55555555-5555-4555-8555-555555555555';
const SHIPPING = '88888888-8888-4888-8888-888888888888';

function prepared() {
  return {
    eligible: true,
    reason: 'supplier_order_handshake_shipping_ready',
    handshakeId: HANDSHAKE,
    orderId: UUID,
    fulfilmentLegId: LEG,
    reservationId: RESERVATION,
    paymentEvidenceId: PAYMENT,
    supplierKey: 'supplier-a',
    supplierOfferId: '66666666-6666-4666-8666-666666666666',
    externalOfferRef: 'offer-42',
    providerKey: 'provider-a',
    adapterVersion: '2026-08-21',
    quantity: 2,
    destinationCountry: 'GB',
    shippingDecisionId: SHIPPING,
    shippingServiceRef: 'standard-gb',
    shippingBindingFingerprint: '0123456789abcdef0123456789abcdef',
    idempotencyKey: 'idem-1',
    correlationId: '77777777-7777-4777-8777-777777777777',
    state: 'prepared',
    externalSupplierOrderRef: null,
    interfaceVersion: 2,
  } as const;
}

function adapter(overrides: Partial<SupplierAdapterV1> = {}): SupplierAdapterV1 {
  return {
    interfaceVersion: 1,
    providerKey: 'provider-a',
    adapterVersion: '2026-08-21',
    capabilities: ['order_submission', 'acknowledgement'],
    submitOrder: vi.fn(async () => ({
      ok: true as const,
      data: { supplierOrderRef: 'SUP-1', state: 'accepted' as const, acknowledgedAt: '2026-08-21T09:00:00Z' },
    })),
    getOrderAcknowledgement: vi.fn(async () => ({
      ok: true as const,
      data: { supplierOrderRef: 'SUP-1', state: 'accepted' as const, acknowledgedAt: '2026-08-21T09:00:10Z' },
    })),
    ...overrides,
  };
}

describe('Phase J payment → supplier handshake', () => {
  it('keeps payment success distinct from supplier-order success', () => {
    expect(foundation).toContain('PAYMENT SUCCESS != SUPPLIER ORDER SUCCESS');
    expect(foundation).toContain('private.supplier_payment_evidence_snapshots');
    expect(foundation).toContain('private.supplier_order_handshakes');
    expect(runtime).toContain("reason','canonical_payment_not_proven'");
  });

  it('requires canonical completed payment evidence and matching Stripe PaymentIntent', () => {
    expect(runtime).toContain("ps.status='completed'");
    expect(runtime).toContain('ps."stripePaymentIntent"=v_order."stripePaymentIntentId"');
    expect(runtime).toContain('v_payment.amount<>v_order.total');
    expect(foundation).toContain("payment_status='completed'");
  });

  it('rechecks supplier stock and price after payment before submission', () => {
    expect(runtime).toContain('server_supplier_stock_price_decision_v1');
    expect(runtime).toContain("'supplier_stock_price_recheck_failed'");
    expect(runtime).toContain("'supplier_price_changed_since_reservation'");
    expect(runtime).toContain("'supplier_stock_changed_since_reservation'");
  });

  it('requires the supplier_order kill switch and does not enable it', () => {
    expect(runtime).toContain("server_supplier_commerce_control_decision_v1('supplier_order'");
    expect(runtime).toContain("'supplier_order_control_disabled'");
    expect(foundation).toContain('No Supplier Commerce control is enabled here');
    expect(foundation).not.toContain('enabled = true');
  });

  it('requires an active adapter with order submission and acknowledgement capabilities', () => {
    expect(runtime).toContain("a.status='active'");
    expect(runtime).toContain("ARRAY['order_submission','acknowledgement']::text[]");
    expect(helper).toContain("adapterSupports(adapter, 'order_submission')");
    expect(helper).toContain("adapterSupports(adapter, 'acknowledgement')");
  });

  it('binds the exact selected shipping service before provider submission', () => {
    expect(shippingClosure).toContain('server_prepare_supplier_order_handshake_v2');
    expect(shippingClosure).toContain('shipping_decision_id');
    expect(shippingClosure).toContain('shipping_service_ref');
    expect(shippingClosure).toContain('shipping_binding_fingerprint');
    expect(shippingClosure).toContain('REVOKE EXECUTE ON FUNCTION public.server_prepare_supplier_order_handshake_v1');
    expect(helper).toContain('server_prepare_supplier_order_handshake_v2');
    expect(helper).toContain('shippingServiceRef: prepared.shippingServiceRef');
  });

  it('makes payment evidence immutable and handshake events append-only', () => {
    expect(runtime).toContain('supplier payment evidence snapshots are immutable');
    expect(runtime).toContain('supplier order handshake events are append-only');
    expect(foundation).toContain('REVOKE ALL ON TABLE private.supplier_payment_evidence_snapshots');
    expect(foundation).toContain('REVOKE ALL ON TABLE private.supplier_order_handshake_events');
  });

  it('prevents duplicate supplier submissions with stable idempotency and immutable request identity', () => {
    expect(foundation).toContain('idempotency_key text NOT NULL UNIQUE');
    expect(foundation).toContain('request_fingerprint text NOT NULL');
    expect(runtime).toContain('supplier order handshake idempotency collision with different request');
    expect(runtime).toContain('supplier submission idempotency mismatch');
  });

  it('never blindly retries unknown or pending outcomes', () => {
    expect(runtime).toContain("IF v_h.state IN ('unknown','reconciliation_required','pending')");
    expect(runtime).toContain("'query_before_retry_required'");
    expect(reconciliation).toContain("reason','query_before_retry_required'");
    expect(helper).toContain('never calls submitOrder itself');
  });

  it('marks timed-out submissions UNKNOWN_OUTCOME for acknowledgement recovery', () => {
    expect(reconciliation).toContain('server_mark_supplier_order_handshake_timeout_v1');
    expect(reconciliation).toContain("state='unknown'");
    expect(reconciliation).toContain("last_error_class='UNKNOWN_OUTCOME'");
    expect(reconciliation).toContain("recovery_state='query_before_retry'");
  });

  it('protects external supplier order identity from duplicate acknowledgement drift', () => {
    expect(runtime).toContain('external supplier order reference cannot change');
    expect(reconciliation).toContain('duplicate acknowledgement references a different supplier order');
    expect(foundation).toContain('supplier_order_handshake_external_ref_unique');
  });

  it('consumes reservation only after accepted supplier acknowledgement', () => {
    expect(runtime).toContain("IF v_new_state='accepted' THEN");
    expect(runtime).toContain("SET status='consumed',consumed_at=now()");
    expect(reconciliation).toContain("IF v_ack='accepted' THEN");
  });

  it('releases reservation after supplier rejection without rewriting customer payment history', () => {
    expect(runtime).toContain("ELSIF v_new_state='rejected' THEN");
    expect(runtime).toContain("SET status='released',released_at=now()");
    expect(runtime).not.toContain('UPDATE public.payment_sessions');
    expect(reconciliation).not.toContain('UPDATE public.orders');
  });

  it('reconciles only accepted acknowledgement + external ref + consumed reservation', () => {
    expect(reconciliation).toContain("v_h.acknowledgement_state='accepted'");
    expect(reconciliation).toContain('v_h.external_supplier_order_ref IS NOT NULL');
    expect(reconciliation).toContain("v_res.status='consumed'");
    expect(reconciliation).toContain("state='reconciled'");
  });

  it('does not confuse Phase J handshake reconciliation with Phase L financial reconciliation', () => {
    expect(reconciliation).toContain('full financial reconciliation remains Phase L');
    expect(reconciliation).toContain('Full financial reconciliation is intentionally deferred to Phase L');
  });

  it('keeps Phase J admin visibility active-admin-only', () => {
    expect(reconciliation).toContain("u.role='admin'");
    expect(reconciliation).toContain('u."isActive"=true');
    expect(adminApi).toContain("authenticateActiveAccount(event, admin, ['admin'])");
  });

  it('submits through SupplierAdapterV1 with exact shipping service and reconciles an accepted acknowledgement', async () => {
    const rpc = vi.fn(async (name: string) => {
      if (name === 'server_prepare_supplier_order_handshake_v2') return { data: prepared(), error: null };
      if (name === 'server_mark_supplier_order_submission_started_v1') return { data: { ok: true, reason: 'submission_started', interfaceVersion: 1 }, error: null };
      if (name === 'server_record_supplier_order_submission_result_v1') return { data: { ok: true, state: 'accepted', recoveryState: 'reconcile' }, error: null };
      if (name === 'server_record_supplier_order_acknowledgement_v1') return { data: { ok: true }, error: null };
      if (name === 'server_reconcile_supplier_order_handshake_v1') return { data: { reconciled: true }, error: null };
      if (name === 'server_record_supplier_commerce_operation_v1') return { data: UUID, error: null };
      return { data: null, error: new Error(`unexpected rpc ${name}`) };
    });
    const client = { rpc } as unknown as SupabaseClient;
    const a = adapter();
    const result = await submitPaidSupplierOrder(client, a, {
      orderId: UUID,
      fulfilmentLegId: LEG,
      idempotencyKey: 'idem-1',
      correlationId: '77777777-7777-4777-8777-777777777777',
    });
    expect(result).toMatchObject({ ok: true, state: 'reconciled', handshakeId: HANDSHAKE, externalSupplierOrderRef: 'SUP-1' });
    expect(a.submitOrder).toHaveBeenCalledTimes(1);
    expect(a.submitOrder).toHaveBeenCalledWith(
      expect.objectContaining({ idempotencyKey: 'idem-1', territory: 'GB' }),
      expect.objectContaining({ externalOfferRef: 'offer-42', quantity: 2, destinationCountry: 'GB', shippingServiceRef: 'standard-gb' }),
    );
  });

  it('fails closed on adapter identity mismatch before provider submission', async () => {
    const rpc = vi.fn(async (name: string) => {
      if (name === 'server_prepare_supplier_order_handshake_v2') return { data: prepared(), error: null };
      if (name === 'server_record_supplier_order_submission_result_v1') return { data: { ok: true, state: 'reconciliation_required' }, error: null };
      return { data: null, error: null };
    });
    const client = { rpc } as unknown as SupabaseClient;
    const a = adapter({ providerKey: 'wrong-provider' });
    const result = await submitPaidSupplierOrder(client, a, {
      orderId: UUID, fulfilmentLegId: LEG, idempotencyKey: 'idem-1', correlationId: '77777777-7777-4777-8777-777777777777',
    });
    expect(result.ok).toBe(false);
    expect(result.errorClass).toBe('CAPABILITY_UNAVAILABLE');
    expect(a.submitOrder).not.toHaveBeenCalled();
  });

  it('classifies thrown provider submission as UNKNOWN_OUTCOME instead of blind retry', async () => {
    const rpc = vi.fn(async (name: string) => {
      if (name === 'server_prepare_supplier_order_handshake_v2') return { data: prepared(), error: null };
      if (name === 'server_mark_supplier_order_submission_started_v1') return { data: { ok: true }, error: null };
      if (name === 'server_record_supplier_order_submission_result_v1') return { data: { ok: true, state: 'unknown', recoveryState: 'query_before_retry' }, error: null };
      if (name === 'server_record_supplier_commerce_operation_v1') return { data: UUID, error: null };
      return { data: null, error: null };
    });
    const client = { rpc } as unknown as SupabaseClient;
    const a = adapter({ submitOrder: vi.fn(async () => { throw new Error('socket closed after write'); }) });
    const result = await submitPaidSupplierOrder(client, a, {
      orderId: UUID, fulfilmentLegId: LEG, idempotencyKey: 'idem-1', correlationId: '77777777-7777-4777-8777-777777777777',
    });
    expect(result).toMatchObject({ ok: false, state: 'unknown', recoveryState: 'query_before_retry', errorClass: 'UNKNOWN_OUTCOME' });
  });

  it('recovers a lost acknowledgement by querying provider, never resubmitting', async () => {
    const rpc = vi.fn(async (name: string) => {
      if (name === 'server_record_supplier_order_acknowledgement_v1') return { data: { ok: true }, error: null };
      if (name === 'server_reconcile_supplier_order_handshake_v1') return { data: { reconciled: true }, error: null };
      return { data: null, error: null };
    });
    const client = { rpc } as unknown as SupabaseClient;
    const a = adapter();
    const result = await recoverSupplierOrderAcknowledgement(client, a, {
      handshakeId: HANDSHAKE,
      supplierOrderRef: 'SUP-1',
      supplierKey: 'supplier-a',
      territory: 'GB',
      correlationId: '77777777-7777-4777-8777-777777777777',
      idempotencyKey: 'idem-1',
    });
    expect(result).toMatchObject({ ok: true, state: 'reconciled', externalSupplierOrderRef: 'SUP-1' });
    expect(a.getOrderAcknowledgement).toHaveBeenCalledTimes(1);
    expect(a.submitOrder).not.toHaveBeenCalled();
  });

  it('exposes the shipping-bound handshake evidence interface version', () => {
    expect(SUPPLIER_ORDER_HANDSHAKE_INTERFACE_VERSION).toBe(2);
  });
});