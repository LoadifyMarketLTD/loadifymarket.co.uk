import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repo = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");
const panel = repo("src/pages/pixel-perfect/admin/SupplierOperationsHealth.tsx");
const sourcing = repo("src/pages/pixel-perfect/admin/AdminProductSourcing.tsx");
const endpoint = repo("netlify/functions/admin-supplier-health.ts");

describe("supplier operations health admin surface", () => {
  it("uses the existing active-admin read-only health endpoint", () => {
    expect(panel).toContain('"/.netlify/functions/admin-supplier-health"');
    expect(endpoint).toContain("authenticateActiveAccount(event, admin, ['admin'])");
    expect(endpoint).toContain("controlMutationPerformed: false");
    expect(endpoint).toContain("externalMutationPerformed: false");
  });

  it("shows the operational evidence families without adding automatic controls", () => {
    expect(panel).toContain("API reliability");
    expect(panel).toContain("stock/price freshness");
    expect(panel).toContain("fulfilment");
    expect(panel).toContain("tracking");
    expect(panel).toContain("reconciliation");
    expect(panel).toContain("recommendation-only");
    expect(panel).not.toContain("killSwitch(");
    expect(panel).not.toContain("activateCommerce");
  });

  it("is scoped to the real Supplier Foundation identity already resolved by onboarding", () => {
    expect(sourcing).toContain('import SupplierOperationsHealth from "./SupplierOperationsHealth"');
    expect(sourcing).toContain("<SupplierOperationsHealth supplierId={resolvedSupplierId} />");
  });
});
