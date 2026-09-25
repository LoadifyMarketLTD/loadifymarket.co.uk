import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const helper = read("netlify/edge-functions/_shared/marketSeo.ts");
const product = read("netlify/edge-functions/product-meta.ts");
const category = read("netlify/edge-functions/category-meta.ts");
const publicMeta = read("netlify/edge-functions/public-meta.ts");

describe("multi-country crawler-visible edge metadata", () => {
  it("resolves GB and RO domains to native locale/currency", () => {
    expect(helper).toContain("loadifymarket.co.uk");
    expect(helper).toContain("loadifymarket.ro");
    expect(helper).toContain("ro-RO");
    expect(helper).toContain("RON");
  });

  it("filters crawler-visible product metadata by active market", () => {
    expect(product).toContain("marketCodesRestFilter(market)");
    expect(product).toContain("seoMarketContext(requestUrl)");
    expect(product).toContain("const canonicalUrl =");
  });

  it("filters category indexability by market inventory", () => {
    expect(category).toContain("marketCodesRestFilter(market)");
    expect(category).toContain("hasLiveListings(categoryIds, supabaseUrl, anonKey, marketContext.market)");
  });

  it("uses the request market domain for public-page canonical metadata", () => {
    expect(publicMeta).toContain("seoMarketContext(requestUrl)");
    expect(publicMeta).toContain("marketContext.baseUrl");
  });

  it("emits crawler-visible reciprocal hreflang links for GB and RO", () => {
    expect(helper).toContain('hreflang="en-GB"');
    expect(helper).toContain('hreflang="ro-RO"');
    expect(helper).toContain('hreflang="x-default"');
    expect(product).toContain("replaceOrInsertSeoAlternates");
    expect(category).toContain("replaceOrInsertSeoAlternates");
    expect(publicMeta).toContain("replaceOrInsertSeoAlternates");
    expect(product).toContain("marketContext.locale.replace('-', '_')");
    expect(category).toContain("marketContext.locale.replace('-', '_')");
    expect(publicMeta).toContain("marketContext.locale.replace('-', '_')");
  });
});
