import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repo = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("supplier public P1 content contract", () => {
  const home = repo("src/pages/public/PresentationHomePage.tsx");
  const suppliers = repo("src/pages/public/SuppliersPage.tsx");
  const technology = repo("src/pages/public/TechnologyPage.tsx");
  const integrations = repo("src/pages/public/IntegrationsPage.tsx");
  const footer = repo("src/components/Footer.tsx");
  const routes = repo("src/AppRoutes.tsx");
  const sitemap = repo("netlify/functions/sitemap.ts");
  const redirects = repo("public/_redirects");

  it("surfaces the governed supplier and AI story on the homepage without claiming Loadify warehouse ownership", () => {
    expect(home).toContain("Supplier Foundation + AI Product Builder");
    expect(home).toContain("Direct supplier route");
    expect(home).toContain("Loadify does not operate a warehouse");
    expect(home).toContain("Human approval remains required");
  });

  it("documents the real provider-neutral supplier transport model", () => {
    for (const marker of ["API", "JSON", "CSV", "XML", "Feed URL", "SFTP", "Manual catalogue"]) {
      expect(suppliers).toContain(marker);
    }
    expect(suppliers).toContain("Supplier credentials remain server-side");
    expect(suppliers).toContain("Supplier approval and product publication are separate decisions");
  });

  it("keeps AI assistance outside factual authority and automatic publication", () => {
    expect(technology).toContain("AI for merchandising, not for inventing product truth");
    expect(technology).toContain("No fact verification by AI");
    expect(technology).toContain("No rights bypass");
    expect(technology).toContain("No automatic publication");
  });

  it("keeps catalogue acquisition separate from provider writes and financial mutations", () => {
    expect(integrations).toContain("Provider-neutral catalogue connectivity");
    expect(integrations).toContain("Order and financial mutations require separate authorised capability");
    expect(integrations).toContain("One integration does not automatically unlock every commerce function");
  });

  it("updates footer taxonomy for supplier commerce", () => {
    expect(footer).toContain("Sell &amp; Supply");
    expect(footer).toContain('to="/suppliers">Supplier Hub');
    expect(footer).toContain('to="/integrations">Supplier Integrations');
    expect(footer).toContain("Loadify does not operate a warehouse");
  });

  it("retires the old wholesale information page with a crawler-visible canonical redirect", () => {
    expect(routes).not.toContain("PPWholesaleInfo");
    expect(routes).toContain('<Route path="wholesale-info" element={<Navigate to="/trade" replace />} />');
    expect(sitemap).not.toContain("{ loc: '/wholesale-info'");
    expect(redirects).toContain("/wholesale-info                       /trade                           301!");
  });
});