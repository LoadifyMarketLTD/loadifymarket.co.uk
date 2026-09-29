import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repo = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("supplier settlement intent runtime", () => {
  const profile = repo("supabase/migrations/20260928145500_supplier_commercial_policy_matrix.sql");
  const settlement = repo("supabase/migrations/20260928221500_supplier_settlement_intent_runtime.sql");
  const adminRuntime = repo("netlify/functions/admin-supplier-settlement-runtime.ts");
  const modern = repo("netlify/functions-modern/admin-supplier-settlement-runtime.ts");

  it("stores deterministic payable inputs for fixed and formula contracts", () => {
    expect(profile).toContain("supplier_payable_fixed_amount");
    expect(profile).toContain("supplier_payable_formula");
    expect(profile).toContain("fixed_contract_amount requires supplier_payable_fixed_amount");
    expect(profile).toContain("order_level_formula requires a reviewed declarative supplier_payable_formula");
  });

  it("prepares one immutable settlement obligation from order/profile/pricing evidence", () => {
    expect(settlement).toContain("private.supplier_settlement_intents");
    expect(settlement).toContain("server_prepare_supplier_settlement_v1");
    expect(settlement).toContain('v_order."supplierCommercialProfileIdSnapshot"');
    expect(settlement).toContain("supplier_trade_price_plus_agreed_shipping");
    expect(settlement).toContain("fixed_contract_amount");
    expect(settlement).toContain("supplier settlement intent identity conflict");
  });

  it("fails closed for payable bases that require missing actual-fee or formula execution evidence", () => {
    expect(settlement).toContain("retail_less_attributable_costs_requires_actual_fee_evidence");
    expect(settlement).toContain("order_level_supplier_payable_formula_not_executable");
    expect(settlement).toContain("protection_window_settlement_requires_explicit_elapsed_evidence");
    expect(settlement).toContain("manual_review_settlement_requires_operator_decision");
  });

  it("materialises customer payment and supplier payable in the append-only ledger then reconciles", () => {
    expect(settlement).toContain("'supplier-customer-payment:'||v_order.id::text");
    expect(settlement).toContain("'supplier-payable:'||v_order.id::text");
    expect(settlement).toContain("server_append_financial_ledger_v1");
    expect(settlement).toContain("server_reconcile_supplier_financials_v1");
  });

  it("records manual payment only with active admin, exact amount, external reference and evidence", () => {
    expect(settlement).toContain("server_record_manual_supplier_settlement_v1");
    expect(settlement).toContain("active_admin_required");
    expect(settlement).toContain("manual_supplier_settlement_amount_mismatch");
    expect(settlement).toContain("manual_settlement_reference_and_evidence_required");
    expect(settlement).toContain("'supplier-payout:'||v_order.id::text");
    expect(settlement).toContain("'externalPaymentPerformedByRuntime',false");
  });

  it("exposes admin prepare/manual-paid actions through the modern Netlify wrapper without direct Stripe transfer calls", () => {
    expect(adminRuntime).toContain('["prepare","record_manual_paid"]');
    expect(adminRuntime).toContain("server_prepare_supplier_settlement_v1");
    expect(adminRuntime).toContain("server_record_manual_supplier_settlement_v1");
    expect(adminRuntime).not.toContain("transfers.create");
    expect(adminRuntime).not.toContain("paymentIntents.create");
    expect(modern).toContain("withLambda(handler)");
  });
});
