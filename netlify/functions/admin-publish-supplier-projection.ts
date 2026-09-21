import { createClient } from "@supabase/supabase-js";
import type { Handler } from "@netlify/functions";
import { authenticateActiveAccount } from "./_shared/activeAccountAuth";
import { jsonResponse, optionsResponse } from "./_shared/http";
import { evaluateSupplierImport } from "./_shared/supplierImport";
import { evaluateSupplierEconomics } from "./_shared/supplierEconomics";

const METHODS = "POST, OPTIONS";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const handler: Handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return optionsResponse(METHODS);
  if (event.httpMethod !== "POST") return jsonResponse(405, { error: "Method not allowed" }, METHODS);
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return jsonResponse(500, { error: "Server configuration error" }, METHODS);
  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const auth = await authenticateActiveAccount(event, admin, ["admin"]);
  if (!auth.ok) return jsonResponse(auth.status, { error: "Unauthorized" }, METHODS);

  let projectionId = "";
  try {
    const body = JSON.parse(event.body || "{}") as Record<string, unknown>;
    projectionId = typeof body.projectionId === "string" ? body.projectionId.trim() : "";
  } catch { return jsonResponse(400, { error: "Invalid JSON body" }, METHODS); }
  if (!UUID_RE.test(projectionId)) return jsonResponse(400, { error: "Valid projectionId is required" }, METHODS);

  const { data: projectionRows, error: projectionError } = await admin.rpc(
    "server_get_supplier_marketplace_projection_v1",
    { p_projection_id: projectionId },
  );
  const projection = Array.isArray(projectionRows) ? projectionRows[0] : null;
  if (projectionError || !projection) return jsonResponse(404, { error: "Marketplace projection not found" }, METHODS);

  const [importDecision, economicsDecision, stockPrice] = await Promise.all([
    evaluateSupplierImport(admin, {
      supplierCatalogItemId: projection.supplier_catalog_item_id,
      canonicalProductId: projection.canonical_product_id,
    }),
    evaluateSupplierEconomics(admin, {
      supplierOfferId: projection.supplier_offer_id,
      canonicalProductId: projection.canonical_product_id,
      commercialMode: "loadify_supplier_fulfilled", territory: "GB",
    }),
    admin.rpc("server_supplier_stock_price_decision_v1", {
      p_supplier_offer_id: projection.supplier_offer_id,
      p_canonical_product_id: projection.canonical_product_id,
      p_commercial_mode: "loadify_supplier_fulfilled",
      p_territory: "GB",
      p_external_variant_ref: "",
    }),
  ]);
  const stockDecision = stockPrice.data as Record<string, unknown> | null;
  if (!importDecision.eligible || !economicsDecision.eligible || stockPrice.error || stockDecision?.eligible !== true) {
    return jsonResponse(409, {
      error: "Buyer publication gate is not eligible",
      importDecision, economicsDecision,
      stockPriceDecision: stockPrice.error ? { eligible: false, reason: "supplier_stock_price_unavailable" } : stockDecision,
      buyerVisible: false, checkoutEnabled: false,
    }, METHODS);
  }

  const { data, error } = await admin.rpc("server_publish_supplier_marketplace_projection_v1", {
    p_actor_id: auth.actor.id,
    p_projection_id: projectionId,
  });
  if (error) return jsonResponse(409, { error: error.message, buyerVisible: false, checkoutEnabled: false }, METHODS);

  return jsonResponse(200, {
    ok: true, publication: data,
    buyerVisible: true,
    checkoutEnabled: true,
    sellerListingMutationPerformed: false,
    nextGate: "buyer_checkout_revalidation",
  }, METHODS);
};
