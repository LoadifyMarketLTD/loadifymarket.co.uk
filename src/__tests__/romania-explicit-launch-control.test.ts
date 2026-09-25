import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260924220500_romania_explicit_launch_control.sql"),
  "utf8",
);

describe("Romania explicit launch control", () => {
  it("seeds Romania as prelaunch with checkout and payment disabled", () => {
    expect(migration).toContain("('RO','prelaunch',true,false,false");
  });

  it("requires compliance and payment readiness before any RO live cutover", () => {
    expect(migration).toContain("server_market_compliance_readiness_v1('RO')");
    expect(migration).toContain("server_market_payment_readiness_v1('RO')");
    expect(migration).toContain("Romania compliance readiness is incomplete");
    expect(migration).toContain("Romania payment readiness is incomplete");
  });

  it("requires an active admin identity and explicit reason", () => {
    expect(migration).toContain("role='admin'");
    expect(migration).toContain('"isActive"=true');
    expect(migration).toContain("launch-control reason is required");
  });

  it("does not let the new Romania control mutate the UK boundary", () => {
    expect(migration).toContain("UK launch boundary is managed by the existing production controls");
  });

  it("keeps the mutation RPC service-role only", () => {
    expect(migration).toContain("server_set_romania_launch_control_v1");
    expect(migration).toContain("TO service_role");
  });
});
