import { createClient } from "@supabase/supabase-js";
import type { Handler } from "@netlify/functions";
import { jsonResponse, optionsResponse } from "./_shared/http";
import { evaluateSupplierEconomics } from "./_shared/supplierEconomics";

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

  const { data: rows, error } = await admin.rpc("server_get_supplier_marketplace_projection_v1", {
    p_projection_id: requestedId || null,
  });
  if (error) return jsonResponse(503, { error: "Supplier catalog unavailable" }, METHODS);

  const items = [];
  for (const row of rows || []) {
    const [economics, stockPrice] = await Promise.all([
      evaluateSupplierEconomics(admin, {
        supplierOfferId: row.supplier_offer_id,
        canonicalProductId: row.canonical_product_id,
        commercialMode: "loadify_supplier_fulfilled", territory: "GB",
      }),
      admin.rpc("server_supplier_stock_price_decision_v1", {
        p_supplier_offer_id: row.supplier_offer_id,
        p_canonical_product_id: row.canonical_product_id,
        p_commercial_mode: "loadify_supplier_fulfilled",
        p_territory: "GB",
        p_external_variant_ref: "",
      }),
    ]);
    const stock = stockPrice.data as Record<string, unknown> | null;
    if (!economics.eligible || stockPrice.error || stock?.eligible !== true) continue;
    const payload = row.projection_payload as Record<string, unknown>;
    items.push({
      id: row.id,
      canonicalProductId: row.canonical_product_id,
      commercialMode: "loadify_supplier_fulfilled",
      title: typeof payload.title === "string" ? payload.title : "",
      description: typeof payload.description === "string" ? payload.description : "",
      benefits: typeof payload.benefits === "string" ? payload.benefits : "",
      seoTitle: typeof payload.seoTitle === "string" ? payload.seoTitle : "",
      seoDescription: typeof payload.seoDescription === "string" ? payload.seoDescription : "",
      price: economics.grossCustomerPrice,
      currency: economics.currency,
      availability: stock.availability,
      sellableQuantity: stock.sellableQuantity,
      fulfilmentLabel: "Fulfilled by approved supplier",
      checkoutEligible: true,
      publishedAt: row.published_at,
    });
  }

  if (requestedId && items.length === 0) return jsonResponse(404, { error: "Supplier product unavailable" }, METHODS);
  return jsonResponse(200, {
    ok: true,
    items,
    count: items.length,
    territory: "GB",
    commercialMode: "loadify_supplier_fulfilled",
    inventoryAndPriceRevalidated: true,
  }, METHODS);
};
