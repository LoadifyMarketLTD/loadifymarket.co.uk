import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { Handler } from "@netlify/functions";
import { authenticateActiveAccount } from "./_shared/activeAccountAuth";
import { jsonResponse, optionsResponse } from "./_shared/http";
import { evaluateSupplierImport } from "./_shared/supplierImport";
import { evaluateSupplierEconomics } from "./_shared/supplierEconomics";

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
  const reason = text(body.reason);
  const draft = body.draft;
  if (![canonicalProductId,supplierOfferId,supplierCatalogItemId].every((value) => UUID_RE.test(value))
    || !reason || !draft || typeof draft !== "object" || Array.isArray(draft)) {
    return jsonResponse(400, { error: "Publication identity, merchandising draft and review reason are required" }, METHODS);
  }

  const [importDecision, economicsDecision] = await Promise.all([
    evaluateSupplierImport(admin, { supplierCatalogItemId, canonicalProductId }),
    evaluateSupplierEconomics(admin, { supplierOfferId, canonicalProductId, commercialMode: "loadify_supplier_fulfilled", territory: "GB" }),
  ]);
  if (!importDecision.eligible || !economicsDecision.eligible) {
    return jsonResponse(409, {
      error: "Publication gate is not eligible",
      importDecision,
      economicsDecision,
      publicationPerformed: false,
    }, METHODS);
  }

  const serialized = JSON.stringify(draft);
  const draftHash = createHash("sha256").update(serialized).digest("hex");
  const { data, error } = await admin.rpc("server_approve_operator_merchandising_v1", {
    p_actor_id: auth.actor.id,
    p_canonical_product_id: canonicalProductId,
    p_supplier_offer_id: supplierOfferId,
    p_supplier_catalog_item_id: supplierCatalogItemId,
    p_draft: draft,
    p_draft_hash: draftHash,
    p_reason: reason,
  });
  if (error) return jsonResponse(409, { error: error.message, publicationPerformed: false }, METHODS);

  return jsonResponse(200, {
    ok: true,
    review: data,
    publicationPerformed: false,
    marketplaceMutationPerformed: false,
    nextGate: "governed_marketplace_projection",
  }, METHODS);
};
