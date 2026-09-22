import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repo = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");
const migration = repo("supabase/migrations/20260922154236_supplier_integration_profiles.sql");
const api = repo("netlify/functions/admin-supplier-integration-profile.ts");
const modern = repo("netlify/functions-modern/admin-supplier-integration-profile.ts");
const panel = repo("src/pages/pixel-perfect/admin/SupplierIntegrationKit.tsx");
const sourcing = repo("src/pages/pixel-perfect/admin/AdminProductSourcing.tsx");

describe("universal supplier integration kit foundation", () => {
  it("keeps integration bindings private, admin-only and non-activating", () => {
    expect(migration).toContain("private.supplier_integration_profiles");
    expect(migration).toContain("active admin authority required");
    expect(migration).toContain("REVOKE ALL ON TABLE private.supplier_integration_profiles");
    expect(migration).toContain("FROM PUBLIC, anon, authenticated, service_role");
    expect(migration).toContain("'activationChanged', false");
    expect(migration).toContain("'externalAccessPerformed', false");
    expect(migration).toContain("'commerceActivationPerformed', false");
    expect(api).toContain("authenticateActiveAccount(event, admin, ['admin'])");
  });

  it("models reusable supplier transports without storing credentials", () => {
    for (const transport of [
      "http_rest","graphql","feed_url","sftp","ftps","ftp","webhook","email","manual_portal","manual_file",
    ]) {
      expect(migration).toContain("'" + transport + "'");
      expect(panel).toContain('"' + transport + '"');
    }
    expect(migration).toContain("mapping must not contain credentials or secret material");
    expect(migration).toContain("^env:[A-Z][A-Z0-9_]{2,127}$");
    expect(panel).toContain("No credentials are stored here");
  });

  it("keeps unsafe plain FTP manual-only and requires evidence before verified bindings", () => {
    expect(migration).toContain("plain FTP is never eligible for automated execution");
    expect(migration).toContain("matching current supplier capability evidence");
    expect(migration).toContain("status = 'verified'");
    expect(migration).toContain("ce.execution_mode = v_execution_mode");
  });

  it("ships through the modern Netlify wrapper and is mounted in Admin Product Sourcing", () => {
    expect(modern).toContain("admin-supplier-integration-profile");
    expect(sourcing).toContain('import SupplierIntegrationKit from "./SupplierIntegrationKit"');
    expect(sourcing).toContain("<SupplierIntegrationKit supplierId={resolvedSupplierId} />");
  });
});
