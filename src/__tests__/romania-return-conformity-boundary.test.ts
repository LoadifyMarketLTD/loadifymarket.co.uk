import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { evaluateCustomerReturnAutomation } from "../../netlify/functions/_shared/customerReturnAutomation";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Romania return / conformity boundary", () => {
  it("applies the 14-day deadline to changed-mind withdrawal requests", () => {
    const result = evaluateCustomerReturnAutomation({
      orderStatus: "delivered",
      deliveredAt: "2026-08-01T10:00:00.000Z",
      requestedAt: new Date("2026-08-31T10:00:00.000Z"),
      purchasedQuantity: 1,
      requestedQuantity: 1,
      reasonCode: "changed_mind",
      supplierReturnCapability: true,
      carrierLabelCapability: true,
    });
    expect(result.decision).toBe("ineligible");
    expect(result.reason).toBe("withdrawal_window_expired");
  });

  it("does not misuse the withdrawal deadline for damaged / non-conforming goods", () => {
    for (const reasonCode of ["damaged", "wrong_item", "not_as_described"]) {
      const result = evaluateCustomerReturnAutomation({
        orderStatus: "delivered",
        deliveredAt: "2026-08-01T10:00:00.000Z",
        requestedAt: new Date("2026-08-31T10:00:00.000Z"),
        purchasedQuantity: 1,
        requestedQuantity: 1,
        reasonCode,
        supplierReturnCapability: true,
        carrierLabelCapability: false,
      });
      expect(result.decision).toBe("eligible_for_return_request");
    }
  });

  it("routes buyer return creation through server authority rather than direct browser insert", () => {
    const page = read("src/pages/pixel-perfect/buyer/BuyerOrders.tsx");
    const endpoint = read("netlify/functions/request-customer-return.ts");
    expect(page).toContain('/.netlify/functions/request-customer-return');
    expect(page).not.toContain('supabase.from("returns").insert');
    expect(endpoint).toContain("authenticateActiveAccount(event, admin, ['buyer'])");
    expect(endpoint).toContain("server_market_compliance_readiness_v1");
    expect(endpoint).toContain("evaluateCustomerReturnAutomation");
  });
});
