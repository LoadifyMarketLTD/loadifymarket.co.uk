import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveAutonomousSupplierCommercePolicy } from '../_shared/autonomousSupplierCommercePolicy';
import { evaluateSupplierFeedBatch } from '../_shared/supplierFeedBatchAutomation';
import { buildCustomerOrderSupportAnswer } from '../_shared/customerOrderSupport';
import { evaluateCustomerReturnAutomation } from '../_shared/customerReturnAutomation';
import { evaluateShipmentStall } from '../_shared/shipmentStallAutomation';

const repo = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('Autonomous Supplier Commerce Engine', () => {
  it('is completely inert by default and can never enable commercial high-risk actions', () => {
    expect(resolveAutonomousSupplierCommercePolicy({})).toEqual({
      policyVersion: 1,
      mode: 'disabled',
      enabled: false,
      providerReadsAllowed: false,
      observationWritesAllowed: false,
      proactiveCustomerNotificationsAllowed: false,
      carrierCaseCreationAllowed: false,
      returnLabelRequestsAllowed: false,
      supplierOrderSubmissionAllowed: false,
      customerPiiDisclosureAllowed: false,
      marketplacePublicationAllowed: false,
      capabilityPromotionAllowed: false,
      paymentMutationAllowed: false,
      automaticRefundExecutionAllowed: false,
    });
  });

  it('requires separate flags even in read-only autonomous mode', () => {
    const policy = resolveAutonomousSupplierCommercePolicy({
      AUTONOMOUS_SUPPLIER_COMMERCE_ENABLED: 'true',
      AUTONOMOUS_SUPPLIER_COMMERCE_MODE: 'read_only',
      AUTONOMOUS_SUPPLIER_PROVIDER_READS_ENABLED: 'true',
      AUTONOMOUS_SUPPLIER_OBSERVATION_WRITES_ENABLED: 'true',
    });
    expect(policy.providerReadsAllowed).toBe(true);
    expect(policy.observationWritesAllowed).toBe(true);
    expect(policy.supplierOrderSubmissionAllowed).toBe(false);
    expect(policy.customerPiiDisclosureAllowed).toBe(false);
    expect(policy.marketplacePublicationAllowed).toBe(false);
    expect(policy.paymentMutationAllowed).toBe(false);
  });

  it('allows a safe batch only into staging and never into public sellability', () => {
    const result = evaluateSupplierFeedBatch([
      {
        externalVariantRef: 'SKU-1',
        previous: { amountMinor: 1000, stockQuantity: 10 },
        current: { amountMinor: 950, stockQuantity: 8 },
      },
    ]);
    expect(result.decision).toBe('allow_staging');
    expect(result.acceptedForStaging).toBe(1);
    expect(result.publicSellabilityAllowed).toBe(false);
    expect(result.marketplacePublicationAllowed).toBe(false);
    expect(result.capabilityPromotionAllowed).toBe(false);
  });

  it('quarantines a major price drift and fails closed on zero stock', () => {
    const result = evaluateSupplierFeedBatch([
      {
        externalVariantRef: 'SKU-PRICE',
        previous: { amountMinor: 1000, stockQuantity: 5 },
        current: { amountMinor: 400, stockQuantity: 5 },
      },
      {
        externalVariantRef: 'SKU-STOCK',
        previous: { amountMinor: 1000, stockQuantity: 5 },
        current: { amountMinor: 1000, stockQuantity: 0 },
      },
    ]);
    expect(result.decision).toBe('fail_closed_inactive');
    expect(result.quarantined).toBe(1);
    expect(result.failClosed).toBe(1);
  });

  it('rejects duplicate variant identities inside one feed batch', () => {
    expect(() => evaluateSupplierFeedBatch([
      { externalVariantRef: 'SKU-1', current: { amountMinor: 100, stockQuantity: 1 } },
      { externalVariantRef: 'SKU-1', current: { amountMinor: 100, stockQuantity: 1 } },
    ])).toThrow(/duplicate supplier feed variant/);
  });

  it('builds WISMO answers only from grounded tracking facts', () => {
    const result = buildCustomerOrderSupportAnswer({
      order: { orderNumber: 'ORD-1', status: 'shipped', createdAt: '2026-08-25T10:00:00.000Z' },
      shipment: {
        status: 'In Transit',
        courierName: 'Carrier A',
        trackingNumber: 'TRACK-1',
        createdAt: '2026-08-26T10:00:00.000Z',
        updatedAt: '2026-08-31T10:00:00.000Z',
      },
      events: [{ status: 'In Transit', created_at: '2026-08-31T10:00:00.000Z' }],
      now: new Date('2026-08-31T12:00:00.000Z'),
    });
    expect(result.state).toBe('in_transit');
    expect(result.answer).toContain('according to the latest recorded shipment status');
    expect(result.groundedFacts).toContain('Tracking reference: TRACK-1');
    expect(result.needsHumanEscalation).toBe(false);
  });

  it('escalates a shipment with no recorded update for 48 hours', () => {
    const result = buildCustomerOrderSupportAnswer({
      order: { orderNumber: 'ORD-2', status: 'shipped', createdAt: '2026-08-20T10:00:00.000Z' },
      shipment: { status: 'In Transit', updatedAt: '2026-08-28T10:00:00.000Z' },
      events: [],
      now: new Date('2026-08-31T10:00:00.000Z'),
    });
    expect(result.state).toBe('delivery_stalled');
    expect(result.needsHumanEscalation).toBe(true);
  });

  it('keeps customer refunds pending receipt and never executes payment mutations', () => {
    const result = evaluateCustomerReturnAutomation({
      orderStatus: 'delivered',
      deliveredAt: '2026-08-25T10:00:00.000Z',
      requestedAt: new Date('2026-08-31T10:00:00.000Z'),
      purchasedQuantity: 2,
      requestedQuantity: 1,
      reasonCode: 'changed_mind',
      supplierReturnCapability: true,
      carrierLabelCapability: true,
    });
    expect(result.decision).toBe('eligible_for_return_request');
    expect(result.returnLabelRequestAllowed).toBe(true);
    expect(result.refundState).toBe('pending_receipt');
    expect(result.automaticRefundExecutionAllowed).toBe(false);
    expect(result.paymentMutationAllowed).toBe(false);
  });

  it('routes returns to manual review when provider return capability is unavailable', () => {
    const result = evaluateCustomerReturnAutomation({
      orderStatus: 'delivered',
      deliveredAt: '2026-08-30T10:00:00.000Z',
      requestedAt: new Date('2026-08-31T10:00:00.000Z'),
      purchasedQuantity: 1,
      requestedQuantity: 1,
      reasonCode: 'damaged',
      supplierReturnCapability: false,
      carrierLabelCapability: false,
    });
    expect(result.decision).toBe('manual_review');
    expect(result.reason).toBe('supplier_return_capability_unavailable');
    expect(result.supplierReturnRequestAllowed).toBe(false);
  });

  it('detects a 48-hour shipment stall without performing the external mutation itself', () => {
    const result = evaluateShipmentStall({
      shipmentStatus: 'In Transit',
      shipmentCreatedAt: '2026-08-25T00:00:00.000Z',
      latestEventAt: '2026-08-28T00:00:00.000Z',
      now: new Date('2026-08-31T00:00:00.000Z'),
    });
    expect(result.stalled).toBe(true);
    expect(result.shouldCreateCarrierCase).toBe(true);
    expect(result.shouldNotifyCustomer).toBe(true);
    expect(result.externalMutationPerformed).toBe(false);
  });

  it('binds the customer support endpoint to the authenticated account buyerId', () => {
    const endpoint = repo('netlify/functions/customer-order-assistant.ts');
    expect(endpoint).toContain('authenticateActiveAccount(event, admin)');
    expect(endpoint).toContain(".eq('buyerId', auth.actor.id)");
    expect(endpoint).not.toContain('buyerEmailSnapshot');
    expect(endpoint).not.toContain('SUPABASE_SERVICE_ROLE_KEY!');
  });
});
