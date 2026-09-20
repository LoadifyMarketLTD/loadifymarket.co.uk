import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repo = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("supplier fulfilled buyer UI contract", () => {
  const catalog = repo("src/lib/supplierCatalog.ts");
  const grid = repo("src/hooks/useMobileGrid.ts");
  const detail = repo("src/pages/pixel-perfect/ProductDetail.tsx");
  const cart = repo("src/contexts/CartContext.tsx");
  const checkout = repo("src/pages/pixel-perfect/Checkout.tsx");
  const orders = repo("src/pages/pixel-perfect/buyer/BuyerOrders.tsx");

  it("merges governed supplier catalog without inventing a seller id", () => {
    expect(catalog).toContain('commercialMode: "loadify_supplier_fulfilled"');
    expect(catalog).toContain('seller: "Loadify Market"');
    expect(catalog).not.toContain("sellerId:");
    expect(grid).toContain("fetchSupplierCatalog()");
  });
  it("supports supplier product detail and cart revalidation", () => {
    expect(detail).toContain("fetchSupplierCatalogItem(id)");
    expect(detail).toContain("isSupplierFulfilled");
    expect(cart).toContain('commercialMode === "loadify_supplier_fulfilled"');
    expect(cart).toContain("fetchSupplierCatalogItem(item.product.id)");
  });

  it("keeps supplier checkout separate and in-app", () => {
    expect(checkout).toContain("/.netlify/functions/prepare-supplier-checkout");
    expect(checkout).toContain("/.netlify/functions/create-supplier-payment-intent");
    expect(checkout).toContain("<Elements");
    expect(checkout).toContain("<SupplierPaymentPanel");
    expect(checkout).toContain("must be checked out separately");
  });

  it("projects supplier runtime status into buyer orders", () => {
    expect(orders).toContain("/.netlify/functions/supplier-order-status?orderId=");
    expect(orders).toContain("supplierRuntimeStatus");
    expect(orders).toContain("Sold by Loadify Market");
  });
});
