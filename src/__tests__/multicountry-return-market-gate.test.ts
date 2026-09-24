import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("multi-country returns market gate", () => {
  const migration = read("supabase/migrations/20260924170000_multicountry_return_market_gate.sql");
  const endpoint = read("netlify/functions/customer-return-eligibility.ts");

  it("preserves the delivery-based 14-day boundary", () => {
    expect(migration).toContain("o.status IN ('delivered','completed')");
    expect(migration).toContain("s.updated_at>=now()-interval '14 days'");
  });

  it("requires Romania compliance before database return eligibility", () => {
    expect(migration).toContain("v_market='RO'");
    expect(migration).toContain("server_market_compliance_readiness_v1('RO')");
    expect(migration).toContain("RETURN false");
  });

  it("checks the order market in the return eligibility endpoint", () => {
    expect(endpoint).toContain(".select('id, status, buyerId, marketCode')");
    expect(endpoint).toContain("RETURN_MARKET_NOT_SUPPORTED");
  });

  it("fails Romania closed in the endpoint when compliance is not ready", () => {
    expect(endpoint).toContain("server_market_compliance_readiness_v1");
    expect(endpoint).toContain("RETURN_MARKET_COMPLIANCE_NOT_READY");
    expect(endpoint).toContain("Romania returns are not enabled until market compliance is verified");
  });
});
