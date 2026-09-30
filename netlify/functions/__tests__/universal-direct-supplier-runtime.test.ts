import { createHash, createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { resolveSupplierRuntimeConfig } from "../_shared/supplierRuntimeConfig";
import { applySha1QueryOrBodyAuth } from "../_shared/universalDirectSupplierAdapter";
import { resolveSupplierWebhookConfig, verifySupplierWebhookRequest } from "../_shared/supplierWebhookRuntime";

const repo = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");
const adapter = repo("netlify/functions/_shared/universalDirectSupplierAdapter.ts");
const http = repo("netlify/functions/_shared/supplierRuntimeHttp.ts");
const factory = repo("netlify/functions/_shared/supplierAdapterRuntimeFactory.ts");
const order = repo("netlify/functions/admin-supplier-order-runtime.ts");
const submissionGuard = repo("supabase/migrations/20260930230500_supplier_order_submission_inflight_guard.sql");
const returns = repo("netlify/functions/admin-supplier-return-runtime.ts");
const pilot = repo("netlify/functions/admin-supplier-pilot-runtime.ts");
const webhook = repo("netlify/functions/direct-supplier-operational-webhook.ts");

const RUNTIME_ENV = "TEST_DIRECT_SUPPLIER_RUNTIME";
const WEBHOOK_ENV = "TEST_DIRECT_SUPPLIER_WEBHOOK";

afterEach(() => {
  delete process.env[RUNTIME_ENV];
  delete process.env[WEBHOOK_ENV];
});

describe("universal Direct Supplier runtime", () => {
  it("keeps runtime capabilities supplier-bound instead of promoting the static provider registry", () => {
    expect(factory).toContain("server_supplier_offer_integration_context_v1");
    expect(factory).toContain("loadSupplierIntegrationRuntime");
    expect(order).toContain("createRuntimeSupplierAdapter");
    expect(returns).toContain("createRuntimeSupplierAdapter");
    expect(pilot).toContain("loadSupplierIntegrationRuntime");
  });

  it("uses SSRF-safe pinned HTTPS transport and never raw fetch in the universal adapter", () => {
    expect(http).toContain("lookup(hostname, { all: true, verbatim: true })");
    expect(http).toContain("parsed.range() === 'unicast'");
    expect(http).toContain("lookup: (_hostname, _options, callback)");
    expect(http).toContain("rejectUnauthorized: true");
    expect(http).toContain("Supplier runtime redirects are disabled");
    expect(http).toContain("'accept-encoding': 'identity'");
    expect(adapter).toContain("executeSupplierRuntimeHttp");
    expect(adapter).not.toContain("await fetch(");
  });

  it("requires provisioned executable config before advertising Direct Supplier capability", () => {
    expect(adapter).toContain("resolveSupplierRuntimeConfig(binding.configRef");
    expect(adapter).toContain("resolveSupplierWebhookConfig(binding.configRef");
    expect(adapter).toContain("orderSubmissionMappingReady");
    expect(adapter).toContain("context.idempotencyKey");
    expect(adapter).toContain("input.recipient.postcode");
  });

  it("keeps write retries fail-closed and supports lost-response lookup by the original idempotency key", () => {
    expect(submissionGuard).toContain("submission_already_in_progress");
    expect(submissionGuard).toContain("query_before_retry_required");
    expect(http).toContain("Supplier write request timed out after dispatch");
    expect(http).toContain("UNKNOWN_OUTCOME");
    expect(order).toContain("recoverSupplierOrderLostResponse");
    expect(adapter).toContain("findOrderByIdempotencyKey");
    expect(adapter).toContain("idempotencyLookup");
    expect(adapter).toContain("context.idempotencyKey");
  });

  it("supports server-side SHA1 query/body authentication without storing credentials in integration records", () => {
    process.env[RUNTIME_ENV] = JSON.stringify({
      kind: "http_rest",
      supplierKey: "inkthreadable",
      capability: "acknowledgement",
      url: "https://www.inkthreadable.co.uk/api/orders.php?limit=250&format=json",
      allowedHosts: ["www.inkthreadable.co.uk"],
      method: "GET",
      auth: {
        kind: "sha1_query_or_body_secret",
        appId: "APP-test",
        secretKey: "secret-test",
        appIdParam: "AppId",
        signatureParam: "Signature",
      },
    });
    const result = resolveSupplierRuntimeConfig("env:" + RUNTIME_ENV, {
      supplierKey: "inkthreadable",
      capability: "acknowledgement",
      transport: "http_rest",
    });
    expect(result.ok).toBe(true);
    const getUrl = new URL("https://www.inkthreadable.co.uk/api/orders.php?limit=250&format=json");
    applySha1QueryOrBodyAuth(getUrl, "GET", undefined, {
      appId: "APP-test", secretKey: "secret-test", appIdParam: "AppId", signatureParam: "Signature",
    });
    const getUnsigned = "limit=250&format=json&AppId=APP-test";
    expect(getUrl.searchParams.get("Signature")).toBe(
      createHash("sha1").update(getUnsigned + "secret-test", "utf8").digest("hex"),
    );

    const postUrl = new URL("https://www.inkthreadable.co.uk/api/orders.php");
    const body = JSON.stringify({ external_id: "supplier-handshake:test" });
    applySha1QueryOrBodyAuth(postUrl, "POST", body, {
      appId: "APP-test", secretKey: "secret-test", appIdParam: "AppId", signatureParam: "Signature",
    });
    expect(postUrl.searchParams.get("Signature")).toBe(
      createHash("sha1").update(body + "secret-test", "utf8").digest("hex"),
    );
  });

  it("allows asynchronous acknowledgement through a verified webhook while polling stays fail-closed", () => {
    expect(adapter).toContain("binding.capability === 'acknowledgement' && binding.transport === 'webhook'");
    expect(webhook).toContain("server_direct_supplier_webhook_binding_v1");
    expect(webhook).toContain("server_process_direct_supplier_operational_event_v1");
    expect(webhook).toContain("DIRECT_SUPPLIER_OPERATIONAL_WEBHOOK_ENABLED");
    expect(webhook).toContain("customerPiiStored: false");
    expect(webhook).toContain("commerceActivationPerformed: false");
  });

  it("rejects GET order submission and binds runtime config to supplier/capability/host", () => {
    process.env[RUNTIME_ENV] = JSON.stringify({
      kind: "http_rest",
      supplierKey: "example-supplier",
      capability: "order_submission",
      url: "https://api.example.com/orders",
      allowedHosts: ["api.example.com"],
      method: "GET",
    });
    const result = resolveSupplierRuntimeConfig("env:" + RUNTIME_ENV, {
      supplierKey: "example-supplier",
      capability: "order_submission",
      transport: "http_rest",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("cannot use GET");
  });

  it("verifies timestamp-bound webhook HMAC without exposing the secret", () => {
    process.env[WEBHOOK_ENV] = JSON.stringify({
      kind: "webhook",
      supplierKey: "example-supplier",
      auth: {
        mode: "hmac_sha256",
        secret: "0123456789abcdef0123456789abcdef",
        signatureHeader: "x-signature",
        timestampHeader: "x-timestamp",
        signingInput: "timestamp_dot_body",
        signaturePrefix: "v1=",
        toleranceSeconds: 300,
      },
    });
    const resolved = resolveSupplierWebhookConfig("env:" + WEBHOOK_ENV, "example-supplier");
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    const rawBody = '{"event":"accepted"}';
    const timestamp = "1790092800";
    const signature = "v1=" + createHmac("sha256", "0123456789abcdef0123456789abcdef")
      .update(timestamp + "." + rawBody, "utf8").digest("hex");
    expect(verifySupplierWebhookRequest({
      config: resolved.config,
      headers: { "x-signature": signature, "x-timestamp": timestamp },
      rawBody,
      now: new Date(Number(timestamp) * 1000),
    })).toEqual({ ok: true });
  });
});
