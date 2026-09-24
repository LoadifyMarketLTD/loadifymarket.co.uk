import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/20260924181500_romania_checkout_readiness_composition.sql"), "utf8");
describe("Romania checkout readiness composition", () => {
  it("composes market compliance price shipping and product compliance", () => {
    expect(migration).toContain("server_market_compliance_readiness_v1('RO')");
    expect(migration).toContain("server_product_market_price_decision_v1(p_product_id,'RO')");
    expect(migration).toContain("server_shipping_market_readiness_v1(p_product_id,'RO')");
    expect(migration).toContain("server_product_market_compliance_decision_v1");
  });
  it("is native RON and fail closed", () => {
    expect(migration).toContain("'currency','RON'");
    expect(migration).toContain("'checkoutEnabled',false");
    expect(migration).toContain("'paymentEnabled',false");
  });
  it("keeps payment as an explicit launch blocker", () => {
    expect(migration).toContain("payment_not_enabled");
    expect(migration).toContain("future reviewed payment-readiness");
  });
  it("is service-role only", () => {
    expect(migration).toContain("REVOKE ALL ON FUNCTION");
    expect(migration).toContain("TO service_role");
  });
});
