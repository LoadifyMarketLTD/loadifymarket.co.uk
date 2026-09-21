import type { SupabaseClient } from "@supabase/supabase-js";

export const SUPPLIER_VERIFIED_MEDIA_INTERFACE_VERSION = 1 as const;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_PUBLIC_IMAGES = 12;

export interface SupplierVerifiedMediaSnapshot {
  eligible: boolean;
  reason: string;
  imageUrls: string[];
  importItemId?: string;
  interfaceVersion: typeof SUPPLIER_VERIFIED_MEDIA_INTERFACE_VERSION;
}

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export function buildSupplierMerchandisingPayload(
  draft: Record<string, unknown>,
  verifiedImageUrls: string[],
): Record<string, unknown> {
  const governed = { ...draft };
  for (const key of ["image", "imageUrl", "imageUrls", "images", "media", "primaryImage", "primaryImageUrl"]) {
    delete governed[key];
  }
  const imageUrls = [...new Set(
    verifiedImageUrls.map((value) => value.trim()).filter((value) => value && isHttpsUrl(value)),
  )].slice(0, MAX_PUBLIC_IMAGES);
  return { ...governed, imageUrls };
}

export async function fetchSupplierVerifiedMedia(
  client: SupabaseClient,
  input: { supplierCatalogItemId: string; canonicalProductId: string },
): Promise<SupplierVerifiedMediaSnapshot> {
  if (!UUID_RE.test(input.supplierCatalogItemId) || !UUID_RE.test(input.canonicalProductId)) {
    return { eligible: false, reason: "invalid_media_identity", imageUrls: [], interfaceVersion: 1 };
  }
  try {
    const { data, error } = await client.rpc("server_supplier_verified_media_snapshot_v1", {
      p_supplier_catalog_item_id: input.supplierCatalogItemId,
      p_canonical_product_id: input.canonicalProductId,
    });
    if (error || !data || typeof data !== "object" || Array.isArray(data)) {
      return { eligible: false, reason: "verified_media_unavailable", imageUrls: [], interfaceVersion: 1 };
    }
    const candidate = data as Record<string, unknown>;
    if (
      typeof candidate.eligible !== "boolean"
      || typeof candidate.reason !== "string"
      || candidate.interfaceVersion !== 1
      || !Array.isArray(candidate.imageUrls)
      || !candidate.imageUrls.every((value) => typeof value === "string" && isHttpsUrl(value))
    ) {
      return { eligible: false, reason: "verified_media_unavailable", imageUrls: [], interfaceVersion: 1 };
    }
    return {
      eligible: candidate.eligible,
      reason: candidate.reason,
      imageUrls: [...new Set(candidate.imageUrls as string[])].slice(0, MAX_PUBLIC_IMAGES),
      ...(typeof candidate.importItemId === "string" ? { importItemId: candidate.importItemId } : {}),
      interfaceVersion: 1,
    };
  } catch {
    return { eligible: false, reason: "verified_media_unavailable", imageUrls: [], interfaceVersion: 1 };
  }
}