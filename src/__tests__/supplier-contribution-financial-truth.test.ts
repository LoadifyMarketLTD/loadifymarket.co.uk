import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repo = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("supplier contribution and financial truth", () => {
  const migration = repo("supabase/migrations/20261001143000_supplier_contribution_financial_truth.sql");
  const settlementRuntime = repo("netlify/functions/admin-supplier-settlement-runtime.ts");

  it("derives expected contribution server-side from gross price, landed cost and explicit allowances", () => {
    expect(migration).toContain("guard_supplier_pricing_contribution_truth_v2");
    expect(migration).toContain("NEW.expected_contribution:=ROUND");
    expect(migration).toContain("NEW.gross_customer_price-NEW.tax_amount-v_landed.total_landed_cost-v_total_allowances");
    expect(migration).toContain("processor_fee_allowance");
    expect(migration).toContain("returns_allowance");
    expect(migration).toContain("operational_allowance");
    expect(migration).toContain("supplier_failure_allowance");
  });

  it("keeps the minimum contribution gate fail-closed", () => {
    expect(migration).toContain("margin_guard_failed");
    expect(migration).toContain("NEW.expected_contribution<NEW.minimum_contribution");
  });
  it("records immutable Stripe processor-fee evidence and posts it to the canonical ledger", () => {
    expect(migration).toContain("private.supplier_processor_fee_evidence");
    expect(migration).toContain("server_record_supplier_processor_fee_v1");
    expect(migration).toContain("'processor_fee','processor_fee'");
    expect(migration).toContain("supplier processor-fee idempotency collision");
  });

  it("materialises verified landed-cost components without using supplier payable as a profit cost", () => {
    expect(migration).toContain("server_materialize_supplier_cost_ledger_v1");
    expect(migration).toContain("'supplier_product_cost'");
    expect(migration).toContain("'supplier_shipping_cost'");
    expect(migration).toContain("'carrier_cost'");
    expect(migration).toContain("'customs_duty'");
    expect(migration).toContain("'import_vat'");
    expect(migration).toContain("'fx'");
    expect(migration).toContain("'customer_tax_liability'");
  });

  it("derives realised contribution from canonical ledger events", () => {
    expect(migration).toContain("server_supplier_order_financial_truth_v1");
    expect(migration).toContain("supplier_processor_fee_evidence_missing");
    expect(migration).toContain("supplier_payable_ledger_missing");
    expect(migration).toContain("v_payment+v_processor-v_supplier_payable+v_costs");
    expect(migration).toContain("'realisedContribution',v_realised");
  });
  it("requires actual Stripe balance-transaction evidence before Phase O settlement preparation", () => {
    expect(settlementRuntime).toContain("retrieveStripeProcessingFee");
    expect(settlementRuntime).toContain("server_record_supplier_processor_fee_v1");
    expect(settlementRuntime).toContain("server_materialize_supplier_cost_ledger_v1");
    expect(settlementRuntime).toContain("server_supplier_order_financial_truth_v1");
    expect(settlementRuntime).not.toContain("transfers.create");
  });
});
