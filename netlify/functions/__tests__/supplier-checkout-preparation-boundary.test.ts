import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repo = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Loadify Supplier-Fulfilled checkout preparation boundary", () => {
  const endpoint = repo("netlify/functions/prepare-supplier-checkout.ts");
  const migration = repo("supabase/migrations/20260920200315_supplier_checkout_order_identity.sql");

  it("requires an authenticated buyer and published supplier projection", () => {
    expect(endpoint).toContain('authenticateActiveAccount(event, admin, ["buyer"])');
    expect(endpoint).toContain('"supplier_marketplace_projections"');
    expect(endpoint).toContain('projection.status !== "published"');
    expect(endpoint).toContain('"loadify_supplier_fulfilled"');
  });

  it("re-evaluates checkout and economics before reserving stock", () => {
    expect(endpoint).toContain("evaluateSupplierCheckoutGuard");
    expect(endpoint).toContain("evaluateSupplierEconomics");
    expect(endpoint).toContain("server_prepare_supplier_checkout_v1");
    expect(migration).toContain("server_reserve_supplier_offer_v1");
  });

  it("uses the canonical order truth without a fake marketplace seller", () => {
    expect(migration).toContain('"sellerId" IS NULL');
    expect(migration).toContain("'loadify_supplier_fulfilled'");
    expect(migration).toContain("'XDrive Logistics Ltd trading as Loadify Market'");
    expect(migration).toContain("'Loadify Market'");
  });

  it("keeps payment and supplier submission downstream", () => {
    expect(endpoint).toContain("paymentSessionCreated: false");
    expect(endpoint).toContain("paymentCaptured: false");
    expect(endpoint).toContain("supplierOrderSubmitted: false");
    expect(endpoint).toContain('"loadify_merchant_of_record_payment_session"');
    expect(migration).toContain("No Stripe session is created here");
  });

  it("keeps the checkout preparation RPC service-role only", () => {
    expect(migration).toContain("SECURITY INVOKER");
    expect(migration).toContain("FROM PUBLIC, anon, authenticated");
    expect(migration).toContain("TO service_role");
  });
});
