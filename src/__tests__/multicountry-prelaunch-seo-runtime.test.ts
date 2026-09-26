import { describe, expect, it } from "vitest";
import {
  seoAlternateLinks,
  seoMarketContext,
} from "../../netlify/edge-functions/_shared/marketSeo";

describe("Romania prelaunch SEO runtime", () => {
  it("keeps the Romania host non-indexable before launch", () => {
    const context = seoMarketContext(new URL("https://loadifymarket.ro/catalog"));
    expect(context.market).toBe("RO");
    expect(context.indexable).toBe(false);
  });

  it("does not advertise the unresolved Romania domain from UK hreflang", () => {
    const links = seoAlternateLinks("/catalog");
    expect(links).toContain('hreflang="en-GB"');
    expect(links).toContain('hreflang="x-default"');
    expect(links).not.toContain('hreflang="ro-RO"');
    expect(links).not.toContain("https://loadifymarket.ro/catalog");
  });
});
