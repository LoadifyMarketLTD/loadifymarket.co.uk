import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("multi-country public commerce surfaces", () => {
  it("filters category and deals pages by the active market", () => {
    const category = read("src/pages/pixel-perfect/CategoryPage.tsx");
    const deals = read("src/pages/pixel-perfect/Deals.tsx");
    expect(category).toContain('.contains("marketCodes", [market])');
    expect(deals).toContain('.contains("marketCodes", [market])');
    expect(category).toContain("marketConfig.currency");
    expect(deals).toContain("marketConfig.currency");
  });

  it("filters wishlist products and preserves their currency", () => {
    const wishlist = read("src/pages/pixel-perfect/buyer/BuyerWishlist.tsx");
    expect(wishlist).toContain('.contains("marketCodes", [market])');
    expect(wishlist).toContain("formatPrice(item.price ?? 0, item.currency ?? 'GBP')");
  });

  it("reconciles the cart against the active market", () => {
    const cart = read("src/contexts/CartContext.tsx");
    expect(cart).toContain('.contains("marketCodes", [market])');
    expect(cart).toContain('market === "GB"');
    expect(cart).toContain('eligibleMarkets.includes(market)');
    expect(cart).toContain('currency: row.currency ?? item.product.currency ?? "GBP"');
  });

  it("keeps homepage and supplier catalog market-aware", () => {
    const featured = read("src/components/FeaturedProducts.tsx");
    const supplierClient = read("src/lib/supplierCatalog.ts");
    const supplierApi = read("netlify/functions/supplier-catalog.ts");
    expect(featured).toContain('.contains("marketCodes", [market])');
    expect(featured).toContain("fetchSupplierCatalog(market)");
    expect(supplierClient).toContain("market=${market}");
    expect(supplierApi).toContain('market !== "GB" && market !== "RO"');
    expect(supplierApi).toContain("territory: market");
  });

  it("uses market domain and currency for product sharing", () => {
    const share = read("src/lib/shareProduct.ts");
    const detail = read("src/pages/pixel-perfect/ProductDetail.tsx");
    expect(share).toContain('market === "RO" ? "https://loadifymarket.ro" : "https://loadifymarket.co.uk"');
    expect(share).toContain("formatMoney({ amount: product.price, currency })");
    expect(detail).toContain("toAbsolutePublicUrl(primaryImageCandidate, marketBaseUrl)");
  });
});
