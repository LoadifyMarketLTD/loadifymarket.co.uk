import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
const seo = readFileSync(resolve(process.cwd(), "src/components/SEO.tsx"), "utf8");
describe("multi-country SEO domains", () => {
  it("uses the active market domain for canonical URLs", () => {
    expect(seo).toContain('market === "RO" ? "https://loadifymarket.ro" : BASE_URL');
  });
  it("publishes reciprocal GB and RO hreflang alternates", () => {
    expect(seo).toContain('hrefLang="en-GB"');
    expect(seo).toContain('hrefLang="ro-RO"');
    expect(seo).toContain('hrefLang="x-default"');
  });
  it("publishes market-specific locale metadata", () => {
    expect(seo).toContain('market === "RO" ? "ro_RO" : "en_GB"');
    expect(seo).toContain('content={config.locale}');
  });
  it("uses the active market domain for the default social image", () => {
    expect(seo).toContain('ogImage ?? `${activeBaseUrl}/og-loadify-market.png`');
    expect(seo).toContain('content={resolvedOgImage}');
  });
});
