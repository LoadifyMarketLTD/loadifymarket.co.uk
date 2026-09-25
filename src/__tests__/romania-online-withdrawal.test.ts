import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { withinWithdrawalWindow } from "../../netlify/functions/request-order-withdrawal";

const repo = (relativePath: string) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("Romania online withdrawal function", () => {
  it("keeps the statutory withdrawal declaration separate from payment mutation", () => {
    const migration = repo("supabase/migrations/20260925182500_romania_online_withdrawal_function.sql");
    const endpoint = repo("netlify/functions/request-order-withdrawal.ts");
    const modernWrapper = repo("netlify/functions-modern/request-order-withdrawal.ts");

    expect(migration).toContain("order_withdrawal_requests");
    expect(migration).toContain("REVOKE INSERT, UPDATE, DELETE");
    expect(migration).toContain("durable-medium confirmation");
    expect(endpoint).toContain("authenticateActiveCapability(event, admin, 'buyer')");
    expect(endpoint).toContain("marketCode !== 'RO'");
    expect(endpoint).toContain("RESEND_API_KEY");
    expect(endpoint).not.toContain(".from('refunds').insert");
    expect(endpoint).not.toContain("payment_intents");
    expect(modernWrapper).toContain("../functions/request-order-withdrawal");
    expect(modernWrapper).toContain("withLambda(handler)");
  });

  it("keeps the function visible in the buyer workspace and Romania legal content", () => {
    const routes = repo("src/AppRoutes.tsx");
    const shell = repo("src/pages/pixel-perfect/buyer/BuyerShell.tsx");
    const page = repo("src/pages/pixel-perfect/buyer/BuyerWithdrawal.tsx");
    const legal = repo("src/components/legal/RomaniaLegalContent.tsx");

    expect(routes).toContain('path="withdrawal"');
    expect(shell).toContain('to: "/buyer/withdrawal"');
    expect(page).toContain("Retrageți-vă din contract aici");
    expect(page).toContain("Confirmați retragerea");
    expect(legal).toContain('href="/buyer/withdrawal"');
    expect(legal).toContain("27 septembrie 2026");
  });

  it("allows withdrawal before delivery and for fourteen days after delivery", () => {
    const base = {
      id: "o1",
      orderNumber: "LM-RO-1",
      buyerId: "b1",
      sellerId: "s1",
      marketCode: "RO",
      createdAt: "2026-09-25T12:00:00.000Z",
    };

    expect(withinWithdrawalWindow({
      ...base,
      status: "paid",
      deliveredAt: null,
    }, new Date("2026-09-25T13:00:00.000Z"))).toBe(true);

    expect(withinWithdrawalWindow({
      ...base,
      status: "delivered",
      deliveredAt: "2026-09-10T12:00:00.000Z",
    }, new Date("2026-09-24T12:00:00.000Z"))).toBe(true);

    expect(withinWithdrawalWindow({
      ...base,
      status: "delivered",
      deliveredAt: "2026-09-10T12:00:00.000Z",
    }, new Date("2026-09-24T12:00:01.000Z"))).toBe(false);
  });

  it("fails closed for non-Romania or terminal orders", () => {
    const base = {
      id: "o1",
      orderNumber: "LM-1",
      buyerId: "b1",
      sellerId: "s1",
      createdAt: "2026-09-25T12:00:00.000Z",
      deliveredAt: null,
    };

    expect(withinWithdrawalWindow({ ...base, marketCode: "GB", status: "paid" })).toBe(false);
    expect(withinWithdrawalWindow({ ...base, marketCode: "RO", status: "cancelled" })).toBe(false);
    expect(withinWithdrawalWindow({ ...base, marketCode: "RO", status: "refunded" })).toBe(false);
  });
});
