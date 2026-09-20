import { createClient } from "@supabase/supabase-js";
import type { Handler } from "@netlify/functions";
import { authenticateActiveAccount } from "./_shared/activeAccountAuth";
import { jsonResponse, optionsResponse } from "./_shared/http";
import {
  evaluateSupplierEconomics,
  type SupplierEconomicsDecisionInput,
} from "./_shared/supplierEconomics";

const METHODS = "POST, OPTIONS";
const MODES = new Set<SupplierEconomicsDecisionInput["commercialMode"]>([
  "marketplace_seller",
  "loadify_supplier_fulfilled",
  "loadify_direct",
]);

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return optionsResponse(METHODS);
  if (event.httpMethod !== "POST") return jsonResponse(405, { error: "Method not allowed" }, METHODS);

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(500, { error: "Server configuration error" }, METHODS);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const auth = await authenticateActiveAccount(event, admin, ["admin"]);
  if (!auth.ok) return jsonResponse(auth.status, { error: "Unauthorized" }, METHODS);

  let body: Record<string, unknown>;
  try {
    const parsed = JSON.parse(event.body || "{}");
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      throw new Error("invalid body");
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body" }, METHODS);
  }

  const supplierOfferId = typeof body.supplierOfferId === "string" ? body.supplierOfferId.trim() : "";
  const canonicalProductId = typeof body.canonicalProductId === "string" ? body.canonicalProductId.trim() : "";
  const commercialMode = typeof body.commercialMode === "string"
    ? body.commercialMode.trim() as SupplierEconomicsDecisionInput["commercialMode"]
    : "loadify_supplier_fulfilled";
  const territory = typeof body.territory === "string" ? body.territory.trim().toUpperCase() : "GB";

  if (!isUuid(supplierOfferId) || !isUuid(canonicalProductId) || !MODES.has(commercialMode)) {
    return jsonResponse(400, { error: "Valid supplierOfferId, canonicalProductId and commercialMode are required" }, METHODS);
  }
  if (!/^[A-Z]{2}$/.test(territory)) {
    return jsonResponse(400, { error: "Territory must be a two-letter country code" }, METHODS);
  }

  const decision = await evaluateSupplierEconomics(admin, {
    supplierOfferId,
    canonicalProductId,
    commercialMode,
    territory,
  });

  return jsonResponse(200, { ok: true, decision }, METHODS);
};
