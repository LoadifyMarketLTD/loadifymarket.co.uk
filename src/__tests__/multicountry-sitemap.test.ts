import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "netlify/functions/sitemap.ts"), "utf8");

describe("multi-country sitemap", () => {
  it("selects the sitemap market from the request host", () => {
    expect(source).toContain("loadifymarket.ro");
    expect(source).toContain("market === 'RO' ? RO_BASE_URL : GB_BASE_URL");
  });

  it("keeps Romania sitemap empty and noindex during prelaunch", () => {
    expect(source).toContain("market === 'RO' && MARKET_CONFIG.RO.status !== 'live'");
    expect(source).toContain("'X-Robots-Tag': 'noindex, nofollow'");
    expect(source).toContain("'<urlset xmlns=");
    expect(source).toContain("'</urlset>'");
  });

  it("publishes the Romania hreflang only after Romania is live", () => {
    expect(source).toContain("MARKET_CONFIG.RO.status === 'live'");
    expect(source).toContain('hreflang="en-GB"');
    expect(source).toContain('hreflang="ro-RO"');
    expect(source).toContain('hreflang="x-default"');
  });

  it("filters products and sellers by the active market", () => {
    expect(source).toContain(".contains('marketCodes', [market])");
    expect(source).toContain(".select('userId,marketCodes')");
    expect(source).toContain("row.marketCodes?.includes(market)");
  });
});
