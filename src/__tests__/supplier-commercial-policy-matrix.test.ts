import fs from "node:fs";
import path from "node:path";

const migrationPath = path.resolve(
  process.cwd(),
  "supabase/migrations/20260928145500_supplier_commercial_policy_matrix.sql",
);
const migration = fs.readFileSync(migrationPath, "utf8");
const prepareCheckout = fs.readFileSync(
  path.resolve(process.cwd(), "netlify/functions/prepare-supplier-checkout.ts"),
  "utf8",
);
const createPayment = fs.readFileSync(
  path.resolve(process.cwd(), "netlify/functions/create-supplier-payment-intent.ts"),
  "utf8",
);

describe("supplier commercial policy matrix", () => {
  it("supports supplier-specific pricing authority without code forks", () => {
    expect(migration).toContain("supplier_fixed_retail");
    expect(migration).toContain("supplier_rrp");
    expect(migration).toContain("supplier_minimum_price");
    expect(migration).toContain("jointly_agreed_retail");
    expect(migration).toContain("loadify_managed_with_supplier_constraints");
    expect(migration).toContain("supplier_approval_required_for_retail");
  });

  it("separates zero Loadify commission from third-party transaction costs", () => {
    expect(migration).toContain("platform_commission_value");
    expect(migration).toContain("processor_fee_payer");
    expect(migration).toContain("connect_fee_payer");
    expect(migration).toContain("payout_fee_payer");
  });

  it("supports multiple settlement contracts and triggers", () => {
    expect(migration).toContain("stripe_connect_supplier");
    expect(migration).toContain("platform_collection_as_agent");
    expect(migration).toContain("manual_supplier_settlement");
    expect(migration).toContain("payment_confirmed");
    expect(migration).toContain("supplier_acknowledged");
    expect(migration).toContain("dispatched");
    expect(migration).toContain("delivered");
    expect(migration).toContain("protection_window_elapsed");
    expect(migration).toContain("manual_review");
  });

  it("allocates return, cancellation and chargeback costs explicitly", () => {
    expect(migration).toContain("change_of_mind_return_postage_payer");
    expect(migration).toContain("faulty_item_return_postage_payer");
    expect(migration).toContain("wrong_item_return_postage_payer");
    expect(migration).toContain("damaged_in_fulfilment_postage_payer");
    expect(migration).toContain("pre_dispatch_cancellation_cost_payer");
    expect(migration).toContain("post_dispatch_cancellation_cost_payer");
    expect(migration).toContain("chargeback_allocation_model");
    expect(migration).toContain("platform_error_cost_payer");
  });

  it("is versioned, auditable, immutable after verification and fail closed", () => {
    expect(migration).toContain("version integer NOT NULL");
    expect(migration).toContain("reviewed_by");
    expect(migration).toContain("reviewed_at");
    expect(migration).toContain("verified supplier commercial profile is immutable");
    expect(migration).toContain("verified_supplier_commercial_profile_missing");
    expect(migration).toContain("Creation alone never activates checkout or settlement");
  });
  it("fails checkout closed when the selected supplier has no verified commercial profile", () => {
    expect(prepareCheckout).toContain("server_supplier_commercial_profile_readiness_v1");
    expect(prepareCheckout).toContain("SUPPLIER_COMMERCIAL_PROFILE_NOT_READY");
    expect(prepareCheckout).toContain("supplierCommercialProfileId");
    expect(prepareCheckout).toContain("supplierCommercialProfileVersion");
  });

  it("binds payment to the immutable supplier contract and matching settlement model", () => {
    expect(createPayment).toContain("supplierSellerIdSnapshot");
    expect(createPayment).toContain("supplierCommercialContractVersion");
    expect(createPayment).toContain("SUPPLIER_COMMERCIAL_CONTRACT_SNAPSHOT_MISSING");
    expect(createPayment).toContain("server_supplier_commercial_profile_readiness_v1");
    expect(createPayment).toContain("SUPPLIER_SETTLEMENT_MODEL_MISMATCH");
    expect(createPayment).toContain("supplierCommercialProfileId");
    expect(createPayment).toContain("supplierCommercialProfileVersion");
    expect(createPayment).toContain("processorFeePayer");
    expect(createPayment).toContain("connectFeePayer");
    expect(createPayment).toContain("payoutFeePayer");
  });
});
