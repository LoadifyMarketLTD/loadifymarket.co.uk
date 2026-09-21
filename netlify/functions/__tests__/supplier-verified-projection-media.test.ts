import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { buildSupplierMerchandisingPayload, fetchSupplierVerifiedMedia } from "../_shared/supplierVerifiedMedia";

const repo = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");
const migration = repo("supabase/migrations/20260921191805_supplier_verified_projection_media.sql");
const review = repo("netlify/functions/admin-operator-merchandising-review.ts");
const projection = repo("netlify/functions/admin-supplier-marketplace-projection.ts");
const catalog = repo("netlify/functions/supplier-catalog.ts");
const frontend = repo("src/lib/supplierCatalog.ts");

const CATALOG_ID = "11111111-1111-4111-8111-111111111111";
const PRODUCT_ID = "22222222-2222-4222-8222-222222222222";

describe("supplier verified projection media", () => {
  it("keeps verified media service-role-only and fail-closed", () => {
    expect(migration).toContain("server_supplier_verified_media_snapshot_v1");
    expect(migration).toContain("rights_status<>'verified'");
    expect(migration).toContain("asset_type='image'");
    expect(migration).toContain("asset_ref !~ '^https://'");
    expect(migration).toContain("FROM PUBLIC, anon, authenticated, service_role");
    expect(migration).toContain("TO service_role");
  });

  it("strips client media and injects only verified HTTPS assets", () => {
    expect(buildSupplierMerchandisingPayload({
      title: "Real product",
      imageUrls: ["https://untrusted.example/client.jpg"],
      media: { bypass: true },
    }, [
      "https://supplier.example/approved-a.jpg",
      "http://supplier.example/rejected.jpg",
      "https://supplier.example/approved-a.jpg",
      "https://supplier.example/approved-b.jpg",
    ])).toEqual({
      title: "Real product",
      imageUrls: [
        "https://supplier.example/approved-a.jpg",
        "https://supplier.example/approved-b.jpg",
      ],
    });
  });

  it("uses the same governed media snapshot for human review and marketplace projection", () => {
    expect(review).toContain("fetchSupplierVerifiedMedia");
    expect(review).toContain("p_draft: governedDraft");
    expect(projection).toContain("fetchSupplierVerifiedMedia");
    expect(projection).toContain("p_projection_payload: governedProjectionPayload");
    expect(catalog).toContain("payload.imageUrls");
    expect(frontend).toContain("image: imageUrls[0] ||");
    expect(frontend).toContain("images: imageUrls");
  });

  it("fails closed when the verified media RPC is malformed", async () => {
    const rpc = vi.fn(async () => ({
      data: { eligible: true, reason: "ok", imageUrls: ["http://bad.example/a.jpg"], interfaceVersion: 1 },
      error: null,
    }));
    const client = { rpc } as unknown as SupabaseClient;
    await expect(fetchSupplierVerifiedMedia(client, {
      supplierCatalogItemId: CATALOG_ID,
      canonicalProductId: PRODUCT_ID,
    })).resolves.toEqual({
      eligible: false,
      reason: "verified_media_unavailable",
      imageUrls: [],
      interfaceVersion: 1,
    });
  });

  it("accepts a structurally valid verified media snapshot", async () => {
    const payload = {
      eligible: true,
      reason: "verified_media_snapshot_ready",
      importItemId: "33333333-3333-4333-8333-333333333333",
      imageUrls: ["https://supplier.example/a.jpg"],
      interfaceVersion: 1,
    };
    const rpc = vi.fn(async () => ({ data: payload, error: null }));
    const client = { rpc } as unknown as SupabaseClient;
    await expect(fetchSupplierVerifiedMedia(client, {
      supplierCatalogItemId: CATALOG_ID,
      canonicalProductId: PRODUCT_ID,
    })).resolves.toEqual(payload);
  });
});