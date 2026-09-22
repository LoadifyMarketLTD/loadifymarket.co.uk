import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repo = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");
const queue = repo("src/pages/pixel-perfect/admin/SupplierApplicationQueue.tsx");
const sourcing = repo("src/pages/pixel-perfect/admin/AdminProductSourcing.tsx");
const migration = repo("supabase/migrations/20260922063855_supplier_public_applications.sql");

describe("qualified supplier application onboarding handoff", () => {
  it("offers onboarding handoff only after the public application is qualified", () => {
    expect(queue).toContain('status === "qualified"');
    expect(queue).toContain("Load into onboarding");
    expect(queue).toContain("onLoadQualifiedApplication(application)");
  });

  it("copies submitted facts but clears fields that require admin authority or missing evidence", () => {
    expect(sourcing).toContain('supplierKey: ""');
    expect(sourcing).toContain('warehouseDeclarations: ""');
    expect(sourcing).toContain('capabilities: "catalog"');
    expect(sourcing).toContain('configRef: ""');
    expect(sourcing).toContain('commercialTermsRef: ""');
    expect(sourcing).toContain('onboardingStatus: "draft"');
    expect(sourcing).toContain("intentionally not invented");
  });

  it("creates the Supplier Foundation candidate before linking the application as converted", () => {
    const candidateCall = sourcing.indexOf('"/.netlify/functions/admin-direct-supplier-foundation-candidate"');
    const profileCall = sourcing.indexOf('"/.netlify/functions/admin-supplier-onboarding-profile"');
    const conversionCall = sourcing.indexOf('status: "converted"');
    expect(candidateCall).toBeGreaterThan(-1);
    expect(profileCall).toBeGreaterThan(candidateCall);
    expect(conversionCall).toBeGreaterThan(profileCall);
    expect(sourcing).toContain("convertedSupplierId: supplierId");
  });

  it("keeps the database boundary fail-closed by requiring an existing Supplier Foundation identity before conversion", () => {
    expect(migration).toContain("existing Supplier Foundation identity is required before conversion");
    expect(migration).toContain("'supplierFoundationMutationPerformed',false");
    expect(migration).toContain("'commerceActivationPerformed',false");
    expect(migration).toContain("'marketplaceListingPerformed',false");
  });
});
