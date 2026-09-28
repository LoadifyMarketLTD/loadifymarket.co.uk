import fs from "node:fs";
import path from "node:path";

const migration = fs.readFileSync(
  path.resolve(process.cwd(), "supabase/migrations/20260928163500_phase_o_market_viability_gate.sql"),
  "utf8",
);

describe("Phase O market viability gate", () => {
  it("requires current multi-source UK benchmark evidence", () => {
    expect(migration).toContain("benchmark_sample_count>=3");
    expect(migration).toContain("jsonb_array_length(evidence_refs)>=3");
    expect(migration).toContain("interval '14 days'");
    expect(migration).toContain("market_benchmark_stale");
  });

  it("binds viability to approved supplier economics", () => {
    expect(migration).toContain("private.supplier_pricing_snapshots");
    expect(migration).toContain("status='approved'");
    expect(migration).toContain("p_proposed_customer_price<>v_price.gross_customer_price");
    expect(migration).toContain("expected_contribution>=minimum_contribution");
    expect(migration).toContain("profitability_guard_failed");
  });

  it("blocks pilot activation when the buyer price is not market viable", () => {
    expect(migration).toContain("market_price_ceiling_failed");
    expect(migration).toContain("market_viability_evidence_missing");
    expect(migration).toContain("market_viability_rejected");
    expect(migration).toContain("server_supplier_pilot_market_viability_readiness_v1");
    expect(migration).toContain("'marketViability',v_market");
  });

  it("keeps evidence immutable and does not activate commerce", () => {
    expect(migration).toContain("market viability evidence is immutable");
    expect(migration).not.toContain("set_supplier_pilot_master_control_v1");
  });
});
