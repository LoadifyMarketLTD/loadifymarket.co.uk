import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const seo = readFileSync(resolve(process.cwd(), "src/components/SEO.tsx"), "utf8");
const marketConfig = readFileSync(resolve(process.cwd(), "src/lib/marketConfig.ts"), "utf8");

describe("multi-country SEO domains", () => {
  it("keeps Romania explicitly prelaunch", () => {
    expect(marketConfig).toContain("status: 'prelaunch'");
    expect(marketConfig).toContain("checkoutEnabled: false");
  });

  it("uses the Romania domain only when Romania SEO is live", () => {
    expect(seo).toContain('const roSeoLive = MARKET_CONFIG.RO.status === "live"');
    expect(seo).toContain('market === "RO" && roSeoLive ? "https://loadifymarket.ro" : BASE_URL');
  });

  it("suppresses the Romania alternate until launch", () => {
    expect(seo).toContain("const roAlternateUrl = roSeoLive && alternatePath");
    expect(seo).toContain('hrefLang="en-GB"');
    expect(seo).toContain('hrefLang="ro-RO"');
    expect(seo).toContain('hrefLang="x-default"');
  });

  it("makes the prelaunch Romania surface non-indexable", () => {
    expect(seo).toContain('const marketSeoIndexable = market !== "RO" || roSeoLive');
    expect(seo).toContain('const effectiveRobots = marketSeoIndexable ? robots : "noindex, nofollow"');
    expect(seo).toContain('content={effectiveRobots}');
  });

  it("keeps market-specific locale metadata", () => {
    expect(seo).toContain('market === "RO" ? "ro_RO" : "en_GB"');
    expect(seo).toContain('content={config.locale}');
  });
});
