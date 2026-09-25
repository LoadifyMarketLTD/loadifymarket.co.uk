import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260924222000_market_legal_policy_versions.sql"),
  "utf8",
);

describe("Romania legal policy version gate", () => {
  it("requires the transaction-facing policy set", () => {
    for (const policy of ["buyer_terms","privacy","returns_policy","shipping_policy"]) {
      expect(migration).toContain(policy);
    }
  });

  it("binds Romania policies to ro-RO", () => {
    expect(migration).toContain("(market_code='RO' AND locale='ro-RO')");
  });

  it("requires reviewed current versions", () => {
    expect(migration).toContain("reviewed_by IS NOT NULL");
    expect(migration).toContain("reviewed_at IS NOT NULL");
    expect(migration).toContain("effective_from<=now()");
    expect(migration).toContain("(p.effective_to IS NULL OR p.effective_to>now())");
  });

  it("fails closed with explicit missing policies", () => {
    expect(migration).toContain("legal_policy_versions_incomplete");
    expect(migration).toContain("missingPolicies");
  });

  it("does not store or approve legal text automatically", () => {
    expect(migration).toContain("Does not store or approve legal text by itself");
  });
});
