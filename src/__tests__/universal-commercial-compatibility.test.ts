import fs from "node:fs";
import path from "node:path";

const migration = fs.readFileSync(
  path.resolve(process.cwd(), "supabase/migrations/20260930184500_universal_commercial_compatibility.sql"),
  "utf8",
);

describe("universal commercial compatibility", () => {
  it("supports multiple seller and merchant role models without supplier-specific forks", () => {
    expect(migration).toContain("seller_of_record_party");
    expect(migration).toContain("invoice_issuer_party");
    expect(migration).toContain("merchant_of_record_party");
    expect(migration).toContain("inventory_owner_party");
    expect(migration).toContain("fulfilment_party");
    expect(migration).toContain("customer_service_party");
    expect(migration).toContain("role_bindings");
    expect(migration).toContain("'supplier','loadify','marketplace_seller','third_party'");
  });

  it("makes market policy allow models instead of forcing one supplier seller model", () => {
    expect(migration).toContain("allowed_seller_of_record_parties");
    expect(migration).toContain("allowed_merchant_of_record_parties");
    expect(migration).toContain("allowed_settlement_models");
  });

  it("fails closed unless the selected supplier profile and market policy agree", () => {
    expect(migration).toContain("server_supplier_commercial_compatibility_readiness_v2");
    expect(migration).toContain("seller_of_record_model_not_allowed");
    expect(migration).toContain("merchant_of_record_model_not_allowed");
    expect(migration).toContain("settlement_model_not_allowed");
  });

  it("does not enable checkout or rewrite historical orders", () => {
    expect(migration).not.toContain("UPDATE public.orders");
    expect(migration).not.toContain("SET checkout_enabled=true");
    expect(migration).toContain("checkoutEnabledByThisAction',false");
    expect(migration).toContain("market commercial policy cannot be changed while checkout is enabled");
    expect(migration).not.toContain("SET status='verified',checkout_enabled=true");
  });
});