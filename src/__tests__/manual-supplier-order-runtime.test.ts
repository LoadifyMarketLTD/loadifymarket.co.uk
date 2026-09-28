import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repo = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("manual Direct Supplier post-payment order runtime", () => {
  const cutover = repo("supabase/migrations/20260922155453_direct_supplier_runtime_binding_cutover.sql");
  const migration = repo("supabase/migrations/20260928214500_manual_supplier_order_acceptance.sql");
  const runtime = repo("netlify/functions/admin-supplier-order-runtime.ts");

  it("allows verified manual order and acknowledgement bindings at handshake preparation", () => {
    expect(cutover).toContain("p.execution_mode='manual_only' AND p.transport IN ('email','manual_portal','manual_file')");
    expect(cutover).toContain("p.capability='order_submission'");
    expect(cutover).toContain("p.capability='acknowledgement'");
  });

  it("records manual acceptance only with active admin, verified manual bindings and evidence", () => {
    expect(migration).toContain("active_admin_required");
    expect(migration).toContain("manual_supplier_order_evidence_required");
    expect(migration).toContain("verified_manual_order_and_ack_bindings_required");
    expect(migration).toContain("manual_supplier_order_acceptance_recorded");
  });

  it("does not call a provider or mutate payment state for manual acceptance", () => {
    expect(migration).toContain("'providerMutationPerformed',false");
    expect(migration).toContain("'paymentMutationPerformed',false");
    expect(migration).not.toContain("stripe.");
    expect(migration).not.toContain("paymentIntents");
  });

  it("exposes a distinct admin manual_accept action before adapter creation", () => {
    expect(runtime).toContain('"manual_accept"');
    expect(runtime).toContain("server_record_manual_supplier_order_acceptance_v1");
    expect(runtime.indexOf('if (action === "manual_accept")')).toBeLessThan(runtime.indexOf("const adapter = await createRuntimeSupplierAdapter"));
  });
});
