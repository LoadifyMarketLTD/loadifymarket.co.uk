import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import {
  SUPPLIER_ORDER_ORCHESTRATOR_INTERFACE_VERSION,
  assessSupplierCommerceRisk,
  reserveSupplierOffer,
  releaseSupplierReservation,
} from '../_shared/supplierOrderOrchestrator';

const repo = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const foundation = repo('supabase/634_supplier_order_orchestrator_risk_reservation.sql');
const runtime = repo('supabase/635_supplier_order_orchestrator_runtime_guards.sql');
const governance = repo('supabase/636_supplier_order_risk_admin_governance.sql');
const audit = repo('supabase/637_supplier_order_orchestration_audit_closure.sql');
const helper = repo('netlify/functions/_shared/supplierOrderOrchestrator.ts');
const adminApi = repo('netlify/functions/admin-supplier-order-orchestration.ts');

const ORDER = '11111111-1111-4111-8111-111111111111';
const ITEM = '22222222-2222-4222-8222-222222222222';
const OFFER = '33333333-3333-4333-8333-333333333333';
const CORRELATION = '44444444-4444-4444-8444-444444444444';

describe('Phase I Order Orchestrator + Commerce Risk + Reservation', () => {
  it('keeps the existing public order as the single customer-order truth', () => {
    expect(foundation).toContain('order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id)');
    expect(foundation).toContain('order_item_id uuid NOT NULL UNIQUE REFERENCES public.order_items(id)');
    expect(foundation).toContain('not a parallel buyer order');
    expect(foundation).not.toContain('CREATE TABLE IF NOT EXISTS public.supplier_orders');
  });

  it('models multiple internal fulfilment legs under one customer order', () => {
    expect(foundation).toContain('private.supplier_fulfilment_legs');
    expect(foundation).toContain("fulfiller_type IN ('marketplace_seller','loadify_direct','supplier')");
    expect(foundation).toContain("commercial_mode IN ('marketplace_seller','loadify_supplier_fulfilled','loadify_direct')");
    expect(runtime).toContain('fulfilment leg item must belong to the same canonical customer order');
  });

  it('keeps supplier fulfilment identity tied to canonical supplier offers and products', () => {
    expect(foundation).toContain('supplier_offer_id uuid REFERENCES private.supplier_offers(id)');
    expect(runtime).toContain('fulfilment item canonical product must match supplier offer');
    expect(runtime).toContain('supplier_offer_id<>p_supplier_offer_id');
  });

  it('implements a separate commerce risk layer with the five canonical actions', () => {
    expect(foundation).toContain("action IN ('ALLOW','REVIEW','HOLD','RESTRICT','BLOCK')");
    expect(runtime).toContain("WHEN v_score>=v_policy.block_score THEN 'BLOCK'");
    expect(runtime).toContain("WHEN v_score>=v_policy.restrict_score THEN 'RESTRICT'");
    expect(runtime).toContain("WHEN v_score>=v_policy.hold_score THEN 'HOLD'");
    expect(runtime).toContain("WHEN v_score>=v_policy.review_score THEN 'REVIEW'");
    expect(runtime).toContain("ELSE 'ALLOW'");
  });

  it('supports buyer, supplier, order and platform risk subjects independently from compliance', () => {
    expect(foundation).toContain("subject_type IN ('buyer','supplier','order','platform')");
    expect(helper).toContain("export type CommerceRiskSubject = 'buyer' | 'supplier' | 'order' | 'platform'");
    expect(helper).toContain('server_supplier_commerce_risk_decision_v1');
  });

  it('does not automatically ban accounts as a side effect of a risk decision', () => {
    expect(foundation).toContain('Risk action does not itself ban an account');
    expect(runtime).toContain('It never bans accounts by itself');
    expect(runtime).not.toContain('UPDATE public.users SET');
    expect(runtime).not.toContain("lifecycle_status='banned'");
  });

  it('makes risk history append-only and policy driven', () => {
    expect(foundation).toContain('private.supplier_commerce_risk_policy_versions');
    expect(foundation).toContain('private.supplier_commerce_risk_assessments');
    expect(runtime).toContain('commerce risk assessments are append-only');
    expect(governance).toContain('approved risk policy is immutable; retire and create a new version');
  });

  it('rejects secret-bearing risk signals and governance payloads', () => {
    expect(runtime).toContain('secret_bearing_risk_payload_rejected');
    expect(governance).toContain('secret-bearing risk policy payload rejected');
    expect(adminApi).toContain('password|secret|access[_-]?token');
  });

  it('uses the Phase C reservation kill switch before creating supplier reservations', () => {
    expect(runtime).toContain("server_supplier_commerce_control_decision_v1('reservation'");
    expect(runtime).toContain("'reservation_control_disabled'");
    expect(foundation).toContain('This migration enables no control');
  });

  it('requires fresh Phase H stock/price evidence before reservation', () => {
    expect(runtime).toContain('server_supplier_stock_price_decision_v1');
    expect(runtime).toContain("'stock_price_not_ready'");
    expect(runtime).toContain("'sellable_quantity_unknown'");
    expect(foundation).toContain('stock_observation_id uuid NOT NULL REFERENCES private.supplier_stock_observations');
    expect(foundation).toContain('price_observation_id uuid NOT NULL REFERENCES private.supplier_price_observations');
    expect(foundation).toContain('pricing_snapshot_id uuid NOT NULL REFERENCES private.supplier_pricing_snapshots');
  });

  it('subtracts active reservations from Phase H sellable stock and serialises by offer lock', () => {
    expect(runtime).toContain('FOR UPDATE');
    expect(runtime).toContain('SUM(r.quantity)');
    expect(runtime).toContain("r.status='active'");
    expect(runtime).toContain('v_available:=GREATEST(v_sellable-v_already_reserved,0)');
    expect(runtime).toContain("'reservation_capacity_exhausted'");
  });

  it('requires idempotency and protects duplicate order, risk and reservation creation', () => {
    expect(foundation).toContain('idempotency_key text NOT NULL UNIQUE');
    expect(foundation).toContain('reservation_key text NOT NULL UNIQUE');
    expect(runtime).toContain('risk idempotency key collision with different evidence');
    expect(runtime).toContain('reservation idempotency key collision with different request');
    expect(runtime).toContain('order orchestration idempotency mismatch');
  });

  it('supports reservation release and expiry without rewriting public order history', () => {
    expect(runtime).toContain('server_release_supplier_reservation_v1');
    expect(governance).toContain('server_expire_supplier_reservations_v1');
    expect(governance).toContain('does not modify public customer order history');
    expect(governance).not.toContain('UPDATE public.orders');
  });

  it('records append-only orchestration and reservation lifecycle audit evidence', () => {
    expect(audit).toContain('private.supplier_order_orchestration_events');
    expect(audit).toContain('supplier order orchestration events are append-only');
    expect(audit).toContain("'reservation_created'");
    expect(audit).toContain("'reservation_released'");
    expect(audit).toContain("'reservation_expired'");
    expect(audit).toContain("'orchestration_state_changed'");
  });

  it('keeps Phase I private storage server-only and admin governance active-admin-only', () => {
    for (const table of [
      'supplier_order_orchestrations',
      'supplier_fulfilment_legs',
      'supplier_fulfilment_leg_items',
      'supplier_commerce_risk_policy_versions',
      'supplier_commerce_risk_assessments',
      'supplier_stock_reservations',
    ]) {
      expect(foundation).toContain(`REVOKE ALL ON TABLE private.${table} FROM PUBLIC, anon, authenticated, service_role`);
    }
    expect(audit).toContain('REVOKE ALL ON TABLE private.supplier_order_orchestration_events FROM PUBLIC, anon, authenticated, service_role');
    expect(governance).toContain("u.role='admin'");
    expect(governance).toContain('u."isActive"=true');
    expect(adminApi).toContain("authenticateActiveAccount(event, admin, ['admin'])");
  });

  it('fails closed when generic commerce-risk evidence is unavailable', async () => {
    const rpc = vi.fn(async () => ({ data: { eligible: true }, error: null }));
    const client = { rpc } as unknown as SupabaseClient;
    await expect(assessSupplierCommerceRisk(client, {
      orderId: ORDER,
      subjectType: 'buyer',
      subjectRef: 'buyer-1',
      signals: { paymentFraudScore: 50 },
      idempotencyKey: 'risk-1',
    })).resolves.toEqual({
      eligible: false,
      reason: 'commerce_risk_unavailable',
      interfaceVersion: 1,
    });
  });

  it('accepts a structurally complete ALLOW risk decision from the server boundary', async () => {
    const expected = {
      eligible: true,
      reason: 'policy_score_allow',
      action: 'ALLOW' as const,
      riskScore: 12,
      assessmentId: '88888888-8888-4888-8888-888888888888',
      policyId: '99999999-9999-4999-8999-999999999999',
      policyVersion: 3,
      interfaceVersion: 1 as const,
    };
    const rpc = vi.fn(async () => ({ data: expected, error: null }));
    const client = { rpc } as unknown as SupabaseClient;
    await expect(assessSupplierCommerceRisk(client, {
      orderId: ORDER,
      subjectType: 'platform',
      subjectRef: 'checkout:1',
      signals: { duplicateOrder: false, reconciliationMismatch: false, anomalyScore: 12 },
      idempotencyKey: 'risk-2',
    })).resolves.toEqual(expected);
  });

  it('fails closed when reservation RPC evidence is unavailable or malformed', async () => {
    const rpc = vi.fn(async () => ({ data: { eligible: true }, error: null }));
    const client = { rpc } as unknown as SupabaseClient;
    await expect(reserveSupplierOffer(client, {
      orderId: ORDER,
      orderItemId: ITEM,
      supplierOfferId: OFFER,
      commercialMode: 'loadify_supplier_fulfilled',
      quantity: 1,
      reservationKey: 'res-1',
      orchestrationIdempotencyKey: 'orch-1',
      correlationId: CORRELATION,
    })).resolves.toEqual({
      eligible: false,
      reason: 'supplier_reservation_unavailable',
      interfaceVersion: SUPPLIER_ORDER_ORCHESTRATOR_INTERFACE_VERSION,
    });
  });

  it('accepts structurally complete reservation evidence from the server boundary', async () => {
    const expected = {
      eligible: true,
      reason: 'supplier_stock_reserved',
      orchestrationId: '55555555-5555-4555-8555-555555555555',
      fulfilmentLegId: '66666666-6666-4666-8666-666666666666',
      reservationId: '77777777-7777-4777-8777-777777777777',
      expiresAt: '2026-08-21T10:00:00.000Z',
      reservedQuantity: 1,
      availableBeforeReservation: 5,
      interfaceVersion: 1 as const,
    };
    const rpc = vi.fn(async () => ({ data: expected, error: null }));
    const client = { rpc } as unknown as SupabaseClient;
    await expect(reserveSupplierOffer(client, {
      orderId: ORDER,
      orderItemId: ITEM,
      supplierOfferId: OFFER,
      commercialMode: 'loadify_supplier_fulfilled',
      quantity: 1,
      reservationKey: 'res-1',
      orchestrationIdempotencyKey: 'orch-1',
      correlationId: CORRELATION,
    })).resolves.toEqual(expected);
  });

  it('fails closed when reservation release evidence is unavailable', async () => {
    const rpc = vi.fn(async () => ({ data: null, error: new Error('db unavailable') }));
    const client = { rpc } as unknown as SupabaseClient;
    await expect(releaseSupplierReservation(client, 'res-1', 'checkout cancelled')).resolves.toEqual({
      ok: false,
      reason: 'supplier_reservation_release_unavailable',
      interfaceVersion: 1,
    });
  });

  it('keeps the payment-to-supplier handshake deferred to Phase J', () => {
    expect(foundation).not.toContain('stripePaymentIntent');
    expect(runtime).not.toContain('supplier acknowledgement');
    expect(runtime).not.toContain('external supplier order ID');
    expect(helper).not.toContain('submitOrder');
  });
});
