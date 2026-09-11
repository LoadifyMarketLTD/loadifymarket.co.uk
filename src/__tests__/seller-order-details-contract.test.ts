import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "../..");
const read = (relative: string) => fs.readFileSync(path.join(root, relative), "utf8");

describe("seller order details operational contract", () => {
  it("routes seller order View to a dedicated order detail page", () => {
    const routes = read("src/AppRoutes.tsx");
    const orders = read("src/pages/pixel-perfect/seller/SellerOrders.tsx");
    expect(routes).toContain('path="orders/:orderId"');
    expect(orders).toContain("/seller/orders/${o.id}");
  });

  it("shows the immutable delivery snapshot and ordered item snapshots", () => {
    const detail = read("src/pages/pixel-perfect/seller/SellerOrderDetails.tsx");
    expect(detail).toContain("Buyer & Ship to");
    expect(detail).toContain("shippingAddress");
    expect(detail).toContain("productTitleSnapshot");
    expect(detail).toContain("productImageSnapshot");
    expect(detail).toContain("pricePerUnit");
  });
  it("enforces the approved carrier and tracking dispatch path", () => {
    const detail = read("src/pages/pixel-perfect/seller/SellerOrderDetails.tsx");
    const createShipment = read("netlify/functions/create-shipment.ts");
    expect(detail).toContain("Royal Mail");
    expect(detail).toContain("Evri");
    expect(detail).toContain("Tracking number");
    expect(detail).toContain("Confirm shipment & dispatch");
    expect(createShipment).toContain("SUPPORTED_CARRIERS");
    expect(createShipment).toContain("Tracking number is required before dispatching a physical order");
  });

  it("exposes SLA and safe accidental-dispatch correction without a fake fixed undo window", () => {
    const detail = read("src/pages/pixel-perfect/seller/SellerOrderDetails.tsx");
    const correction = read("supabase/migrations/20260911114500_add_safe_dispatch_correction.sql");
    expect(detail).toContain("Tracking SLA");
    expect(detail).toContain("Correct accidental dispatch");
    expect(detail).not.toContain("15m");
    expect(correction).toContain("courier-managed status cannot be corrected by seller");
    expect(correction).toContain("shipment has progressed beyond dispatch");
  });
});
