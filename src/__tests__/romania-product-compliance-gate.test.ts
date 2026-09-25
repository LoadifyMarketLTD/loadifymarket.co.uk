import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260924171500_romania_product_compliance_gate.sql"),
  "utf8",
);

describe("Romania product compliance gate", () => {
  it("requires reviewed product-specific RO evidence", () => {
    for (const reviewClass of [
      "product_safety",
      "labelling",
      "documentation",
      "marketability",
      "manufacturer_identity",
      "eu_responsible_person_assessment",
      "traceability",
      "safety_information",
    ]) expect(migration).toContain(reviewClass);
  });

  it("requires the market-level Romania gate first", () => {
    expect(migration).toContain("server_market_compliance_readiness_v1('RO')");
    expect(migration).toContain("market_compliance_not_ready");
  });

  it("requires human-reviewed, current evidence", () => {
    expect(migration).toContain("c.reviewed_by IS NOT NULL");
    expect(migration).toContain("c.reviewed_at IS NOT NULL");
    expect(migration).toContain("jsonb_array_length(c.evidence_refs)>0");
    expect(migration).toContain("(c.expires_at IS NULL OR c.expires_at>now())");
  });

  it("fails closed with explicit missing evidence", () => {
    expect(migration).toContain("product_market_compliance_incomplete");
    expect(migration).toContain("missingEvidence");
  });

  it("does not invent responsible-person applicability", () => {
    expect(migration).toContain("eu_responsible_person_assessment");
    expect(migration).not.toContain("'responsible_person_identity'");
  });
});
