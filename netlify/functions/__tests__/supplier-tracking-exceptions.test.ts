import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import type { SupplierAdapterV1 } from '../_shared/supplierAdapter';
import { SUPPLIER_TRACKING_INTERFACE_VERSION, syncSupplierTracking } from '../_shared/supplierTracking';

const repo = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const foundation = repo('supabase/644_supplier_tracking_exception_foundation.sql');
const runtime = repo('supabase/645_supplier_tracking_runtime_guards.sql');
const exceptions = repo('supabase/646_supplier_exception_engine.sql');
const closure = repo('supabase/647_supplier_tracking_exception_closure.sql');
const helper = repo('netlify/functions/_shared/supplierTracking.ts');
const adminApi = repo('netlify/functions/admin-supplier-tracking.ts');

const HANDSHAKE = '11111111-1111-4111-8111-111111111111';
const context = {
  eligible: true,
  reason: 'supplier_tracking_ready',
  handshakeId: HANDSHAKE,
  orderId: '22222222-2222-4222-8222-222222222222',
  orchestrationId: '33333333-3333-4333-8333-333333333333',
  fulfilmentLegId: '44444444-4444-4444-8444-444444444444',
  supplierId: '55555555-5555-4555-8555-555555555555',
  supplierKey: 'supplier-a',
  providerKey: 'provider-a',
  adapterVersion: '2026-08-21',
  supplierOrderRef: 'SUP-1',
  correlationId: '66666666-6666-4666-8666-666666666666',
  interfaceVersion: 1,
} as const;

function adapter(overrides: Partial<SupplierAdapterV1> = {}): SupplierAdapterV1 {
  return {
    interfaceVersion: 1,
    providerKey: 'provider-a',
    adapterVersion: '2026-08-21',
    capabilities: ['tracking'],
    getTracking: vi.fn(async () => ({
      ok: true as const,
      data: [{ supplierOrderRef: 'SUP-1', carrierRef: 'carrier-x', trackingRef: 'TRK-1', status: 'in_transit', occurredAt: '2026-08-21T10:00:00Z' }],
    })),
    ...overrides,
  };
}

describe('Phase K tracking + exceptions', () => {
  it('keeps one customer order while allowing internal per-leg shipments', () => {
    expect(foundation).toContain('Buyer remains on ONE public customer order');
    expect(foundation).toContain('fulfilment_leg_id uuid NOT NULL UNIQUE');
    expect(foundation).toContain('private.supplier_leg_shipments');
  });

  it('normalises provider statuses through versioned approved mappings', () => {
    expect(foundation).toContain('supplier_tracking_status_mappings');
    expect(foundation).toContain('version integer NOT NULL');
    expect(runtime).toContain("m.status='approved'");
    expect(runtime).toContain('v_mapping.canonical_status');
  });

  it('implements canonical tracking states from the contract', () => {
    for (const state of ['pending','accepted','dispatched','in_transit','exception','out_for_delivery','delivered','failed_delivery','returned']) {
      expect(foundation).toContain(`'${state}'`);
    }
  });

  it('requires tracking_ingest kill switch and never enables it', () => {
    expect(runtime).toContain("server_supplier_commerce_control_decision_v1('tracking_ingest'");
    expect(runtime).toContain("'tracking_ingest_control_disabled'");
    expect(foundation).toContain('this migration enables no control');
    expect(foundation).not.toContain('enabled = true');
  });

  it('requires reconciled supplier order and tracking-capable adapter context', () => {
    expect(runtime).toContain("v_h.state<>'reconciled'");
    expect(runtime).toContain("ARRAY['tracking']::text[]");
    expect(helper).toContain("adapterSupports(adapter, 'tracking')");
  });

  it('makes raw tracking events append-only and replay-idempotent', () => {
    expect(runtime).toContain('supplier tracking events are append-only');
    expect(foundation).toContain('event_fingerprint text NOT NULL UNIQUE');
    expect(runtime).toContain('ON CONFLICT(event_fingerprint) DO NOTHING');
    expect(runtime).toContain("'tracking_event_replayed'");
  });

  it('protects shipment identity, tracking reference and delivered terminal truth', () => {
    expect(closure).toContain('supplier leg shipment identity is immutable');
    expect(closure).toContain('tracking reference is immutable once known');
    expect(closure).toContain("OLD.canonical_status='delivered'");
    expect(closure).toContain("NEW.canonical_status NOT IN ('delivered','returned')");
  });

  it('requires every exception to carry state owner next action customer impact financial impact and resolution', () => {
    for (const field of ['state text NOT NULL','owner_type text NOT NULL','next_action text NOT NULL','customer_impact text NOT NULL','financial_impact text NOT NULL','resolution text']) {
      expect(foundation).toContain(field);
    }
  });

  it('covers Phase K tracking/fulfilment exception classes while deferring money movement to Phase L', () => {
    for (const type of ['partial_fulfilment','partial_shipment','delayed_dispatch','no_tracking','lost_shipment','tracking_exception','failed_delivery','supplier_suspended_mid_order']) {
      expect(foundation).toContain(`'${type}'`);
    }
    expect(exceptions).toContain('Returns/refunds/recovery money movement remains Phase L');
    expect(exceptions).not.toContain('UPDATE public.payment_sessions');
  });

  it('detects no-tracking delayed-dispatch and carrier exception evidence idempotently', () => {
    expect(exceptions).toContain("'no-tracking:'||h.id::text");
    expect(exceptions).toContain("'delayed-dispatch:'||s.id::text");
    expect(exceptions).toContain("'tracking-exception:'||e.id::text");
    expect(exceptions).toContain('ON CONFLICT(exception_key) DO NOTHING');
  });

  it('keeps exception transition/admin visibility active-admin-only', () => {
    expect(exceptions).toContain("u.role='admin'");
    expect(exceptions).toContain('u."isActive"=true');
    expect(adminApi).toContain("authenticateActiveAccount(event, admin, ['admin'])");
  });

  it('preserves approved mapping history by versioning instead of rewrite', () => {
    expect(closure).toContain('approved supplier tracking mapping truth is immutable; create a new version');
    expect(closure).toContain("SET status='retired',effective_to=p_effective_from");
    expect(closure).toContain('COALESCE(MAX(version),0)+1');
  });

  it('polls provider tracking through SupplierAdapterV1 and persists via server RPC', async () => {
    const rpc = vi.fn(async (name: string) => {
      if (name === 'server_supplier_tracking_context_v1') return { data: context, error: null };
      if (name === 'server_ingest_supplier_tracking_event_v1') return { data: { ok: true, reason: 'tracking_event_ingested' }, error: null };
      if (name === 'server_detect_supplier_tracking_exceptions_v1') return { data: 0, error: null };
      if (name === 'server_record_supplier_commerce_operation_v1') return { data: HANDSHAKE, error: null };
      return { data: null, error: new Error(`unexpected rpc ${name}`) };
    });
    const client = { rpc } as unknown as SupabaseClient;
    const a = adapter();
    const result = await syncSupplierTracking(client, a, HANDSHAKE);
    expect(result).toEqual({ ok: true, ingested: 1, blocked: 0 });
    expect(a.getTracking).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('server_ingest_supplier_tracking_event_v1', expect.objectContaining({ p_handshake_id: HANDSHAKE, p_provider_status: 'in_transit' }));
  });

  it('fails closed before provider call when adapter identity/capability mismatches', async () => {
    const rpc = vi.fn(async (name: string) => name === 'server_supplier_tracking_context_v1' ? { data: context, error: null } : { data: null, error: null });
    const client = { rpc } as unknown as SupabaseClient;
    const a = adapter({ providerKey: 'wrong-provider' });
    const result = await syncSupplierTracking(client, a, HANDSHAKE);
    expect(result).toMatchObject({ ok: false, ingested: 0, reason: 'tracking_adapter_identity_or_capability_mismatch' });
    expect(a.getTracking).not.toHaveBeenCalled();
  });

  it('blocks malformed or wrong-order provider events instead of laundering them into tracking truth', async () => {
    const rpc = vi.fn(async (name: string) => {
      if (name === 'server_supplier_tracking_context_v1') return { data: context, error: null };
      if (name === 'server_detect_supplier_tracking_exceptions_v1') return { data: 0, error: null };
      return { data: null, error: null };
    });
    const client = { rpc } as unknown as SupabaseClient;
    const a = adapter({
      getTracking: vi.fn(async () => ({ ok: true as const, data: [
        { supplierOrderRef: 'WRONG', status: 'delivered', occurredAt: '2026-08-21T10:00:00Z' },
        { supplierOrderRef: 'SUP-1', status: '', occurredAt: 'not-a-date' },
      ] })),
    });
    const result = await syncSupplierTracking(client, a, HANDSHAKE);
    expect(result).toEqual({ ok: false, ingested: 0, blocked: 2 });
    expect(rpc).not.toHaveBeenCalledWith('server_ingest_supplier_tracking_event_v1', expect.anything());
  });

  it('exposes interface version 1 without changing SupplierAdapterV1', () => {
    expect(SUPPLIER_TRACKING_INTERFACE_VERSION).toBe(1);
    expect(helper).toContain('SUPPLIER_TRACKING_INTERFACE_VERSION = 1');
  });
});
