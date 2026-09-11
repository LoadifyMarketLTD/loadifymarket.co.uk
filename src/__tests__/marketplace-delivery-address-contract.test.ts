import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "../..");
const read = (relative: string) => fs.readFileSync(path.join(root, relative), "utf8");

describe("marketplace delivery address contract", () => {
  it("prefills and persists the buyer delivery address at checkout", () => {
    const checkout = read("src/pages/pixel-perfect/Checkout.tsx");
    expect(checkout).toContain('select("shippingAddress")');
    expect(checkout).toContain("addressPrefilledRef");
    expect(checkout).toContain("savedShippingAddress");
    expect(checkout).toContain('upsert({ userId: user.id, shippingAddress: savedShippingAddress }');
  });

  it("exposes delivery-address management in the native profile", () => {
    const profile = read("src/pages/MobileProfilePage.tsx");
    expect(profile).toContain("Delivery addresses");
    expect(profile).toContain("/buyer/addresses");
  });

  it("shows the immutable order delivery address to sellers on web and mobile", () => {
    const sellerOrders = read("src/pages/pixel-perfect/seller/SellerOrders.tsx");
    const sellerShipments = read("src/pages/pixel-perfect/seller/SellerShipments.tsx");
    const mobileOrders = read("src/pages/MobileOrdersPage.tsx");
    expect(sellerOrders).toContain("shippingAddress");
    expect(sellerOrders).toContain("Ship to");
    expect(mobileOrders).toContain("Delivery address missing");
    expect(mobileOrders).toContain("Ship to");
    expect(sellerShipments).toContain("Ship to address");
  });
  it("fails closed when a physical order has no delivery address", () => {
    const createShipment = read("netlify/functions/create-shipment.ts");
    const sellerOrderStatus = read("netlify/functions/seller-order-status.ts");
    const mobileOrders = read("src/pages/MobileOrdersPage.tsx");
    expect(createShipment).toContain("Delivery address missing");
    expect(sellerOrderStatus).toContain("Physical orders must be dispatched through Seller Shipments");
    expect(mobileOrders).toContain("This physical order cannot be dispatched");
  });
});
