import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260921091538_supplier_projection_multi_offer_bindings.sql'),
  'utf8',
);

describe('supplier projection multi-offer contract', () => {
  it('creates an explicit governed many-offer binding instead of implicit substitution', () => {
    expect(migration).toContain('private.supplier_projection_offer_bindings');
    expect(migration).toContain("status IN ('candidate','approved','disabled')");
    expect(migration).toContain('fallback_allowed boolean NOT NULL DEFAULT true');
    expect(migration).toContain('supplier offer canonical product does not match projection');
    expect(migration).toContain('supplier offer territory does not match projection');
  });

  it('seeds the reviewed source offer as the initial approved fulfilment offer', () => {
    expect(migration).toContain('seed_supplier_projection_primary_offer_binding_v1');
    expect(migration).toContain("'Primary supplier offer approved with the reviewed marketplace projection'");
    expect(migration).toContain('Backfilled primary supplier offer from existing governed projection');
  });

  it('requires admin authority for adding or changing fulfilment offers', () => {
    expect(migration).toContain('server_admin_supplier_projection_offer_binding_v1');
    expect(migration).toContain("u.role='admin'");
    expect(migration).toContain('u."isActive"=true');
    expect(migration).toContain("v_action NOT IN ('bind','approve','disable')");
  });

  it('exposes candidate reads only to service role and only for published supplier-fulfilled projections', () => {
    expect(migration).toContain('server_supplier_projection_offer_candidates_v1');
    expect(migration).toContain("p.status='published'");
    expect(migration).toContain("p.commercial_mode='loadify_supplier_fulfilled'");
    expect(migration).toContain("b.status='approved'");
    expect(migration).toContain('FROM PUBLIC, anon, authenticated');
    expect(migration).toContain('TO service_role');
  });

  it('carries SLA and economics metrics needed for deterministic runtime selection', () => {
    expect(migration).toContain('dispatch_hours integer');
    expect(migration).toContain('return_window_days integer');
    expect(migration).toContain('tracking_deadline_hours integer');
    expect(migration).toContain('expected_contribution numeric');
    expect(migration).toContain('minimum_contribution numeric');
    expect(migration).toContain("ps.commercial_mode='loadify_supplier_fulfilled'");
  });
});
