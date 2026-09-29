import fs from "node:fs";
import path from "node:path";

const repo = (file: string) => fs.readFileSync(path.resolve(process.cwd(), file), "utf8");

describe("Phase O verified manual supplier route", () => {
  const readiness = repo("supabase/migrations/20260922154827_direct_supplier_multi_transport_pilot_readiness.sql");
  const runtime = repo("netlify/functions/admin-supplier-pilot-runtime.ts");

  it("accepts a reviewed manual order and acknowledgement route without pretending it is automated", () => {
    expect(readiness).toContain("verified_manual_or_automated_order_binding_required");
    expect(readiness).toContain("verified_manual_or_automated_acknowledgement_binding_required");
    expect(readiness).toContain("p.execution_mode='manual_only'");
    expect(readiness).toContain("'email','manual_portal','manual_file'");
  });

  it("retains stronger config requirements for automated bindings", () => {
    expect(readiness).toContain("p.execution_mode='automated_write'");
    expect(readiness).toContain("NULLIF(BTRIM(p.config_ref),'') IS NOT NULL");
  });

  it("does not require autonomous shadow promotion for a canonical-ready manual pilot", () => {
    expect(runtime).toContain("const verifiedManualPilot = canonicalReadiness?.ready === true");
    expect(runtime).toContain("providerOrderExecution.availability === 'manual_only'");
    expect(runtime).toContain("providerOrderExecution.externalMutationAllowed === false");
    expect(runtime).toContain("if (!verifiedManualPilot)");
  });
});
