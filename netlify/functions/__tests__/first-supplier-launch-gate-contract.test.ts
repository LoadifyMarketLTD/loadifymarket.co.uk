import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repo = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");
const api = repo("netlify/functions/admin-first-supplier-launch-gate.ts");
const modern = repo("netlify/functions-modern/admin-first-supplier-launch-gate.ts");
const panel = repo("src/pages/pixel-perfect/admin/FirstSupplierLaunchGate.tsx");
const sourcing = repo("src/pages/pixel-perfect/admin/AdminProductSourcing.tsx");

describe("first supplier P7/P8 launch gate", () => {
  it("is active-admin-only and composes existing read-only supplier truth", () => {
    expect(api).toContain("authenticateActiveAccount(event, admin, ['admin'])");
    expect(api).toContain("server_supplier_onboarding_readiness_v1");
    expect(api).toContain("server_supplier_acquisition_context_v1");
    expect(api).toContain("server_admin_supplier_control_centre_v1");
    expect(api).toContain("server_admin_supplier_pilot_status_v1");
    expect(api).toContain("resolveSupplierAcquisitionConfig");
  });

  it("never creates or activates a supplier, acquisition run, pilot, listing, order or payment", () => {
    expect(api).not.toContain("server_admin_supplier_foundation_v1");
    expect(api).not.toContain("server_supplier_acquisition_run_v1");
    expect(api).not.toContain("server_admin_create_supplier_pilot_v1");
    expect(api).not.toContain("server_admin_activate_supplier_pilot_v1");
    expect(api).not.toContain("server_admin_prepare_supplier_pilot_v1");
    expect(api).not.toContain("server_admin_publish");
    expect(api).not.toContain("create-payment");
    expect(api).toContain("commercialActivationPerformed: false");
    expect(api).toContain("marketplaceListingPerformed: false");
    expect(api).toContain("externalMutationPerformed: false");
  });

  it("keeps P7 evidence-bound and P8 dependent on real pilot acceptance", () => {
    expect(api).toContain("authenticSupplierEvidenceRequired: true");
    expect(api).toContain("syntheticEvidenceAccepted: false");
    expect(api).toContain("simulatorPassIsPilotPass: false");
    expect(api).toContain("acceptancePassed");
    expect(panel).toContain("Synthetic suppliers");
    expect(panel).toContain("Simulator PASS is not Pilot PASS");
    expect(panel).toContain("No automatic activation");
  });

  it("uses the modern Netlify wrapper and is mounted in Admin Product Sourcing", () => {
    expect(modern).toContain("admin-first-supplier-launch-gate");
    expect(sourcing).toContain('import FirstSupplierLaunchGate from "./FirstSupplierLaunchGate"');
    expect(sourcing).toContain("<FirstSupplierLaunchGate supplierKey={supplierOnboarding.supplierKey || supplierKey} />");
  });
});
