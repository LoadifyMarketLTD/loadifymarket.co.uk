import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('supplier SLA breach canonical leg identity', () => {
  it('validates order and supplier through orchestration and supplier-offer relations', () => {
    const sql = read('supabase/659_zz_supplier_sla_leg_identity_fix.sql');

    expect(sql).toContain('FROM private.supplier_fulfilment_legs l');
    expect(sql).toContain('JOIN private.supplier_order_orchestrations o ON o.id=l.orchestration_id');
    expect(sql).toContain('JOIN private.supplier_offers so ON so.id=l.supplier_offer_id');
    expect(sql).toContain('AND o.order_id=p_order_id');
    expect(sql).toContain('AND so.supplier_id=p_supplier_id');
    expect(sql).not.toContain('l.order_id=p_order_id');
    expect(sql).not.toContain('l.supplier_id=p_supplier_id');
    expect(sql).toContain("RAISE EXCEPTION 'SLA breach order/leg/supplier identity mismatch'");
    expect(sql).toContain("SECURITY DEFINER SET search_path TO ''");
  });
});
