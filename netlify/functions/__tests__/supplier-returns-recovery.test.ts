import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import type { SupplierAdapterV1 } from '../_shared/supplierAdapter';
import {
  SUPPLIER_RETURNS_INTERFACE_VERSION,
  pollSupplierRecovery,
  requestSupplierReturn,
} from '../_shared/supplierReturns';

const repo = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const foundation = repo('supabase/648_supplier_returns_recovery_foundation.sql');
const runtime = repo('supabase/649_supplier_returns_recovery_runtime_guards.sql');
const reconciliation = repo('supabase/650_supplier_financial_reconciliation.sql');
const closure = repo('supabase/651_supplier_returns_recovery_closure.sql');
const helper = repo('netlify/functions/_shared/supplierReturns.ts');
const adminApi = repo('netlify/functions/admin-supplier-returns.ts');

const ORDER = '11111111-1111-4111-8111-111111111111';
const LEG = '22222222-2222-4222-8222-222222222222';
const RETURN_CASE = '33333333-3333-4333-8333-333333333333';
const CORRELATION = '44444444-4444-4444-8444-444444444444';

function returnPrepared() {
  return {
    eligible: true,
    reason: 'supplier_return_ready',
    returnCaseId: RETURN_CASE,
    orderId: ORDER,
    fulfilmentLegId: LEG,
    supplierId: '55555555-5555-4555-8555-555555555555',
    supplierKey: 'supplier-a',
    providerKey: 'provider-a',
    adapterVersion: '2026-08-21',
    supplierOrderRef: 'SUP-1',
    reasonCode: 'damaged',
    quantity: 1,
    idempotencyKey: 'return-idem-1',
    correlationId: CORRELATION,
    interfaceVersion: 1,
  } as const;
}

function recoveryPrepared() {
  return {
    eligible: true,
    reason: 'supplier_recovery_ready',
    returnCaseId: RETURN_CASE,
    orderId: ORDER,
    supplierId: '55555555-5555-4555-8555-555555555555',
    supplierKey: 'supplier-a',
    providerKey: 'provider-a',
    adapterVersion: '2026-08-21',
    supplierOrderRef: 'SUP-1',
    externalReturnRef: 'RET-1',
    currency: 'GBP',
    currencyMinorUnitExponent: 2,
    correlationId: CORRELATION,
    idempotencyKey: 'return-idem-1',
    interfaceVersion: 1,
  } as const;
}

function adapter(overrides: Partial<SupplierAdapterV1> = {}): SupplierAdapterV1 {
  return {
    interfaceVersion: 1,
    providerKey: 'provider-a',
    adapterVersion: '2026-08-21',
    capabilities: ['returns', 'reimbursement'],
    requestReturn: vi.fn(async () => ({ ok: true as const, data: { returnRef: 'RET-1' } })),
    getReimbursement: vi.fn(async () => ({
      ok: true as const,
      data: { amountMinor: 1250, currency: 'GBP', state: 'recovered' },
      externalRef: 'REC-1',
    })),
    ...overrides,
  };
}

describe('Phase L returns + refunds + supplier recovery + reconciliation', () => {
  it('keeps customer refund truth separate from supplier recovery truth', () => {
    expect(foundation).toContain('private.supplier_customer_refund_evidence');
    expect(foundation).toContain('private.supplier_recovery_evidence');
    expect(foundation).toContain('A buyer refund never implies supplier recovery');
  });

  it('keeps return_recovery kill switch off by default', () => {
    expect(foundation).toContain("('return_recovery','global',NULL,false,'Phase L safe default')");
    expect(foundation).not.toContain('enabled=true');
    expect(runtime).toContain("server_supplier_commerce_control_decision_v1('return_recovery'");
  });

  it('requires a reconciled supplier order and delivered supplier shipment before return', () => {
    expect(runtime).toContain("o.state='reconciled'");
    expect(runtime).toContain("v_ship.canonical_status NOT IN ('delivered','returned')");
    expect(runtime).toContain("'return_requires_delivered_supplier_shipment'");
  });

  it('requires returns and reimbursement adapter capabilities', () => {
    expect(runtime).toContain("ARRAY['returns','reimbursement']::text[]");
    expect(helper).toContain("adapterSupports(adapter, 'returns')");
    expect(helper).toContain("adapterSupports(adapter, 'reimbursement')");
  });

  it('makes refund/recovery evidence and lifecycle events append-only', () => {
    expect(runtime).toContain('Phase L refund/recovery evidence is append-only');
    expect(foundation).toContain('REVOKE ALL ON TABLE private.supplier_customer_refund_evidence');
    expect(foundation).toContain('REVOKE ALL ON TABLE private.supplier_recovery_evidence');
  });

  it('prevents refund overpayment and currency drift', () => {
    expect(runtime).toContain('cumulative customer refund exceeds customer order total');
    expect(runtime).toContain('refund currency must match fulfilment leg currency');
    expect(runtime).toContain('recovery currency must match fulfilment leg currency');
  });

  it('posts customer refunds and supplier recoveries as distinct append-only ledger events', () => {
    expect(runtime).toContain("'customer_refund','customer_refund'");
    expect(runtime).toContain("'supplier_recovery','supplier_recovery'");
    expect(runtime).toContain("'phase-l-refund:'");
    expect(runtime).toContain("'phase-l-recovery:'");
  });

  it('compares Phase J payment evidence with financial ledger and downstream money truth', () => {
    expect(reconciliation).toContain('private.supplier_payment_evidence_snapshots');
    expect(reconciliation).toContain("event_type='customer_payment'");
    expect(reconciliation).toContain("event_type='supplier_payable'");
    expect(reconciliation).toContain("event_type='payout'");
    expect(reconciliation).toContain("event_type='customer_refund'");
    expect(reconciliation).toContain("event_type='supplier_recovery'");
    expect(reconciliation).toContain("event_type='chargeback'");
  });

  it('uses the canonical reconciliation states and never equates order completion with reconciliation', () => {
    expect(foundation).toContain("'RECONCILED','PARTIALLY_RECONCILED','EXCEPTION','UNRECOVERED'");
    expect(reconciliation).toContain('order completed != financially reconciled');
    expect(reconciliation).toContain("v_state:='UNRECOVERED'");
    expect(reconciliation).toContain("v_state:='PARTIALLY_RECONCILED'");
  });

  it('adds Phase L financial exceptions without mixing them into tracking money movement', () => {
    expect(reconciliation).toContain("'reimbursement_failure'");
    expect(reconciliation).toContain("'financial_reconciliation_mismatch'");
    expect(reconciliation).toContain('server_open_supplier_financial_exception_v1');
  });

  it('protects return identity and terminal refund/recovery truth', () => {
    expect(closure).toContain('supplier return case identity is immutable');
    expect(closure).toContain('successful customer refund truth cannot regress');
    expect(closure).toContain('terminal supplier recovery truth cannot regress');
  });

  it('fails closed on generic minor-unit conversion outside the currently enabled GBP economics', () => {
    expect(closure).toContain("IF v_leg.currency<>'GBP'");
    expect(closure).toContain("'automated_recovery_currency_not_enabled'");
    expect(closure).toContain("'currencyMinorUnitExponent',2");
    expect(helper).toContain('10 ** prepared.currencyMinorUnitExponent');
  });

  it('keeps Phase L admin visibility active-admin-only', () => {
    expect(closure).toContain("u.role='admin'");
    expect(closure).toContain('u."isActive"=true');
    expect(adminApi).toContain("authenticateActiveAccount(event, admin, ['admin'])");
  });

  it('requests a provider return through SupplierAdapterV1 and persists the external return identity', async () => {
    const rpc = vi.fn(async (name: string) => {
      if (name === 'server_prepare_supplier_return_v1') return { data: returnPrepared(), error: null };
      if (name === 'server_record_supplier_return_authorisation_v1') return { data: { ok: true, state: 'authorised' }, error: null };
      return { data: null, error: new Error(`unexpected rpc ${name}`) };
    });
    const client = { rpc } as unknown as SupabaseClient;
    const a = adapter();
    const result = await requestSupplierReturn(client, a, {
      orderId: ORDER,
      fulfilmentLegId: LEG,
      reasonCode: 'damaged',
      quantity: 1,
      idempotencyKey: 'return-idem-1',
      correlationId: CORRELATION,
    });
    expect(result).toMatchObject({ ok: true, state: 'authorised', returnCaseId: RETURN_CASE, externalReturnRef: 'RET-1' });
    expect(a.requestReturn).toHaveBeenCalledTimes(1);
  });

  it('fails closed before provider return call on adapter identity mismatch', async () => {
    const rpc = vi.fn(async () => ({ data: returnPrepared(), error: null }));
    const client = { rpc } as unknown as SupabaseClient;
    const a = adapter({ providerKey: 'wrong-provider' });
    const result = await requestSupplierReturn(client, a, {
      orderId: ORDER, fulfilmentLegId: LEG, reasonCode: 'damaged', quantity: 1,
      idempotencyKey: 'return-idem-1', correlationId: CORRELATION,
    });
    expect(result.ok).toBe(false);
    expect(result.errorClass).toBe('CAPABILITY_UNAVAILABLE');
    expect(a.requestReturn).not.toHaveBeenCalled();
  });

  it('polls reimbursement, converts explicitly enabled GBP minor units and persists recovery evidence', async () => {
    const rpc = vi.fn(async (name: string) => {
      if (name === 'server_supplier_recovery_context_v1') return { data: recoveryPrepared(), error: null };
      if (name === 'server_record_supplier_recovery_evidence_v1') return { data: { ok: true, state: 'recovered' }, error: null };
      return { data: null, error: new Error(`unexpected rpc ${name}`) };
    });
    const client = { rpc } as unknown as SupabaseClient;
    const a = adapter();
    const result = await pollSupplierRecovery(client, a, RETURN_CASE);
    expect(result).toMatchObject({ ok: true, state: 'recovered', amount: 12.5, currency: 'GBP' });
    expect(a.getReimbursement).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('server_record_supplier_recovery_evidence_v1', expect.objectContaining({ p_amount: 12.5, p_currency: 'GBP', p_state: 'recovered' }));
  });

  it('blocks a provider reimbursement currency mismatch instead of laundering it into financial truth', async () => {
    const rpc = vi.fn(async (name: string) => {
      if (name === 'server_supplier_recovery_context_v1') return { data: recoveryPrepared(), error: null };
      return { data: null, error: null };
    });
    const client = { rpc } as unknown as SupabaseClient;
    const a = adapter({
      getReimbursement: vi.fn(async () => ({ ok: true as const, data: { amountMinor: 1250, currency: 'USD', state: 'recovered' } })),
    });
    const result = await pollSupplierRecovery(client, a, RETURN_CASE);
    expect(result).toMatchObject({ ok: false, state: 'manual_review', errorClass: 'MALFORMED_RESPONSE' });
    expect(rpc).not.toHaveBeenCalledWith('server_record_supplier_recovery_evidence_v1', expect.anything());
  });

  it('exposes interface version 1 without changing SupplierAdapterV1', () => {
    expect(SUPPLIER_RETURNS_INTERFACE_VERSION).toBe(1);
  });
});
