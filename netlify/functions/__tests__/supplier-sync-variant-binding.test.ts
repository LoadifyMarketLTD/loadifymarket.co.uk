import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/633_supplier_sync_variant_binding_closure.sql'),
  'utf8',
);

describe('Phase H supplier sync variant binding', () => {
  it('binds stock and price observations to the exact supplier catalog variant', () => {
    expect(migration).toContain('private.guard_supplier_sync_variant_binding_v1');
    expect(migration).toContain("BTRIM(COALESCE(i.external_variant_ref, ''))");
    expect(migration).toContain("BTRIM(COALESCE(NEW.external_variant_ref, '')) <> v_catalog_variant");
    expect(migration).toContain('supplier sync variant must match the offer catalog variant');
    expect(migration).toContain('trg_guard_supplier_stock_variant_binding_v1');
    expect(migration).toContain('trg_guard_supplier_price_variant_binding_v1');
  });

  it('applies the identity guard before insert so unrelated provider variants fail closed', () => {
    expect(migration).toContain('BEFORE INSERT ON private.supplier_stock_observations');
    expect(migration).toContain('BEFORE INSERT ON private.supplier_price_observations');
    expect(migration).not.toContain('enabled = true');
  });
});
