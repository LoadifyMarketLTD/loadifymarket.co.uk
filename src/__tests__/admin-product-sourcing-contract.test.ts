import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repo = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("admin product sourcing operator surface", () => {
  const routes = repo("src/AppRoutes.tsx");
  const shell = repo("src/pages/pixel-perfect/admin/AdminShell.tsx");
  const page = repo("src/pages/pixel-perfect/admin/AdminProductSourcing.tsx");

  it("exposes a dedicated admin-only sourcing route instead of reusing seller listing creation", () => {
    expect(routes).toContain("PPAdminProductSourcing");
    expect(routes).toContain('path="product-sourcing"');
    expect(shell).toContain('to: "/admin/product-sourcing"');
    expect(page).not.toContain("/seller/products/new");
  });
  it("uses the existing governed Direct Supplier review and Phase F plan endpoints", () => {
    expect(page).toContain("/.netlify/functions/admin-direct-supplier-staging-review");
    expect(page).toContain("/.netlify/functions/admin-direct-supplier-phase-f-import-plan");
    expect(page).toContain("Supplier catalog item ID");
    expect(page).toContain("Canonical product ID");
    expect(page).toContain("Advanced mapping JSON");
    expect(page).not.toContain("admin-direct-supplier-phase-f-import-execute");
  });

  it("keeps publication and warehouse assumptions out of the first operator surface", () => {
    expect(page).toContain("No Loadify warehouse");
    expect(page).toContain("No product is published from this screen without later review gates.");
    expect(page).toContain("does not publish a marketplace listing");
    expect(page).not.toContain("picking");
    expect(page).not.toContain("packing");
  });

  it("keeps AI merchandising behind facts and review", () => {
    expect(page).toContain("AI Facts Lock");
    expect(page).toContain("/.netlify/functions/admin-ai-product-builder-brief");
    expect(page).toContain("AI provider not configured");
    expect(page).toContain("Merchandising editor & preview");
    expect(page).toContain("Draft only · not published");
    expect(page).toContain("Buyer publication is still locked");
    expect(page).toContain("Check publication gate");
    expect(page).toContain("Approve reviewed merchandising");
    expect(page).toContain("/.netlify/functions/admin-operator-merchandising-review");
    expect(page).toContain("Create governed marketplace projection");
    expect(page).toContain("/.netlify/functions/admin-supplier-marketplace-projection");
    expect(page).toContain("/.netlify/functions/admin-supplier-publication-gate");
    expect(page).toContain("Generate AI draft");
    expect(page).toContain("/.netlify/functions/admin-ai-product-builder-generate");
    expect(page).toContain("Review → Publish");
  });
});
