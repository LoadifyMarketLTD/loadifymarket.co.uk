import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { adaptProduct, type DBProduct } from "@/lib/productAdapter";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

function fixture(overrides: Partial<DBProduct> = {}): DBProduct {
  return {
    id: "product-1",
    title: "Handmade Gift Box",
    description: "Longer product description for the detail page.",
    price: 9.99,
    images: ["/gift.jpg"],
    condition: "new",
    stockQuantity: 2,
    views: 0,
    rating: 0,
    reviewCount: 0,
    createdAt: new Date().toISOString(),
    sellerId: "seller-1",
    listingContext: "product",
    isActive: true,
    isApproved: true,
    listingStatus: "active",
    category: { name: "Handmade", slug: "handmade" },
    subcategory: null,
    specifications: {
      shortDescription: "Elegant handmade gift ready to present.",
    },
    seller: {
      userId: "seller-1",
      businessName: "Angelica Toda",
      isApproved: true,
      rating: 0,
      businessAddress: {
        city: "BLACKBURN",
        country: "United Kingdom",
      },
    },
    ...overrides,
  };
}

describe("catalog product card content", () => {
  it("maps short description, price, stock wording inputs and public seller location", () => {
    const product = adaptProduct(fixture());

    expect(product.description).toBe("Elegant handmade gift ready to present.");
    expect(product.price).toBe(9.99);
    expect(product.unitCount).toBe(2);
    expect(product.listingContext).toBe("product");
    expect(product.location).toBe("Blackburn, United Kingdom");
  });

  it("prefers an explicit listing location over seller location", () => {
    const product = adaptProduct(fixture({
      specifications: {
        shortDescription: "Short description",
        location: "Manchester, UK",
      },
    }));

    expect(product.location).toBe("Manchester, UK");
  });

  it("falls back to the product description when shortDescription is absent", () => {
    const product = adaptProduct(fixture({ specifications: {} }));
    expect(product.description).toBe("Longer product description for the detail page.");
  });

  it("renders the missing commercial information without showing empty engagement counters", () => {
    const card = read("src/components/catalog/ProductCard.tsx");
    expect(card).toContain("formatPrice(product.price)");
    expect(card).toContain("product.description");
    expect(card).toContain("`${product.unitCount} available`");
    expect(card).toContain("product.location &&");
    expect(card).toContain("product.views > 0");
    expect(card).toContain("No reviews yet");
    expect(card).not.toContain('product.unitCount === 1 ? "lot" : "lots"');
  });

  it("fetches the public business address needed for catalog location", () => {
    const catalog = read("src/pages/pixel-perfect/Catalog.tsx");
    expect(catalog).toContain('select("userId, businessName, isApproved, rating, businessAddress")');
  });
});
