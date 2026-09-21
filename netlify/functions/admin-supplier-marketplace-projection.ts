import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { Handler } from "@netlify/functions";
import { authenticateActiveAccount } from "./_shared/activeAccountAuth";
import { jsonResponse, optionsResponse } from "./_shared/http";
import { evaluateSupplierImport } from "./_shared/supplierImport";
import { evaluateSupplierEconomics } from "./_shared/supplierEconomics";
import { buildSupplierMerchandisingPayload, fetchSupplierVerifiedMedia } from "./_shared/supplierVerifiedMedia";

const METHODS = "POST, OPTIONS";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const text = (value: unknown) => typeof value === "string" ? value.trim() : "";

export const handler: Handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return optionsResponse(METHODS);
  if (event.httpMethod !== "POST") return jsonResponse(405, { error: "Method not allowed" }, METHODS);

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return jsonResponse(500, { error: "Server configuration error" }, METHODS);

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const auth = await authenticateActiveAccount(event, admin, ["admin"]);
  if (!auth.ok) return jsonResponse(auth.status, { error: "Unauthorized" }, METHODS);

  let body: Record<string, unknown>;
  try {
    const parsed = JSON.parse(event.body || "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    body = parsed as Record<string, unknown>;
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body" }, METHODS);
  }

  const canonicalProductId = text(body.canonicalProductId);
  const supplierOfferId = text(body.supplierOfferId);
  const supplierCatalogItemId = text(body.supplierCatalogItemId);
  const merchandisingReviewId = text(body.merchandisingReviewId);
  const projectionPayload = body.projectionPayload;
  if (![canonicalProductId,supplierOfferId,supplierCatalogItemId,merchandisingReviewId].every((v) => UUID_RE.test(v))
    || !projectionPayload || typeof projectionPayload !== "object" || Array.isArray(projectionPayload)) {
    return jsonResponse(400, { error: "Valid projection identity and payload are required" }, METHODS);
  }

  const [importDecision, economicsDecision, mediaSnapshot] = await Promise.all([
    evaluateSupplierImport(admin, { supplierCatalogItemId, canonicalProductId }),
    evaluateSupplierEconomics(admin, {
      supplierOfferId, canonicalProductId,
      commercialMode: "loadify_supplier_fulfilled", territory: "GB",
    }),
    fetchSupplierVerifiedMedia(admin, { supplierCatalogItemId, canonicalProductId }),
  ]);

  if (!importDecision.eligible || !economicsDecision.eligible || !mediaSnapshot.eligible) {
    return jsonResponse(409, {
      error: "Projection gate is not eligible",
      importDecision, economicsDecision,
      mediaDecision: { eligible: mediaSnapshot.eligible, reason: mediaSnapshot.reason, imageCount: mediaSnapshot.imageUrls.length },
      buyerVisible: false, checkoutEnabled: false,
    }, METHODS);
  }

  const governedProjectionPayload = buildSupplierMerchandisingPayload(projectionPayload as Record<string, unknown>, mediaSnapshot.imageUrls);
  const payloadHash = createHash("sha256").update(JSON.stringify(governedProjectionPayload)).digest("hex");
  const { data, error } = await admin.rpc("server_create_supplier_marketplace_projection_v1", {
    p_actor_id: auth.actor.id,
    p_canonical_product_id: canonicalProductId,
    p_supplier_offer_id: supplierOfferId,
    p_supplier_catalog_item_id: supplierCatalogItemId,
    p_merchandising_review_id: merchandisingReviewId,
    p_projection_payload: governedProjectionPayload,
    p_payload_hash: payloadHash,
  });
  if (error) return jsonResponse(409, { error: error.message, buyerVisible: false, checkoutEnabled: false }, METHODS);

  return jsonResponse(200, {
    ok: true,
    projection: data,
    buyerVisible: false,
    checkoutEnabled: false,
    publicProductMutationPerformed: false,
    nextGate: "buyer_catalog_and_checkout_integration",
  }, METHODS);
};
