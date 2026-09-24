import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/20260924180000_multicountry_order_legal_disclosure_snapshot.sql"), "utf8");
describe("multi-country order legal snapshot", () => {
  it("requires explicit RO market locale and currency", () => {
    expect(migration).toContain("'marketCode'),'')='RO'");
    expect(migration).toContain("'locale'),'')='ro-RO'");
    expect(migration).toContain("'currency'),'')='RON'");
  });
  it("requires versioned buyer privacy and returns disclosures for RO", () => {
    expect(migration).toContain("buyerTermsVersion");
    expect(migration).toContain("privacyVersion");
    expect(migration).toContain("returnsPolicyVersion");
  });
  it("requires seller-of-record identity", () => {
    expect(migration).toContain("sellerOfRecord");
  });
  it("makes a captured snapshot immutable", () => {
    expect(migration).toContain("guard_order_legal_disclosure_immutable_v1");
    expect(migration).toContain("captured legal disclosure snapshot is immutable");
  });
});
