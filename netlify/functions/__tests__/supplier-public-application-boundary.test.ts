import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repo = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("public supplier application boundary", () => {
  const migration = repo("supabase/migrations/20260922063855_supplier_public_applications.sql");
  const endpoint = repo("netlify/functions/supplier-application.ts");
  const adminEndpoint = repo("netlify/functions/admin-supplier-applications.ts");
  const page = repo("src/pages/public/SupplierApplicationPage.tsx");
  const queue = repo("src/pages/pixel-perfect/admin/SupplierApplicationQueue.tsx");
  const routes = repo("src/AppRoutes.tsx");

  it("stores applications in a private service-role-only queue", () => {
    expect(migration).toContain("private.supplier_public_applications");
    expect(migration).toContain("REVOKE ALL ON TABLE private.supplier_public_applications");
    expect(migration).toContain("FROM PUBLIC, anon, authenticated, service_role");
    expect(migration).toContain("server_submit_supplier_application_v1");
    expect(migration).toContain("TO service_role");
  });

  it("keeps public submission candidate-only with no foundation or commerce mutation", () => {
    expect(migration).toContain("'candidateOnly',true");
    expect(migration).toContain("'supplierFoundationMutationPerformed',false");
    expect(migration).toContain("'qualificationMutationPerformed',false");
    expect(migration).toContain("'commerceActivationPerformed',false");
    expect(migration).toContain("'marketplaceListingPerformed',false");
    expect(endpoint).toContain("candidateOnly: true");
    expect(endpoint).not.toContain("server_admin_supplier_foundation_v1");
    expect(endpoint).not.toContain("server_admin_supplier_onboarding_v1");
  });

  it("rejects credentials and protects the public form with anti-spam controls", () => {
    expect(endpoint).toContain("FORBIDDEN_KEYS");
    expect(endpoint).toContain("checkRateLimit");
    expect(endpoint).toContain("verifyCaptchaToken");
    expect(endpoint).toContain("MIN_SUBMIT_MS");
    expect(page).toContain("Do not submit passwords, API keys or credentials.");
    expect(page).not.toContain('name="password"');
    expect(page).not.toContain("apiKey");
  });

  it("requires active admin authority for review and never converts implicitly", () => {
    expect(migration).toContain("active admin authority required");
    expect(migration).toContain("existing Supplier Foundation identity is required before conversion");
    expect(migration).toContain("'supplierFoundationMutationPerformed',false");
    expect(adminEndpoint).toContain("authenticateActiveAccount");
    expect(queue).toContain("does not create a Supplier Foundation identity");
  });

  it("exposes the dedicated application route and supplier hub CTA", () => {
    expect(routes).toContain('path="supplier-application"');
    expect(repo("src/pages/public/SuppliersPage.tsx")).toContain('to="/supplier-application"');
    expect(repo("netlify/functions/sitemap.ts")).toContain("'/supplier-application'");
    expect(repo("netlify/edge-functions/public-meta.ts")).toContain("'/supplier-application'");
  });
});
