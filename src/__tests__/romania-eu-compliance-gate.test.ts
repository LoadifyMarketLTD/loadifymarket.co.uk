import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Romania / EU compliance readiness gate", () => {
  const migration = read("supabase/migrations/20260924163000_romania_eu_compliance_evidence_gate.sql");

  it("requires all Romania compliance evidence domains", () => {
    for (const domain of [
      "trader_traceability",
      "product_safety_listing",
      "responsible_person_identity",
      "consumer_distance_contract",
      "withdrawal_returns",
      "vat_ecommerce",
      "legal_disclosures",
      "product_category_restrictions",
      "complaints_moderation",
      "recall_cooperation",
    ]) {
      expect(migration).toContain(domain);
    }
  });

  it("requires reviewed evidence before verified status", () => {
    expect(migration).toContain("reviewed_by IS NOT NULL");
    expect(migration).toContain("reviewed_at IS NOT NULL");
    expect(migration).toContain("evidence <> '{}'::jsonb");
  });

  it("fails Romania closed when any required evidence is missing or stale", () => {
    expect(migration).toContain("market_compliance_incomplete");
    expect(migration).toContain("missingEvidence");
    expect(migration).toContain("e.valid_from<=now()");
    expect(migration).toContain("(e.valid_to IS NULL OR e.valid_to>now())");
  });

  it("does not replace the existing UK compliance boundary", () => {
    expect(migration).toContain("existing_uk_compliance_boundary");
    expect(migration).toContain("This new ledger is the incremental RO/EU gate");
  });

  it("keeps the readiness RPC service-role only", () => {
    expect(migration).toContain("REVOKE ALL ON FUNCTION public.server_market_compliance_readiness_v1(text)");
    expect(migration).toContain("GRANT EXECUTE ON FUNCTION public.server_market_compliance_readiness_v1(text)");
    expect(migration).toContain("TO service_role");
  });
});
