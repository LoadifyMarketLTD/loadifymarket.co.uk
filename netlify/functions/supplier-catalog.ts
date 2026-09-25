import { createClient } from "@supabase/supabase-js";
import type { Handler } from "@netlify/functions";
import { jsonResponse, optionsResponse } from "./_shared/http";
import { evaluateProjectionSupplierOffers } from "./_shared/supplierOfferSelectionRuntime";

const METHODS = "GET, OPTIONS";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const handler: Handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return optionsResponse(METHODS);
  if (event.httpMethod !== "GET") return jsonResponse(405, { error: "Method not allowed" }, METHODS);
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return jsonResponse(500, { error: "Server configuration error" }, METHODS);
  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

  const requestedId = (event.queryStringParameters?.id || "").trim();
  if (requestedId && !UUID_RE.test(requestedId)) return jsonResponse(400, { error: "Invalid catalog item id" }, METHODS);
  const market = (event.queryStringParameters?.market || "GB").trim().toUpperCase();
  if (market !== "GB" && market !== "RO") return jsonResponse(400, { error: "Invalid market" }, METHODS);

  const { data: rows, error } = await admin.rpc("server_get_supplier_marketplace_projection_v1", {
    p_projection_id: requestedId || null,
  });
  if (error) return jsonResponse(503, { error: "Supplier catalog unavailable" }, METHODS);

  const { data: commercialReadiness, error: commercialReadinessError } = await admin.rpc(
    "server_supplier_marketplace_commercial_readiness_v1",
    { p_market_code: market },
  );
  const commercialModelReady = !commercialReadinessError
    && !!commercialReadiness
    && commercialReadiness.eligible === true;
  const supplierIdentityCache = new Map<string, { displayName: string; legalName: string }>();

  const items = [];
  for (const row of rows || []) {
    const selection = await evaluateProjectionSupplierOffers(admin, {
      projectionId: row.id,
      requestedQuantity: 1,
      territory: market,
    });
    const selected = selection.selected;
    if (!selection.eligible || !selected) continue;

    let supplierIdentity = supplierIdentityCache.get(selected.supplierId);
    if (!supplierIdentity) {
      const { data: identity, error: identityError } = await admin.rpc(
        "server_supplier_marketplace_identity_v1",
        { p_supplier_id: selected.supplierId },
      );
      if (!identityError && identity?.eligible === true) {
        supplierIdentity = {
          displayName: String(identity.displayName || identity.legalName || "Independent supplier"),
          legalName: String(identity.legalName || identity.displayName || "Independent supplier"),
        };
        supplierIdentityCache.set(selected.supplierId, supplierIdentity);
      }
    }

    const payload = row.projection_payload as Record<string, unknown>;
    const imageUrls = Array.isArray(payload.imageUrls)
      ? payload.imageUrls.filter((value): value is string => typeof value === "string" && value.startsWith("https://")).slice(0, 12)
      : [];
    items.push({
      id: row.id,
      canonicalProductId: row.canonical_product_id,
      commercialMode: "loadify_supplier_fulfilled",
      title: typeof payload.title === "string" ? payload.title : "",
      description: typeof payload.description === "string" ? payload.description : "",
      benefits: typeof payload.benefits === "string" ? payload.benefits : "",
      seoTitle: typeof payload.seoTitle === "string" ? payload.seoTitle : "",
      seoDescription: typeof payload.seoDescription === "string" ? payload.seoDescription : "",
      imageUrls,
      price: selected.grossCustomerPrice,
      currency: selected.currency,
      availability: (selected.sellableQuantity ?? 0) > 0 ? "in_stock" : "out_of_stock",
      sellableQuantity: selected.sellableQuantity,
      fulfilmentLabel: "Sold and dispatched by approved supplier",
      checkoutEligible: commercialModelReady,
      checkoutBlockReason: commercialModelReady ? null : "SUPPLIER_MARKETPLACE_COMMERCIAL_MODEL_NOT_READY",
      supplierId: selected.supplierId,
      supplierName: supplierIdentity?.displayName || "Independent supplier",
      supplierLegalName: supplierIdentity?.legalName || supplierIdentity?.displayName || "Independent supplier",
      supplierOfferCount: selection.ranked.length,
      publishedAt: row.published_at,
    });
  }

  if (requestedId && items.length === 0) return jsonResponse(404, { error: "Supplier product unavailable" }, METHODS);
  return jsonResponse(200, {
    ok: true,
    items,
    count: items.length,
    territory: market,
    commercialMode: "loadify_supplier_fulfilled",
    inventoryAndPriceRevalidated: true,
    commercialModelReady,
    commercialReadiness: commercialReadiness ?? null,
  }, METHODS);
};
