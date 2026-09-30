import fs from "node:fs";
import path from "node:path";

const migration = fs.readFileSync(
  path.resolve(process.cwd(), "supabase/migrations/20260930155000_supplier_brand_usage_policy.sql"),
  "utf8",
);

describe("supplier brand usage policy enforcement", () => {
  it("stores versioned evidence-backed supplier brand usage policy", () => {
    expect(migration).toContain("private.supplier_brand_usage_policies");
    expect(migration).toContain("allow_brand_name_in_listing");
    expect(migration).toContain("allow_logo_in_listing");
    expect(migration).toContain("verified supplier brand usage policy is immutable");
  });

  it("fails closed without verified current supplier brand usage evidence", () => {
    expect(migration).toContain("verified_supplier_brand_usage_policy_missing");
    expect(migration).toContain("supplier_brand_name_usage_not_permitted");
    expect(migration).toContain("supplier_logo_usage_not_permitted");
  });

  it("checks only governed public brand and marketing fields", () => {
    expect(migration).toContain("p_payload->>'title'");
    expect(migration).toContain("p_payload->>'description'");
    expect(migration).toContain("p_payload->>'brand'");
    expect(migration).toContain("p_payload->>'marketingCopy'");
    expect(migration).not.toContain("p_payload::text");
  });

  it("blocks publication until supplier brand policy passes", () => {
    expect(migration).toContain("server_supplier_brand_usage_decision_v1");
    expect(migration).toContain("supplier brand usage policy blocks publication");
    expect(migration).toContain("'brandPolicy',v_brand_policy");
  });

  it("does not activate supplier commerce", () => {
    expect(migration).not.toContain("set_supplier_pilot_master_control_v1");
    expect(migration).not.toContain("checkout_enabled=true");
  });
});