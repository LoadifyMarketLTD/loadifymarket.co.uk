import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { SupplierAdapterContext, SupplierOrderRequest } from '../_shared/supplierAdapter';
import { createSupplierSimulator, SUPPLIER_SIMULATOR_INTERFACE_VERSION, type SupplierSimulatorScenario } from '../_shared/supplierSimulator';

const repo = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const foundation = repo('supabase/660_supplier_simulator_recovery_validation.sql');
const closure = repo('supabase/661_supplier_simulator_recovery_validation_closure.sql');
const simulatorSource = repo('netlify/functions/_shared/supplierSimulator.ts');
const contract = [
  repo('docs/canonical/loadify-supplier-commerce-2026-08-19/03_CANONICAL_EXECUTION_CONTRACT_LINES_1251_1750.md'),
  repo('docs/canonical/loadify-supplier-commerce-2026-08-19/04_CANONICAL_EXECUTION_CONTRACT_LINES_1751_2210.md'),
].join('\n');

const context = (key = 'phase-n-idem-1'): SupplierAdapterContext => ({
  correlationId: '11111111-1111-4111-8111-111111111111',
  idempotencyKey: key,
  supplierKey: 'simulated-supplier',
  territory: 'GB',
});
const order: SupplierOrderRequest = { externalOfferRef: 'SIM-OFFER-1', quantity: 2, destinationCountry: 'GB' };

const canonicalScenarios: SupplierSimulatorScenario[] = [
  'stock_zero','price_change','timeout','provider_500','duplicate_acknowledgement','lost_response_after_accept',
  'partial_fulfilment','tracking','dispatch','delivery','lost_shipment','cancellation','return','refund','reimbursement',
];

describe('Phase N supplier simulator + recovery/replay validation', () => {
  it('is explicitly a simulator/test adapter before supplier production', () => {
    expect(contract).toContain('SUPPLIER SIMULATOR');
    expect(contract).toContain('simulator/test adapter');
    expect(simulatorSource).toContain('never calls a supplier, payment processor, carrier or production webhook');
    expect(SUPPLIER_SIMULATOR_INTERFACE_VERSION).toBe(1);
  });

  it('covers every canonical Phase N supplier simulator scenario', () => {
    for (const scenario of canonicalScenarios) expect(simulatorSource).toContain(`'${scenario}'`);
    for (const phrase of ['stock available','stock zero','price change','timeout','provider 500','duplicate acknowledgement','lost response after supplier accepted','partial fulfilment','tracking','dispatch','delivery','lost shipment','cancellation','return','refund','reimbursement']) {
      expect(contract.toLowerCase()).toContain(phrase);
    }
  });

  it('simulates stock available and stock zero without inventing sellable stock', async () => {
    const available = createSupplierSimulator({ scenario: 'happy_path' });
    const zero = createSupplierSimulator({ scenario: 'stock_zero' });
    await expect(available.getStock!(context(), ['SIM-VARIANT-1'])).resolves.toMatchObject({ ok: true, data: [{ quantity: 25, availability: 'in_stock' }] });
    await expect(zero.getStock!(context(), ['SIM-VARIANT-1'])).resolves.toMatchObject({ ok: true, data: [{ quantity: 0, availability: 'out_of_stock' }] });
  });

  it('simulates price drift as provider evidence rather than changing canonical buyer price', async () => {
    const adapter = createSupplierSimulator({ scenario: 'price_change', basePriceMinor: 1000 });
    await expect(adapter.getPrices!(context(), ['SIM-VARIANT-1'])).resolves.toMatchObject({ ok: true, data: [{ amountMinor: 1500, currency: 'GBP' }] });
    expect(simulatorSource).not.toContain('UPDATE public.products');
  });

  it('simulates timeout and provider 500 failure classes', async () => {
    await expect(createSupplierSimulator({ scenario: 'timeout' }).getStock!(context(), ['SIM-VARIANT-1'])).resolves.toMatchObject({ ok: false, errorClass: 'RETRYABLE_FAILURE' });
    await expect(createSupplierSimulator({ scenario: 'provider_500' }).getPrices!(context(), ['SIM-VARIANT-1'])).resolves.toMatchObject({ ok: false, errorClass: 'RETRYABLE_FAILURE' });
  });

  it('recovers an accepted order after a lost response using the exact submit idempotency key', async () => {
    const adapter = createSupplierSimulator({ scenario: 'lost_response_after_accept' });
    const ctx = context('lost-response-key');
    const submitted = await adapter.submitOrder!(ctx, order);
    expect(submitted).toMatchObject({ ok: false, errorClass: 'UNKNOWN_OUTCOME' });
    const recovered = await adapter.findOrderByIdempotencyKey!(ctx);
    expect(recovered).toMatchObject({ ok: true, data: { state: 'accepted', supplierOrderRef: 'SIM-ORDER-1' } });
    expect(adapter.diagnostics()).toMatchObject({ submitCalls: 1, recoveryLookupCalls: 1, acceptedIdempotencyKeys: ['lost-response-key'] });
  });

  it('does not need a blind duplicate submit after lost-response recovery', async () => {
    const adapter = createSupplierSimulator({ scenario: 'lost_response_after_accept' });
    const ctx = context('same-key');
    await adapter.submitOrder!(ctx, order);
    await adapter.findOrderByIdempotencyKey!(ctx);
    expect(adapter.diagnostics().submitCalls).toBe(1);
    expect(simulatorSource).toContain('recovery is query-before-retry with the exact submit key');
  });

  it('makes exact submit replay idempotent', async () => {
    const adapter = createSupplierSimulator({ scenario: 'happy_path' });
    const ctx = context('exact-replay-key');
    const first = await adapter.submitOrder!(ctx, order);
    const replay = await adapter.submitOrder!(ctx, order);
    expect(first).toEqual(replay);
    expect(adapter.diagnostics().acceptedIdempotencyKeys).toEqual(['exact-replay-key']);
  });

  it('fails closed on changed payload under an existing submit idempotency key', async () => {
    const adapter = createSupplierSimulator({ scenario: 'happy_path' });
    const ctx = context('collision-key');
    await adapter.submitOrder!(ctx, order);
    await expect(adapter.submitOrder!(ctx, { ...order, quantity: 3 })).resolves.toMatchObject({ ok: false, errorClass: 'PERMANENT_REJECTION', message: 'simulator idempotency collision' });
  });

  it('can emit duplicate acknowledgement/tracking evidence for replay validation', async () => {
    const adapter = createSupplierSimulator({ scenario: 'duplicate_acknowledgement' });
    const tracking = await adapter.getTracking!(context(), 'SIM-ORDER-1');
    expect(tracking).toMatchObject({ ok: true });
    if (!tracking.ok) throw new Error('expected simulator tracking');
    expect(tracking.data).toHaveLength(2);
    expect(tracking.data[0]).toEqual(tracking.data[1]);
  });

  it('simulates partial fulfilment as limited supplier evidence', async () => {
    const adapter = createSupplierSimulator({ scenario: 'partial_fulfilment' });
    await expect(adapter.getStock!(context(), ['SIM-VARIANT-1'])).resolves.toMatchObject({ ok: true, data: [{ quantity: 1, availability: 'limited' }] });
    expect(adapter.diagnostics().partialFulfilment).toBe(true);
  });

  it('simulates dispatch, delivery and lost shipment tracking states', async () => {
    for (const [scenario, terminal] of [['dispatch','dispatched'],['delivery','delivered'],['lost_shipment','lost']] as const) {
      const adapter = createSupplierSimulator({ scenario });
      const result = await adapter.getTracking!(context(), 'SIM-ORDER-1');
      if (!result.ok) throw new Error('expected simulator tracking');
      expect(result.data.at(-1)?.status).toBe(terminal);
    }
  });

  it('simulates cancellation, return and reimbursement', async () => {
    await expect(createSupplierSimulator({ scenario: 'cancellation' }).cancelOrder!(context(), 'SIM-ORDER-1')).resolves.toMatchObject({ ok: true, data: { cancelled: true } });
    await expect(createSupplierSimulator({ scenario: 'return' }).requestReturn!(context(), 'SIM-ORDER-1', 'buyer_return')).resolves.toMatchObject({ ok: true, data: { returnRef: 'SIM-RETURN-1' } });
    await expect(createSupplierSimulator({ scenario: 'reimbursement' }).getReimbursement!(context(), 'SIM-ORDER-1')).resolves.toMatchObject({ ok: true, data: { amountMinor: 1000, currency: 'GBP', state: 'reimbursed' } });
  });

  it('models refund as a required platform action, not a fake supplier-adapter refund capability', () => {
    const adapter = createSupplierSimulator({ scenario: 'refund' });
    expect(adapter.diagnostics().customerRefundRequired).toBe(true);
    expect(adapter.capabilities).not.toContain('refund');
  });

  it('stores simulator-only validation evidence separately from canonical commerce truth', () => {
    expect(foundation).toContain("environment text NOT NULL DEFAULT 'simulator'");
    expect(foundation).toContain("CHECK (environment='simulator')");
    expect(foundation).toContain('does not enable Supplier Commerce');
    expect(foundation).not.toContain('UPDATE public.orders');
    expect(foundation).not.toContain('UPDATE public.payment_sessions');
  });

  it('records explicit replay classes for supplier submit acknowledgement tracking refund recovery webhook sync and reconciliation', () => {
    for (const replayClass of ['supplier_submit','acknowledgement','tracking','refund','supplier_recovery','webhook','sync','reconciliation']) {
      expect(foundation).toContain(`'${replayClass}'`);
    }
  });

  it('makes simulator checks and replay evidence append-only', () => {
    expect(closure).toContain('supplier simulator validation history is append-only');
    expect(closure).toContain('trg_guard_supplier_simulator_checks_immutable_v1');
    expect(closure).toContain('trg_guard_supplier_replay_evidence_immutable_v1');
  });

  it('prevents a fake simulator PASS when required checks are missing or failures exist', () => {
    expect(closure).toContain('required_simulator_checks_missing');
    expect(closure).toContain('simulator_failure_evidence_present');
    for (const check of ['stock_zero','price_change','timeout','provider_500','duplicate_acknowledgement','lost_response_after_accept','partial_fulfilment','tracking_replay','lost_shipment','cancellation','return','refund','reimbursement','kill_switch','idempotency_collision']) {
      expect(foundation).toContain(`'${check}'`);
    }
  });

  it('requires lost-response recovery and collision blocking before PASS', () => {
    expect(closure).toContain("e.replay_class='supplier_submit' AND e.result='recovered'");
    expect(closure).toContain("e.result='blocked_collision'");
    expect(closure).toContain('lost_response_recovery_not_proven');
    expect(closure).toContain('idempotency_collision_block_not_proven');
  });

  it('requires canonical acknowledgement tracking refund and supplier recovery replay proof', () => {
    expect(closure).toContain("e.replay_class IN ('acknowledgement','tracking','refund','supplier_recovery')");
    expect(closure).toContain('count(DISTINCT e.replay_class)=4');
    expect(closure).toContain('canonical_replay_classes_not_proven');
  });

  it('keeps simulator PASS explicitly distinct from Pilot PASS', () => {
    expect(contract).toContain('SIMULATOR PASS');
    expect(contract).toContain('≠ PILOT PASS');
    expect(closure).toContain("'simulatorPassIsNotPilotPass',true");
  });

  it('keeps validation tables private and completion active-admin-only', () => {
    expect(foundation.match(/REVOKE ALL ON TABLE private\./g)?.length).toBeGreaterThanOrEqual(3);
    expect(closure).toContain('require_active_admin_v1(p_actor_id)');
    expect(foundation).toContain('require_active_admin_v1(p_actor_id)');
  });

  it('does not silently claim backup restore PASS from simulator/replay validation', () => {
    expect(contract).toContain('BACKUP EXISTS');
    expect(contract).toContain('RESTORE PASS');
    expect(foundation).not.toContain('restore_pass');
    expect(closure).not.toContain('restore_pass');
  });
});
