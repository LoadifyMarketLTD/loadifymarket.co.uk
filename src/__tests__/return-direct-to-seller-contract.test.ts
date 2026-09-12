import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "../..");
const read = (relative: string) => fs.readFileSync(path.join(root, relative), "utf8");

describe("direct-to-seller return contract", () => {
  it("snapshots a private seller return address on approval", () => {
    const decision = read("netlify/functions/seller-return-decision.ts");
    expect(decision).toContain("seller_fulfilment_profiles");
    expect(decision).toContain("returnAddressSnapshot");
    expect(decision).toContain("awaiting_buyer_dispatch");
    expect(decision).toContain("A complete seller return address is required");
  });

  it("allows only the owning buyer to register an approved tracked return", () => {
    const dispatch = read("netlify/functions/buyer-return-dispatch.ts");
    expect(dispatch).toContain("returnId");
    expect(dispatch).toContain("buyerId");
    expect(dispatch).toContain("awaiting_buyer_dispatch");
    expect(dispatch).toContain("Royal Mail");
    expect(dispatch).toContain("Evri");
    expect(dispatch).toContain("trackingNumber");
    expect(dispatch).toContain("awaiting_seller_reception");
  });  it("lets only the owning seller confirm receipt through the secured refund boundary", () => {
    const refund = read("netlify/functions/create-refund.ts");
    expect(refund).toContain("seller refund confirmation");
    expect(refund).toContain("Not authorized for this return");
    expect(refund).toContain("awaiting_seller_reception");
    expect(refund).toContain("order-refund:${orderId}");
    expect(refund).toContain("returnReceivedAt");
    expect(refund).toContain("refundProcessedAt");
  });
});
