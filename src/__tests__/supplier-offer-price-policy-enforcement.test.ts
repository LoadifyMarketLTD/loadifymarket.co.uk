import fs from "node:fs";
import path from "node:path";

const migration = fs.readFileSync(
  path.resolve(process.cwd(), "supabase/migrations/20260930151000_supplier_offer_price_policy_enforcement.sql"),
  "utf8",
);

describe("supplier offer price policy enforcement", () => {
  it("stores immutable evidence-backed per-offer price constraints", () => {
    expect(migration).toContain("private.supplier_offer_price_constraints");
    expect(migration).toContain("minimum_customer_price");
    expect(migration).toContain("fixed_customer_price");
    expect(migration).toContain("verified supplier offer price constraint is immutable");
    expect(migration).toContain("source_ref");
  });

  it("supports supplier-wide and per-offer minimum price evidence", () => {
    expect(migration).toContain("A supplier_minimum_price policy may be supplier-wide or offer/SKU-specific");
    expect(migration).toContain("ELSIF v_profile.supplier_price_floor IS NOT NULL");
    expect(migration).toContain("supplier_minimum_price_missing");
    expect(migration).toContain("verified supplier minimum price is required before pricing approval");
  });

  it("fails closed when a verified minimum price is violated", () => {
    expect(migration).toContain("supplier_minimum_price_floor_failed");
    expect(migration).toContain("approved customer price is below verified supplier minimum price");
  });

  it("blocks publication until economics and supplier price policy pass", () => {
    expect(migration).toContain("server_supplier_commercial_decision_v1");
    expect(migration).toContain("server_supplier_offer_price_policy_decision_v1");
    expect(migration).toContain("supplier price policy blocks publication");
    expect(migration).toContain("'pricePolicy',v_price_policy");
  });

  it("rechecks the supplier price policy at checkout order creation", () => {
    expect(migration).toContain("trg_guard_supplier_order_price_policy_v1");
    expect(migration).toContain("supplier price policy blocks checkout");
    expect(migration).toContain('NEW."pricingSnapshotId"');
  });

  it("does not activate supplier commerce", () => {
    expect(migration).not.toContain("set_supplier_pilot_master_control_v1");
    expect(migration).not.toContain("checkout_enabled=true");
  });
});