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
});
