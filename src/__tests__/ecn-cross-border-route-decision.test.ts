import { readFileSync } from "node:fs";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260925170000_ecn_cross_border_route_decision.sql"),
  "utf8",
);

describe("ECN cross-border route decision", () => {
  it("is read-only and service-role only", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.server_cross_border_product_decision_v1");
    expect(migration).toContain("TO service_role");
    expect(migration).toContain("FROM PUBLIC,anon,authenticated");
  });

  it("keeps destination country separate from destination market", () => {
    expect(migration).toContain("p_destination_country text");
    expect(migration).toContain("p_destination_market text");
    expect(migration).toContain("v_route_key:=v_origin || '-' || v_destination_country");
    expect(migration).toContain("AND destination_market=v_destination_market");
  });

  it("allows implicit origin only for the existing GB domestic baseline", () => {
    expect(migration).toContain("v_destination_country='GB'");
    expect(migration).toContain("v_destination_market='GB'");
    expect(migration).toContain("v_origin:='GB'");
    expect(migration).toContain("v_legacy_gb_origin:=true");
    expect(migration).toContain("Never use implicit origin for Romania");
  });

  it("requires explicit dispatch location outside legacy GB and tracks verification", () => {
    expect(migration).toContain("DISPATCH_LOCATION_MISSING");
    expect(migration).toContain("dispatch_location_required");
    expect(migration).toContain("DISPATCH_LOCATION_UNVERIFIED");
    expect(migration).toContain("v_location.verification_status='verified'");
  });

  it("composes the existing market price, shipping, compliance, payment, legal and launch gates", () => {
    expect(migration).toContain("server_product_market_price_decision_v1");
    expect(migration).toContain("server_shipping_market_readiness_v1");
    expect(migration).toContain("server_market_compliance_readiness_v1");
    expect(migration).toContain("server_market_payment_readiness_v1");
    expect(migration).toContain("server_market_legal_policy_snapshot_v1");
    expect(migration).toContain("server_market_launch_control_v1");
  });

  it("requires explicit route tax/customs readiness for cross-border checkout", () => {
    expect(migration).toContain("v_origin<>v_destination_country");
    expect(migration).toContain("TAX_READINESS_INCOMPLETE");
    expect(migration).toContain("CUSTOMS_READINESS_INCOMPLETE");
    expect(migration).toContain("AND v_tax_route_ok");
    expect(migration).toContain("AND v_customs_ok");
  });

  it("keeps seller and supplier market blockers semantically distinct", () => {
    expect(migration).toContain("SELLER_MARKET_UNSUPPORTED");
    expect(migration).toContain("SELLER_DELIVERY_MARKET_UNSUPPORTED");
    expect(migration).toContain("SUPPLIER_MARKET_UNSUPPORTED");
    expect(migration).toContain("SUPPLIER_DELIVERY_MARKET_UNSUPPORTED");
    expect(migration).toContain("CASE WHEN p_supplier_id IS NULL");
  });

  it("does not infer supplier compliance evidence for ordinary sellers in Romania", () => {
    expect(migration).toContain("seller_product_compliance_evidence_missing");
    expect(migration).toContain("SELLER_PRODUCT_COMPLIANCE_EVIDENCE_MISSING");
    expect(migration).toContain("Never infer supplier evidence for a seller");
  });

  it("keeps checkout fail-closed until every required gate is eligible", () => {
    expect(migration).toContain("AND v_route.checkout_enabled");
    expect(migration).toContain("AND v_route.status='live'");
    expect(migration).toContain("AND v_market_compliance_ok");
    expect(migration).toContain("AND v_product_compliance_ok");
    expect(migration).toContain("AND v_payment_ok");
    expect(migration).toContain("AND v_legal_ok");
    expect(migration).toContain("AND v_launch_ok");
  });
});
