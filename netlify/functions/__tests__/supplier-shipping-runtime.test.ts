import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repo = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const canonical = repo('supabase/681_supplier_shipping_runtime.sql');
const deploy = repo('supabase/migrations/20260827124500_supplier_shipping_runtime.sql');
const runtime = repo('netlify/functions/_shared/supplierShipping.ts');

for (const sql of [canonical, deploy]) {
  describe(`Supplier Commerce Stage 5A shipping evidence — ${sql === canonical ? 'canonical' : 'deploy'}`, () => {
    it('persists exact adapter-bound quote requests and immutable quote/selection evidence', () => {
      expect(sql).toContain('private.supplier_shipping_quote_requests');
      expect(sql).toContain('private.supplier_shipping_quotes');
      expect(sql).toContain('private.supplier_shipping_decisions');
      expect(sql).toContain('supplier shipping quote/decision evidence is append-only');
    });

    it('requires canonical checkout readiness before provider quote preparation', () => {
      expect(sql).toContain('public.server_supplier_listing_checkout_decision_v1');
      expect(sql).toContain('supplier_checkout_not_ready');
      expect(sql).toContain("a.capabilities @> ARRAY['shipping']::text[]");
    });

    it('pins supplier/provider/adapter identity and idempotency before the external call', () => {
      expect(sql).toContain('provider_key');
      expect(sql).toContain('adapter_version');
      expect(sql).toContain('supplier_key');
      expect(sql).toContain('external_offer_ref');
      expect(sql).toContain('request_fingerprint');
      expect(sql).toContain('supplier shipping quote idempotency collision');
    });

    it('records malformed/provider failures separately from successful quotes', () => {
      expect(sql).toContain("'MALFORMED_RESPONSE'");
      expect(sql).toContain("'UNKNOWN_OUTCOME'");
      expect(sql).toContain("'CAPABILITY_UNAVAILABLE'");
      expect(sql).toContain('shipping_quote_provider_failure');
    });

    it('keeps supplier shipping cost separate from customer shipping charge and economics-gated', () => {
      expect(sql).toContain('supplier_shipping_cost_minor');
      expect(sql).toContain('v_landed.supplier_shipping_cost');
      expect(sql).toContain('supplier_shipping_cost_exceeds_priced_economics');
      expect(sql).not.toContain('customer_shipping_charge=');
    });

    it('does not perform provider calls in SQL or enable commerce', () => {
      expect(sql).not.toContain('quoteShipping(');
      expect(sql).not.toContain('submitOrder(');
      expect(sql).not.toContain('SET enabled=true');
    });
  });
}

describe('Supplier Commerce Stage 5A provider-neutral shipping runtime', () => {
  it('uses the exact database-selected adapter identity and shipping capability', () => {
    expect(runtime).toContain('adapter.providerKey !== prepared.providerKey');
    expect(runtime).toContain('adapter.adapterVersion !== prepared.adapterVersion');
    expect(runtime).toContain("adapterSupports(adapter, 'shipping')");
    expect(runtime).toContain('adapter.quoteShipping');
  });

  it('persists provider results through canonical RPC boundaries', () => {
    expect(runtime).toContain('server_prepare_supplier_shipping_quote_v1');
    expect(runtime).toContain('server_record_supplier_shipping_quote_result_v1');
    expect(runtime).toContain('server_select_supplier_shipping_quote_v1');
  });

  it('fails closed on adapter mismatch, malformed response and thrown provider call', () => {
    expect(runtime).toContain('supplier_shipping_adapter_mismatch');
    expect(runtime).toContain('supplier_shipping_provider_returned_no_quotes');
    expect(runtime).toContain('supplier_shipping_unknown_outcome');
  });
});
