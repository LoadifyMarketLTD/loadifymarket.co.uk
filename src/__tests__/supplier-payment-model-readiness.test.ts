import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260926100000_supplier_payment_model_readiness.sql"),
  "utf8",
);

describe("supplier payment-model technical readiness", () => {
  it("supports only reviewed candidate Stripe Connect models", () => {
    expect(migration).toContain("stripe_connect_direct_charge");
    expect(migration).toContain("stripe_connect_indirect_obo");
    expect(migration).toContain("unsupported_supplier_payment_model");
  });

  it("requires supplier Stripe readiness evidence", () => {
    expect(migration).toContain("server_supplier_stripe_account_readiness_v1");
    expect(migration).toContain("directChargeReady");
    expect(migration).toContain("transferRecipientReady");
  });

  it("models direct-charge balance responsibility separately", () => {
    expect(migration).toContain("v_charge_account:='connected_supplier'");
    expect(migration).toContain("v_refund_balance:='connected_supplier'");
    expect(migration).toContain("v_dispute_balance:='connected_supplier'");
    expect(migration).toContain("v_platform_loss_exposure:=false");
  });
  it("models indirect on-behalf-of platform balance exposure separately", () => {
    expect(migration).toContain("v_charge_account:='platform'");
    expect(migration).toContain("v_refund_balance:='platform'");
    expect(migration).toContain("v_dispute_balance:='platform'");
    expect(migration).toContain("v_platform_loss_exposure:=true");
  });

  it("keeps commercial selection and checkout disabled", () => {
    expect(migration).toContain("'commercialModelSelected',false");
    expect(migration).toContain("'checkoutEnabled',false");
    expect(migration).toContain("'crossBorderRouteAuthoritative',false");
    expect(migration).not.toContain("UPDATE private.supplier_marketplace_commercial_controls");
  });

  it("is service-role only", () => {
    expect(migration).toContain("FROM PUBLIC, anon, authenticated");
    expect(migration).toContain("TO service_role");
  });
});
