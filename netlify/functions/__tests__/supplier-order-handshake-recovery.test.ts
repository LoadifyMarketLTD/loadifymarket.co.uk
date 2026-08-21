import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import type { SupplierAdapterV1 } from '../_shared/supplierAdapter';
import { recoverSupplierOrderLostResponse } from '../_shared/supplierOrderRecovery';

const repo = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const closure = repo('supabase/643_supplier_payment_handshake_terminal_closure.sql');
const adapterContract = repo('netlify/functions/_shared/supplierAdapter.ts');
const recovery = repo('netlify/functions/_shared/supplierOrderRecovery.ts');

const HANDSHAKE = '33333333-3333-4333-8333-333333333333';
const CORRELATION = '77777777-7777-4777-8777-777777777777';

describe('Phase J lost-response and terminal closure', () => {
  it('adds provider lookup by the original idempotency key without changing adapter interface version', () => {
    expect(adapterContract).toContain('findOrderByIdempotencyKey?');
    expect(adapterContract).toContain('same idempotency key used for submitOrder');
    expect(adapterContract).toContain('SUPPLIER_ADAPTER_INTERFACE_VERSION = 1');
  });

  it('never calls submitOrder during lost-response recovery', () => {
    expect(recovery).toContain('This function never calls submitOrder');
    expect(recovery).toContain('adapter.findOrderByIdempotencyKey(context)');
    expect(recovery).not.toContain('adapter.submitOrder(');
  });

  it('fails to manual review when provider cannot lookup a lost response safely', async () => {
    const client = { rpc: vi.fn() } as unknown as SupabaseClient;
    const adapter: SupplierAdapterV1 = {
      interfaceVersion: 1,
      providerKey: 'provider-a',
      adapterVersion: 'v1',
      capabilities: ['order_submission', 'acknowledgement'],
    };
    await expect(recoverSupplierOrderLostResponse(client, adapter, {
      handshakeId: HANDSHAKE,
      supplierKey: 'supplier-a',
      territory: 'GB',
      correlationId: CORRELATION,
      idempotencyKey: 'idem-1',
    })).resolves.toEqual({ ok: false, state: 'manual_review', errorClass: 'CAPABILITY_UNAVAILABLE' });
  });

  it('recovers accepted supplier order by idempotency lookup and reconciles once', async () => {
    const rpc = vi.fn(async (name: string) => {
      if (name === 'server_record_supplier_order_acknowledgement_v1') return { data: { ok: true }, error: null };
      if (name === 'server_reconcile_supplier_order_handshake_v1') return { data: { reconciled: true }, error: null };
      return { data: null, error: new Error(`unexpected rpc ${name}`) };
    });
    const client = { rpc } as unknown as SupabaseClient;
    const adapter: SupplierAdapterV1 = {
      interfaceVersion: 1,
      providerKey: 'provider-a',
      adapterVersion: 'v1',
      capabilities: ['order_submission', 'acknowledgement'],
      findOrderByIdempotencyKey: vi.fn(async () => ({
        ok: true as const,
        data: { supplierOrderRef: 'SUP-LOST-1', state: 'accepted' as const, acknowledgedAt: '2026-08-21T09:30:00Z' },
      })),
    };
    const result = await recoverSupplierOrderLostResponse(client, adapter, {
      handshakeId: HANDSHAKE,
      supplierKey: 'supplier-a',
      territory: 'GB',
      correlationId: CORRELATION,
      idempotencyKey: 'idem-1',
    });
    expect(result).toEqual({ ok: true, state: 'reconciled', externalSupplierOrderRef: 'SUP-LOST-1' });
    expect(adapter.findOrderByIdempotencyKey).toHaveBeenCalledTimes(1);
  });

  it('prevents accepted, rejected and reconciled terminal truth from regressing', () => {
    expect(closure).toContain('reconciled supplier handshake cannot regress');
    expect(closure).toContain('accepted supplier acknowledgement cannot regress');
    expect(closure).toContain('rejected supplier acknowledgement cannot regress');
    expect(closure).toContain('external supplier order reference is immutable once known');
  });

  it('treats weaker duplicate acknowledgement after accepted as replay, not downgrade', () => {
    expect(closure).toContain("IF v_h.acknowledgement_state='accepted' THEN");
    expect(closure).toContain("'accepted_acknowledgement_replayed'");
    expect(closure).toContain("'conflicting_terminal_acknowledgement'");
  });

  it('explicitly checks both payment and reservation evidence during reconciliation', () => {
    expect(closure).toContain('IF v_payment.id IS NULL');
    expect(closure).toContain('IF v_res.id IS NULL');
    expect(closure).toContain("v_payment.payment_status<>'completed'");
    expect(closure).toContain("v_res.status='consumed'");
  });
});
