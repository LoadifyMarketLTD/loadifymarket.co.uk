import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { deriveSupplierHealthFromControlCentre } from '../_shared/supplierHealthSnapshot';

const operation = (
  index: number,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> => ({
  operation: 'stock_price_sync',
  result_class: 'SUCCESS',
  error_class: null,
  recovery_state: 'resolved',
  provider_ref: 'provider-a',
  supplier_ref: 'supplier-001',
  created_at: new Date(Date.parse('2026-09-01T08:00:00.000Z') - index * 60_000).toISOString(),
  ...overrides,
});

const controlCentre = (recentOperations: unknown[]): Record<string, unknown> => ({
  supplier: {
    id: '11111111-1111-4111-8111-111111111111',
    supplier_key: 'supplier-001',
  },
  recentOperations,
  interfaceVersion: 1,
});

describe('Supplier Health Control Centre snapshot', () => {
  it('derives a healthy snapshot from structured provider operations', () => {
    const rows = [
      ...Array.from({ length: 30 }, (_, index) => operation(index)),
      ...Array.from({ length: 10 }, (_, index) => operation(index + 30, { operation: 'supplier_order' })),
      ...Array.from({ length: 10 }, (_, index) => operation(index + 40, { operation: 'tracking_ingest' })),
    ];

    const result = deriveSupplierHealthFromControlCentre({
      result: controlCentre(rows),
      now: new Date('2026-09-01T08:05:00.000Z'),
    });

    expect(result?.status).toBe('healthy');
    expect(result?.recommendedAction).toBe('normal_caps');
    expect(result?.providerRef).toBe('provider-a');
    expect(result?.automaticControlMutationAllowed).toBe(false);
  });

  it('routes an unknown provider outcome to high risk and counts consecutive sync failures', () => {
    const rows = [
      operation(0, { result_class: 'UNKNOWN_OUTCOME', error_class: 'UNKNOWN_OUTCOME' }),
      ...Array.from({ length: 30 }, (_, index) => operation(index + 1)),
    ];

    const result = deriveSupplierHealthFromControlCentre({
      result: controlCentre(rows),
      now: new Date('2026-09-01T08:05:00.000Z'),
    });

    expect(result?.status).toBe('high_risk');
    expect(result?.recommendedAction).toBe('human_approval');
    expect(result?.reasons).toContain('unknown_outcome_observed');
    expect(result?.reasons).toContain('consecutive_sync_failures:1');
  });

  it('does not penalise a supplier for operations blocked by Loadify control', () => {
    const rows = [
      ...Array.from({ length: 25 }, (_, index) => operation(index)),
      operation(30, { result_class: 'BLOCKED_BY_CONTROL' }),
      operation(31, { result_class: 'MANUAL_REVIEW_REQUIRED' }),
    ];

    const result = deriveSupplierHealthFromControlCentre({
      result: controlCentre(rows),
      now: new Date('2026-09-01T08:05:00.000Z'),
    });
    const api = result?.components.find(row => row.key === 'api_reliability');

    expect(api?.samples).toBe(25);
    expect(api?.failures).toBe(0);
  });

  it('leaves unavailable reconciliation evidence unknown instead of assuming success', () => {
    const rows = Array.from({ length: 25 }, (_, index) => operation(index));
    const result = deriveSupplierHealthFromControlCentre({
      result: controlCentre(rows),
      now: new Date('2026-09-01T08:05:00.000Z'),
    });
    const reconciliation = result?.components.find(row => row.key === 'reconciliation');

    expect(reconciliation?.samples).toBe(0);
    expect(reconciliation?.score).toBeNull();
  });

  it('requires a resolved supplier scope', () => {
    expect(deriveSupplierHealthFromControlCentre({
      result: { supplier: null, recentOperations: [] },
      now: new Date('2026-09-01T08:05:00.000Z'),
    })).toBeNull();
  });

  it('deploys health and control centre through modern runtime with active-admin auth', () => {
    const healthWrapper = readFileSync(resolve(process.cwd(), 'netlify/functions-modern/admin-supplier-health.ts'), 'utf8');
    const controlWrapper = readFileSync(resolve(process.cwd(), 'netlify/functions-modern/admin-supplier-control-centre.ts'), 'utf8');
    const healthEndpoint = readFileSync(resolve(process.cwd(), 'netlify/functions/admin-supplier-health.ts'), 'utf8');
    const controlEndpoint = readFileSync(resolve(process.cwd(), 'netlify/functions/admin-supplier-control-centre.ts'), 'utf8');

    expect(healthWrapper).toContain("../functions/admin-supplier-health");
    expect(controlWrapper).toContain("../functions/admin-supplier-control-centre");
    expect(healthEndpoint).toContain("authenticateActiveAccount(event, admin, ['admin'])");
    expect(controlEndpoint).toContain("authenticateActiveAccount(event, admin, ['admin'])");
    expect(healthEndpoint).toContain('controlMutationPerformed: false');
    expect(healthEndpoint).toContain('externalMutationPerformed: false');
  });
});
