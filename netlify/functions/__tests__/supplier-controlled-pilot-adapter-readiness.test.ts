import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repo = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const closure = repo('supabase/667_supplier_controlled_pilot_adapter_readiness_closure.sql');

describe('Phase O unified adapter readiness closure', () => {
  it('requires one active verified interface-v1 adapter registration', () => {
    expect(closure).toContain("a.status='active'");
    expect(closure).toContain('a.interface_version=1');
    expect(closure).toContain('a.verified_at IS NOT NULL');
    expect(closure).toContain('a.verified_by IS NOT NULL');
    expect(closure).toContain("NULLIF(BTRIM(a.config_ref),'') IS NOT NULL");
  });

  it('requires the complete pilot capability set on that same adapter row', () => {
    for (const capability of ['catalog','stock','price','shipping','order_submission','acknowledgement','tracking','cancellation','returns','reimbursement']) {
      expect(closure).toContain(`'${capability}'`);
    }
    expect(closure).toContain('a.capabilities @> v_required_capabilities');
    expect(closure).toContain("'single_verified_full_capability_adapter'");
  });

  it('returns the exact adapter identity used by the readiness decision', () => {
    for (const key of ['adapterId','adapterKey','adapterVersion']) expect(closure).toContain(`'${key}'`);
  });

  it('still requires provider source evidence, product-set bounds, catalog readiness and fresh stock/price truth', () => {
    expect(closure).toContain('jsonb_array_length(c.official_source_refs)>0');
    expect(closure).toContain('v_offer_count<v_pilot.minimum_product_count');
    expect(closure).toContain('server_supplier_catalog_decision_v1');
    expect(closure).toContain('server_supplier_stock_price_decision_v1');
    expect(closure).toContain("'simulatorPassIsNotPilotPass',true");
  });
});
