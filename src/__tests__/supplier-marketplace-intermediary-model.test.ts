import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repo = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("supplier marketplace intermediary ownership model", () => {
  const control = repo("supabase/migrations/20260925213500_supplier_marketplace_intermediary_control.sql");
  const prepare = repo("netlify/functions/prepare-supplier-checkout.ts");
  const payment = repo("netlify/functions/create-supplier-payment-intent.ts");
  const catalog = repo("netlify/functions/supplier-catalog.ts");
  const catalogAdapter = repo("src/lib/supplierCatalog.ts");
  const meta = repo("netlify/edge-functions/product-meta.ts");
  const terms = repo("src/pages/pixel-perfect/TermsAndConditions.tsx");
  const buyerTerms = repo("src/pages/pixel-perfect/BuyerTerms.tsx");
  const returns = repo("src/pages/pixel-perfect/ReturnsPolicy.tsx");
  const shipping = repo("src/pages/pixel-perfect/ShippingPolicy.tsx");
  const checkout = repo("src/pages/pixel-perfect/Checkout.tsx");
  const paymentPanel = repo("src/components/checkout/SupplierPaymentPanel.tsx");
  const buyerOrders = repo("src/pages/pixel-perfect/buyer/BuyerOrders.tsx");
  const adminOrders = repo("src/pages/pixel-perfect/admin/AdminOrders.tsx");
  const email = repo("netlify/functions/send-email.ts");
  const roLegal = repo("src/components/legal/RomaniaLegalContent.tsx");

  it("codifies that Loadify does not own or pre-purchase supplier inventory", () => {
    expect(control).toContain("supplier_is_seller_of_record boolean NOT NULL DEFAULT true");
    expect(control).toContain("loadify_owns_inventory boolean NOT NULL DEFAULT false");
    expect(control).toContain("loadify_prepurchases_inventory boolean NOT NULL DEFAULT false");
    expect(control).toContain("CHECK (supplier_is_seller_of_record = true)");
    expect(control).toContain("CHECK (loadify_owns_inventory = false)");
    expect(control).toContain("CHECK (loadify_prepurchases_inventory = false)");
  });

  it("seeds GB and RO supplier marketplace checkout fail-closed", () => {
    expect(control).toContain("'GB'");
    expect(control).toContain("'RO'");
    expect(control).toContain("'blocked'");
    expect(control).toContain("checkout_enabled");
    expect(control).toContain("'unconfigured'");
  });

  it("requires reviewed settlement evidence before supplier marketplace checkout can open", () => {
    expect(control).toContain("status <> 'verified'");
    expect(control).toContain("settlement_model <> 'unconfigured'");
    expect(control).toContain("evidence <> '{}'::jsonb");
    expect(control).toContain("reviewed_by IS NOT NULL");
    expect(control).toContain("reviewed_at IS NOT NULL");
  });

  it("blocks checkout and payment until the intermediary commercial model is ready", () => {
    for (const source of [prepare, payment]) {
      expect(source).toContain("server_supplier_marketplace_commercial_readiness_v1");
      expect(source).toContain("SUPPLIER_MARKETPLACE_COMMERCIAL_MODEL_NOT_READY");
    }
    expect(payment).not.toContain('merchantOfRecord: "Loadify Market"');
    expect(prepare).toContain('"supplier_marketplace_payment_session"');
  });

  it("projects approved supplier identity into catalog and SEO instead of Loadify seller identity", () => {
    expect(catalog).toContain("server_supplier_marketplace_identity_v1");
    expect(catalog).toContain("supplierName");
    expect(catalogAdapter).toContain('seller: item.supplierName?.trim() || "Independent supplier"');
    expect(meta).toContain("supplierName");
    expect(meta).toContain("supplierLegalName");
    expect(meta).not.toContain("legalName: LEGAL_OPERATOR_NAME");
  });

  it("keeps buyer/admin/email/legal copy aligned with the marketplace ownership model", () => {
    const sources = [terms, buyerTerms, returns, shipping, checkout, paymentPanel, buyerOrders, adminOrders, email, roLegal];
    for (const source of sources) {
      expect(source).not.toContain("Loadify is the seller and merchant of record");
      expect(source).not.toContain("Loadify remains your seller and merchant of record");
      expect(source).not.toContain("Loadify remains the buyer's customer-facing seller");
      expect(source).not.toContain("Loadify Supplier-Fulfilled orders are sold by Loadify Market");
      expect(source).not.toContain("Sold by Loadify Market");
    }
    expect(checkout).toContain("supplier owns or controls the stock");
    expect(paymentPanel).toContain("independent supplier");
    expect(adminOrders).toContain("independent supplier is the seller of record");
    expect(email).toContain("independent supplier identified for the order");
  });

  it("keeps the commercial readiness and supplier identity RPCs service-role only", () => {
    expect(control).toContain("server_supplier_marketplace_commercial_readiness_v1");
    expect(control).toContain("server_supplier_marketplace_identity_v1");
    expect(control).toContain("FROM PUBLIC, anon, authenticated");
    expect(control).toContain("TO service_role");
  });
});
