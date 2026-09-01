import { describe, expect, it } from 'vitest';
import {
  buildCustomerOperationsExceptionQueue,
  createReturnException,
  createShipmentStallException,
  createWismoException,
} from '../_shared/customerOperationsExceptionQueue';

const CREATED = new Date('2026-09-01T10:00:00.000Z');

describe('customer operations exception queue', () => {
  it('creates a shipment exception without authorising an external action', () => {
    const exception = createShipmentStallException({
      exceptionId: 'ex-shipment-1',
      correlationId: 'corr-shipment-1',
      shipmentId: 'shipment-1',
      orderId: 'order-1',
      decision: {
        interfaceVersion: 1,
        stalled: true,
        reason: 'shipment_scan_stalled',
        latestObservedAt: '2026-08-29T09:00:00.000Z',
        ageHours: 73,
        shouldCreateCarrierCase: true,
        shouldNotifyCustomer: true,
        externalMutationPerformed: false,
      },
      evidenceRefs: ['shipment:shipment-1', 'tracking:last-event'],
      createdAt: CREATED,
    });

    expect(exception).not.toBeNull();
    expect(exception?.category).toBe('shipment');
    expect(exception?.allowedAutomatedActions).toEqual([]);
    expect(exception?.recommendedAction).toBe('investigate_and_consider_carrier_case');
  });

  it('creates WISMO and return exceptions only when human review is required', () => {
    const wismo = createWismoException({
      exceptionId: 'ex-order-1',
      correlationId: 'corr-order-1',
      orderId: 'order-1',
      answer: {
        interfaceVersion: 1,
        state: 'unknown',
        answer: 'Not enough verified tracking information.',
        groundedFacts: ['Order A status: Processing'],
        needsHumanEscalation: true,
        latestObservedAt: '2026-09-01T09:00:00.000Z',
        trackingNumber: null,
        courierName: null,
      },
      evidenceRefs: ['order:order-1'],
      createdAt: CREATED,
    });
    expect(wismo?.category).toBe('order');

    const returnException = createReturnException({
      exceptionId: 'ex-return-1',
      correlationId: 'corr-return-1',
      orderId: 'order-1',
      orderItemId: 'item-1',
      result: {
        interfaceVersion: 1,
        decision: 'manual_review',
        reason: 'supplier_return_capability_unavailable',
        supplierReturnRequestAllowed: false,
        returnLabelRequestAllowed: false,
        refundState: 'pending_receipt',
        automaticRefundExecutionAllowed: false,
        paymentMutationAllowed: false,
      },
      evidenceRefs: ['order-item:item-1'],
      createdAt: CREATED,
    });
    expect(returnException?.category).toBe('return');

    const noException = createReturnException({
      exceptionId: 'ex-return-2',
      correlationId: 'corr-return-2',
      orderId: 'order-2',
      orderItemId: 'item-2',
      result: {
        interfaceVersion: 1,
        decision: 'ineligible',
        reason: 'return_window_expired',
        supplierReturnRequestAllowed: false,
        returnLabelRequestAllowed: false,
        refundState: 'not_started',
        automaticRefundExecutionAllowed: false,
        paymentMutationAllowed: false,
      },
      evidenceRefs: ['order-item:item-2'],
      createdAt: CREATED,
    });
    expect(noException).toBeNull();
  });

  it('orders operator work by severity then oldest first', () => {
    const mediumOld = createShipmentStallException({
      exceptionId: 'medium-old',
      correlationId: 'corr-1',
      shipmentId: 's1',
      orderId: 'o1',
      decision: {
        interfaceVersion: 1,
        stalled: true,
        reason: 'shipment_scan_stalled',
        latestObservedAt: '2026-08-30T10:00:00.000Z',
        ageHours: 60,
        shouldCreateCarrierCase: true,
        shouldNotifyCustomer: true,
        externalMutationPerformed: false,
      },
      evidenceRefs: ['shipment:s1'],
      createdAt: new Date('2026-09-01T08:00:00.000Z'),
    });
    const highNew = createShipmentStallException({
      exceptionId: 'high-new',
      correlationId: 'corr-2',
      shipmentId: 's2',
      orderId: 'o2',
      decision: {
        interfaceVersion: 1,
        stalled: true,
        reason: 'tracking_timestamp_unavailable',
        latestObservedAt: null,
        ageHours: null,
        shouldCreateCarrierCase: true,
        shouldNotifyCustomer: true,
        externalMutationPerformed: false,
      },
      evidenceRefs: ['shipment:s2'],
      createdAt: new Date('2026-09-01T09:00:00.000Z'),
    });

    const queue = buildCustomerOperationsExceptionQueue([mediumOld, highNew, null]);
    expect(queue.map(item => item.exceptionId)).toEqual(['high-new', 'medium-old']);
  });
});
