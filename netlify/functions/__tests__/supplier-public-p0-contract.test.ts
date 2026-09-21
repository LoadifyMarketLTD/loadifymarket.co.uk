import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repo = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("supplier public P0 contract", () => {
  const card = repo("src/components/catalog/ProductCard.tsx");
  const info = repo("src/components/product/ProductInfo.tsx");
  const detail = repo("src/pages/pixel-perfect/ProductDetail.tsx");
  const cart = repo("src/pages/pixel-perfect/Cart.tsx");
  const checkout = repo("src/pages/pixel-perfect/Checkout.tsx");
  const publish = repo("netlify/functions/admin-publish-supplier-projection.ts");

  it("uses supplier-aware buyer-facing labels instead of seller-only claims", () => {
    expect(card).toContain("Supplier fulfilled");
    expect(info).toContain("Approved Supplier Fulfilment");
    expect(info).toContain("Loadify Market does not operate a warehouse.");
    expect(info).toContain('isSupplierFulfilled ? "Buy Now" : "Buy from Seller"');
    expect(detail).toContain('isSupplierFulfilled ? "Sold by" : "Seller"');
    expect(detail).toContain("!isSupplierFulfilled &&");
  });

  it("blocks mixed commerce carts before checkout and uses supplier-aware delivery and VAT wording", () => {
    expect(cart).toContain("isMixedCommerceCart");
    expect(cart).toContain("hasMultipleSupplierProducts");
    expect(cart).toContain("Supplier-fulfilled products and independent seller products must be purchased separately.");
    expect(cart).toContain('supplierOnlyCart ? "Supplier fulfilment"');
    expect(cart).toContain('supplierItems.length > 0 ? "VAT"');
    expect(checkout).toContain('supplierOnlyCart ? "VAT"');
  });

  it("hands a published supplier product to the live revalidation checkout path", () => {
    expect(publish).toContain("checkoutEnabled: true");
    expect(publish).toContain('nextGate: "buyer_checkout_revalidation"');
  });

  it("offsets non-section corporate pages below the fixed mobile header", () => {
    for (const file of ["PlatformPage.tsx", "BuyersPage.tsx", "SellersPage.tsx", "PartnersPage.tsx", "HowItWorksPage.tsx", "TrustPage.tsx"]) {
      expect(repo("src/pages/public/" + file)).toContain('pt-[82px] md:pt-[122px]');
    }
  });
});