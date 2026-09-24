import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260924181500_romania_checkout_readiness_composition.sql"),
  "utf8",
);
const payment = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260924213500_romania_payment_readiness_evidence.sql"),
  "utf8",
);

describe("Romania checkout readiness composition", () => {
  it("composes market compliance price shipping product compliance and payment readiness", () => {
    expect(migration).toContain("server_market_compliance_readiness_v1('RO')");
    expect(migration).toContain("server_product_market_price_decision_v1(p_product_id,'RO')");
    expect(migration).toContain("server_shipping_market_readiness_v1(p_product_id,'RO')");
    expect(migration).toContain("server_product_market_compliance_decision_v1");
    expect(migration).toContain("server_market_payment_readiness_v1('RO')");
    expect(migration).toContain("server_market_legal_policy_snapshot_v1('RO')");
  });

  it("remains non-activating even if evidence becomes complete", () => {
    expect(migration).toContain("'checkoutEnabled',false");
    expect(migration).toContain("'paymentEnabled',false");
    expect(migration).toContain("'eligible',cardinality(v_failures)=0");
  });

  it("requires evidence-backed RO payment capability", () => {
    for (const domain of [
      "ron_charge_support",
      "merchant_account_capability",
      "sca_3ds_support",
      "refund_support",
      "settlement_reconciliation",
    ]) expect(payment).toContain(domain);
    expect(payment).toContain("payment_readiness_incomplete");
  });

  it("keeps readiness decisions service-role only", () => {
    expect(migration).toContain("TO service_role");
    expect(payment).toContain("TO service_role");
  });
});
