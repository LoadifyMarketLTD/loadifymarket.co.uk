import { describe, expect, it } from 'vitest';
import {
  createSupplierHealthException,
  evaluateSupplierHealth,
  type SupplierHealthInput,
} from '../_shared/supplierHealth';

const input = (overrides: Partial<SupplierHealthInput> = {}): SupplierHealthInput => ({
  supplierKey: 'supplier-001',
  providerRef: 'provider-a',
  windowStart: '2026-08-25T00:00:00.000Z',
  windowEnd: '2026-09-01T00:00:00.000Z',
  consecutiveSyncFailures: 0,
  operations: {
    total: 100,
    retryableFailures: 0,
    permanentRejections: 0,
    authConfigurationFailures: 0,
    rateLimited: 0,
    unknownOutcomes: 0,
  },
  price: { observations: 100, anomalies: 0 },
  freshness: { observations: 100, stale: 0 },
  fulfilment: { orders: 50, failures: 0, cancellations: 0 },
  tracking: { shipments: 50, exceptions: 0 },
  reconciliation: { attempts: 50, failures: 0 },
  ...overrides,
});

describe('supplier health', () => {
  it('classifies sufficiently evidenced clean supplier operations as healthy', () => {
    const result = evaluateSupplierHealth(input());

    expect(result.status).toBe('healthy');
    expect(result.healthScore).toBe(100);
    expect(result.recommendedAction).toBe('normal_caps');
    expect(result.automaticExternalMutationAllowed).toBe(false);
    expect(result.automaticControlMutationAllowed).toBe(false);
    expect(result.paymentMutationAllowed).toBe(false);
  });

  it('keeps a small sample in observe-only mode', () => {
    const result = evaluateSupplierHealth(input({
      operations: {
        total: 5,
        retryableFailures: 0,
        permanentRejections: 0,
        authConfigurationFailures: 0,
        rateLimited: 0,
        unknownOutcomes: 0,
      },
      price: { observations: 3, anomalies: 0 },
      freshness: { observations: 3, stale: 0 },
      fulfilment: { orders: 0, failures: 0, cancellations: 0 },
      tracking: { shipments: 0, exceptions: 0 },
      reconciliation: { attempts: 0, failures: 0 },
    }));

    expect(result.status).toBe('insufficient_evidence');
    expect(result.recommendedAction).toBe('observe_only');
    expect(result.reasons).toContain('minimum_evidence_not_met:11/20');
  });

  it('recommends reduced caps for a degraded but deterministic freshness signal', () => {
    const result = evaluateSupplierHealth(input({
      operations: {
        total: 0,
        retryableFailures: 0,
        permanentRejections: 0,
        authConfigurationFailures: 0,
        rateLimited: 0,
        unknownOutcomes: 0,
      },
      price: { observations: 0, anomalies: 0 },
      freshness: { observations: 20, stale: 6 },
      fulfilment: { orders: 0, failures: 0, cancellations: 0 },
      tracking: { shipments: 0, exceptions: 0 },
      reconciliation: { attempts: 0, failures: 0 },
    }));

    expect(result.healthScore).toBe(70);
    expect(result.status).toBe('degraded');
    expect(result.recommendedAction).toBe('reduce_caps');
    expect(result.reasons).toContain('stale_supplier_evidence_observed');
  });

  it('treats unknown provider outcomes as high risk even when the aggregate score remains high', () => {
    const result = evaluateSupplierHealth(input({
      operations: {
        total: 100,
        retryableFailures: 0,
        permanentRejections: 0,
        authConfigurationFailures: 0,
        rateLimited: 0,
        unknownOutcomes: 1,
      },
    }));

    expect(result.status).toBe('high_risk');
    expect(result.recommendedAction).toBe('human_approval');
    expect(result.reasons).toContain('unknown_outcome_observed');
  });

  it('recommends a kill switch after five consecutive sync failures without executing it', () => {
    const result = evaluateSupplierHealth(input({ consecutiveSyncFailures: 5 }));

    expect(result.status).toBe('critical');
    expect(result.recommendedAction).toBe('kill_switch_recommended');
    expect(result.automaticControlMutationAllowed).toBe(false);
    expect(result.reasons).toContain('consecutive_sync_failures:5');
  });

  it('does not double-count cancellations that are already part of fulfilment failures', () => {
    const result = evaluateSupplierHealth(input({
      fulfilment: { orders: 10, failures: 2, cancellations: 2 },
    }));
    const component = result.components.find(row => row.key === 'fulfilment');

    expect(component?.failures).toBe(2);
    expect(component?.score).toBe(80);
  });

  it('creates an escalated exception for high-risk health without enabling automatic control actions', () => {
    const decision = evaluateSupplierHealth(input({
      operations: {
        total: 100,
        retryableFailures: 0,
        permanentRejections: 0,
        authConfigurationFailures: 0,
        rateLimited: 0,
        unknownOutcomes: 1,
      },
    }));

    const exception = createSupplierHealthException({
      exceptionId: 'supplier-health:supplier-001:2026-09-01',
      correlationId: '11111111-1111-4111-8111-111111111111',
      decision,
      evidenceRefs: ['supplier-operations-window:2026-08-25/2026-09-01'],
      createdAt: new Date('2026-09-01T08:00:00.000Z'),
    });

    expect(exception?.severity).toBe('high');
    expect(exception?.escalationRequired).toBe(true);
    expect(exception?.recommendedAction).toBe('human_approval');
    expect(exception?.allowedAutomatedActions).toEqual([]);
  });

  it('fails closed on impossible aggregate counts', () => {
    expect(() => evaluateSupplierHealth(input({
      operations: {
        total: 1,
        retryableFailures: 1,
        permanentRejections: 1,
        authConfigurationFailures: 0,
        rateLimited: 0,
        unknownOutcomes: 0,
      },
    }))).toThrow(/api_reliability.failures cannot exceed samples/);
  });
});
