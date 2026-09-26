import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const helper = read("netlify/edge-functions/_shared/marketSeo.ts");
const product = read("netlify/edge-functions/product-meta.ts");
const category = read("netlify/edge-functions/category-meta.ts");
const publicMeta = read("netlify/edge-functions/public-meta.ts");

describe("multi-country crawler-visible edge metadata", () => {
  it("resolves GB and RO domains but marks Romania indexable only when live", () => {
    expect(helper).toContain("loadifymarket.co.uk");
    expect(helper).toContain("loadifymarket.ro");
    expect(helper).toContain("ro-RO");
    expect(helper).toContain("RON");
    expect(helper).toContain("indexable: MARKET_CONFIG.RO.status === 'live'");
    expect(helper).toContain("indexable: true");
  });

  it("publishes Romania hreflang only after launch", () => {
    expect(helper).toContain("MARKET_CONFIG.RO.status === 'live'");
    expect(helper).toContain('hreflang="en-GB"');
    expect(helper).toContain('hreflang="ro-RO"');
    expect(helper).toContain('hreflang="x-default"');
  });

  it("fails prelaunch Romania product/category/public metadata closed", () => {
    expect(product).toContain("if (!marketContext.indexable)");
    expect(product).toContain("noindexHtmlResponse");
    expect(category).toContain("if (!marketContext.indexable)");
    expect(category).toContain("'noindex, nofollow'");
    expect(publicMeta).toContain("if (!marketContext.indexable)");
    expect(publicMeta).toContain("'noindex, nofollow'");
  });

  it("still filters crawler-visible inventory by active market", () => {
    expect(product).toContain("marketCodesRestFilter(market)");
    expect(category).toContain("marketCodesRestFilter(market)");
    expect(product).toContain("seoMarketContext(requestUrl)");
    expect(category).toContain("seoMarketContext(requestUrl)");
  });
});
