import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repo = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Loadify Supplier-Fulfilled checkout preparation boundary", () => {
  const endpoint = repo("netlify/functions/prepare-supplier-checkout.ts");
  const migration = repo("supabase/migrations/20260920200315_supplier_checkout_order_identity.sql");
  const multiOfferMigration = repo("supabase/migrations/20260921091538_supplier_projection_multi_offer_bindings.sql");

  it("requires an authenticated buyer and evaluates the published projection through the provider-neutral selection runtime", () => {
    expect(endpoint).toContain('authenticateActiveAccount(event, admin, ["buyer"])');
    expect(endpoint).toContain("evaluateProjectionSupplierOffers");
    expect(endpoint).toContain('"loadify_supplier_fulfilled"');
    expect(endpoint).not.toContain('.schema("private")');
  });

  it("selects one eligible supplier offer, rechecks checkout readiness, and reserves that exact offer", () => {
    expect(endpoint).toContain("evaluateProjectionSupplierOffers");
    expect(endpoint).toContain("evaluateSupplierCheckoutGuard");
    expect(endpoint).toContain("selectedOffer.externalVariantRef");
    expect(endpoint).toContain("server_prepare_supplier_checkout_selected_offer_v1");
    expect(multiOfferMigration).toContain("server_reserve_supplier_offer_v1");
    expect(multiOfferMigration).toContain("v_catalog_item.external_variant_ref");
    expect(multiOfferMigration).toContain('"supplierExternalVariantRefSnapshot"');
  });

  it("fails new supplier checkout closed until the intermediary commercial model is verified", () => {
    expect(endpoint).toContain("server_supplier_marketplace_commercial_readiness_v1");
    expect(endpoint).toContain("SUPPLIER_MARKETPLACE_COMMERCIAL_MODEL_NOT_READY");
    expect(endpoint).toContain("independent-supplier commercial model");
    expect(migration).toContain('"sellerId" IS NULL');
  });

  it("keeps payment and supplier submission downstream", () => {
    expect(endpoint).toContain("paymentSessionCreated: false");
    expect(endpoint).toContain("paymentCaptured: false");
    expect(endpoint).toContain("supplierOrderSubmitted: false");
    expect(endpoint).toContain('"supplier_marketplace_payment_session"');
    expect(migration).toContain("No Stripe session is created here");
  });

  it("keeps the selected-offer checkout preparation RPC service-role only", () => {
    expect(multiOfferMigration).toContain("SECURITY INVOKER");
    expect(multiOfferMigration).toContain("FROM PUBLIC, anon, authenticated");
    expect(multiOfferMigration).toContain("TO service_role");
  });
});
