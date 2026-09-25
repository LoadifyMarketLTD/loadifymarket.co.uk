import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repo = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Loadify Supplier-Fulfilled payment and handshake boundary", () => {
  const payment = repo("netlify/functions/create-supplier-payment-intent.ts");
  const webhook = repo("netlify/functions/stripe-webhook.ts");
  const migration = repo("supabase/migrations/20260920201105_supplier_payment_completion.sql");

  it("blocks new supplier marketplace payment until the intermediary settlement model is verified", () => {
    expect(payment).toContain("server_supplier_marketplace_commercial_readiness_v1");
    expect(payment).toContain("SUPPLIER_MARKETPLACE_COMMERCIAL_MODEL_NOT_READY");
    expect(payment).not.toContain('merchantOfRecord: "Loadify Market"');
  });

  it("rechecks supplier stock/price before payment creation", () => {
    expect(payment).toContain("server_supplier_stock_price_decision_v1");
    expect(payment).toContain("Supplier stock or price is no longer valid");
  });

  it("routes supplier payment success away from marketplace seller materialization", () => {
    expect(webhook).toContain("pendingSession.metadata?.commercialMode === 'loadify_supplier_fulfilled'");
    expect(webhook).toContain("server_complete_supplier_payment_v1");
    expect(webhook).toContain("return;");
  });

  it("atomically marks the canonical order paid and prepares the existing supplier handshake", () => {
    expect(migration).toContain("status='completed'");
    expect(migration).toContain("status='paid'");
    expect(migration).toContain("server_prepare_supplier_order_handshake_v1");
    expect(migration).toContain("provider-neutral supplier-order handshake");
    expect(migration).toContain("It does not submit to a supplier provider");
  });

  it("keeps payment completion RPC service-role only", () => {
    expect(migration).toContain("SECURITY INVOKER");
    expect(migration).toContain("FROM PUBLIC, anon, authenticated");
    expect(migration).toContain("TO service_role");
  });
});
