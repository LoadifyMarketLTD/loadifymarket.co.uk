import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const checkout = readFileSync(resolve(process.cwd(), "netlify/functions/create-checkout.ts"), "utf8");
const paymentIntent = readFileSync(resolve(process.cwd(), "netlify/functions/create-payment-intent.ts"), "utf8");
const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260925170000_ecn_cross_border_route_decision.sql"),
  "utf8",
);

describe("ECN checkout orchestration boundary parity", () => {
  it("keeps buyer authentication and buyer-id ownership in checkout/payment orchestration", () => {
    for (const source of [checkout, paymentIntent]) {
      expect(source).toContain("authenticateActiveAccount");
      expect(source).toContain("buyerId does not match authenticated user");
    }
  });

  it("keeps rate limiting and maintenance mode outside the route decision", () => {
    expect(checkout).toContain("create_checkout_rate_limits");
    expect(paymentIntent).toContain("create_payment_intent_rate_limits");
    for (const source of [checkout, paymentIntent]) {
      expect(source).toContain("checkRateLimit");
      expect(source).toContain("isMaintenanceMode");
    }

    expect(migration).not.toContain("create_checkout_rate_limits");
    expect(migration).not.toContain("create_payment_intent_rate_limits");
    expect(migration).not.toContain("isMaintenanceMode");
  });

  it("keeps duplicate-line rejection in checkout/payment orchestration", () => {
    expect(checkout).toContain("Each product may appear only once in a checkout");
    expect(paymentIntent).toContain("Each product may appear only once in a payment");
    expect(migration).not.toContain("Each product may appear only once");
  });

  it("keeps single-seller cart enforcement in checkout/payment orchestration", () => {
    for (const source of [checkout, paymentIntent]) {
      expect(source).toContain("uniqueSellerIds");
      expect(source).toContain("For now, please complete purchases from one seller at a time.");
    }
    expect(migration).not.toContain("uniqueSellerIds");
  });

  it("keeps route authority product-scoped rather than turning it into a cart/session orchestrator", () => {
    expect(migration).toContain("p_product_id uuid");
    expect(migration).toContain("p_quantity integer DEFAULT 1");
    expect(migration).toContain("p_shipping_method_id uuid DEFAULT NULL");
    expect(migration).not.toContain("buyerId does not match authenticated user");
    expect(migration).not.toContain("reservationToken");
    expect(migration).not.toContain("release_expired_reservations");
  });
});
