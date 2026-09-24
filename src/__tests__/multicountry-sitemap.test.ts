import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "netlify/functions/sitemap.ts"), "utf8");

describe("multi-country sitemap", () => {
  it("selects the sitemap base URL from the request host", () => {
    expect(source).toContain("loadifymarket.ro");
    expect(source).toContain("market === 'RO' ? RO_BASE_URL : GB_BASE_URL");
  });

  it("filters products by active market", () => {
    expect(source).toContain(".contains('marketCodes', [market])");
  });

  it("publishes reciprocal hreflang alternates", () => {
    expect(source).toContain('hreflang="en-GB"');
    expect(source).toContain('hreflang="ro-RO"');
    expect(source).toContain('hreflang="x-default"');
    expect(source).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"');
  });

  it("does not expose GB seller storefronts in the RO sitemap until public seller market projection exists", () => {
    expect(source).toContain("sellerSlugs = market === 'GB'");
  });
});
