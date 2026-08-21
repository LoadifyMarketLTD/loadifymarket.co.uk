import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(resolve(process.cwd(), 'supabase/653_supplier_return_quantity_closure.sql'), 'utf8');

describe('Phase L cumulative return quantity closure', () => {
  it('serializes concurrent return creation on the canonical fulfilment leg', () => {
    expect(sql).toContain('FOR UPDATE');
    expect(sql).toContain('private.supplier_fulfilment_legs');
  });

  it('sums prior non-cancelled return cases before accepting another return', () => {
    expect(sql).toContain('SUM(c.requested_quantity)');
    expect(sql).toContain("c.state<>'cancelled'");
    expect(sql).toContain('v_existing_quantity+NEW.requested_quantity>v_leg_quantity');
  });

  it('fails closed instead of over-returning the ordered quantity', () => {
    expect(sql).toContain('cumulative supplier return quantity exceeds fulfilment leg quantity');
    expect(sql).toContain('BEFORE INSERT ON private.supplier_return_cases');
  });
});
