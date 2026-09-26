import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260926094500_supplier_stripe_account_binding.sql"),
  "utf8",
);

describe("supplier Stripe account binding foundation", () => {
  it("creates a supplier-specific Stripe binding separate from seller profiles", () => {
    expect(migration).toContain("private.supplier_stripe_account_bindings");
    expect(migration).toContain("supplier_id uuid NOT NULL UNIQUE");
    expect(migration).toContain("stripe_account_id text NOT NULL UNIQUE");
    expect(migration).not.toContain("seller_profiles");
  });

  it("requires reviewed evidence before a binding can be verified", () => {
    expect(migration).toContain("status <> 'verified'");
    expect(migration).toContain("verified_at IS NOT NULL");
    expect(migration).toContain("verified_by IS NOT NULL");
    expect(migration).toContain("evidence <> '{}'::jsonb");
  });

  it("reports direct-charge and transfer-recipient readiness separately", () => {
    expect(migration).toContain("v_direct_charge_ready");
    expect(migration).toContain("v_transfer_recipient_ready");
    expect(migration).toContain("'directChargeReady'");
    expect(migration).toContain("'transferRecipientReady'");
  });
  it("requires active card capability for direct charges", () => {
    expect(migration).toContain("v_binding.charges_enabled=true");
    expect(migration).toContain("v_binding.card_payments_status='active'");
  });

  it("requires active transfer capability for transfer-recipient readiness", () => {
    expect(migration).toContain("v_binding.transfers_status='active'");
    expect(migration).toContain("v_binding.payouts_enabled=true");
  });

  it("fails closed on supplier or country mismatch", () => {
    expect(migration).toContain("approved_supplier_not_found");
    expect(migration).toContain("supplier_stripe_account_binding_missing");
    expect(migration).toContain("supplier_stripe_country_mismatch");
  });

  it("does not activate checkout or choose settlement semantics", () => {
    expect(migration).not.toContain("UPDATE private.supplier_marketplace_commercial_controls");
    expect(migration).not.toContain("checkout_enabled=true");
    expect(migration).not.toContain("stripe.paymentIntents");
    expect(migration).toContain("does not select or activate a commercial settlement model");
  });

  it("is service-role only", () => {
    expect(migration).toContain("FROM PUBLIC, anon, authenticated");
    expect(migration).toContain("TO service_role");
  });
});
