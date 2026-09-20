import { createClient } from "@supabase/supabase-js";
import type { Handler } from "@netlify/functions";
import { authenticateActiveAccount } from "./_shared/activeAccountAuth";
import { jsonResponse, optionsResponse } from "./_shared/http";
import { evaluateSupplierImport } from "./_shared/supplierImport";
import { evaluateSupplierEconomics } from "./_shared/supplierEconomics";

const METHODS = "POST, OPTIONS";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
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
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("invalid body");
    body = parsed as Record<string, unknown>;
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body" }, METHODS);
  }

  const supplierCatalogItemId = text(body.supplierCatalogItemId);
  const supplierOfferId = text(body.supplierOfferId);
  const canonicalProductId = text(body.canonicalProductId);
  if (![supplierCatalogItemId, supplierOfferId, canonicalProductId].every((value) => UUID_RE.test(value))) {
    return jsonResponse(400, {
      error: "Valid supplierCatalogItemId, supplierOfferId and canonicalProductId are required",
    }, METHODS);
  }
  const [importDecision, economicsDecision] = await Promise.all([
    evaluateSupplierImport(admin, { supplierCatalogItemId, canonicalProductId }),
    evaluateSupplierEconomics(admin, {
      supplierOfferId,
      canonicalProductId,
      commercialMode: "loadify_supplier_fulfilled",
      territory: "GB",
    }),
  ]);

  const checks = [
    {
      key: "import_governance",
      passed: importDecision.eligible,
      reason: importDecision.reason,
      covers: ["canonical_mapping", "verified_facts", "asset_rights", "gb_compliance"],
    },
    {
      key: "economics",
      passed: economicsDecision.eligible,
      reason: economicsDecision.reason,
      covers: ["landed_cost", "tax", "pricing", "margin"],
    },
  ];

  const eligible = checks.every((check) => check.passed);
  return jsonResponse(200, {
    ok: true,
    eligible,
    reason: eligible ? "publication_gate_ready" : "publication_gate_blocked",
    checks,
    importDecision,
    economicsDecision,
    commercialMode: "loadify_supplier_fulfilled",
    territory: "GB",
    marketplaceMutationPerformed: false,
    publicationPerformed: false,
    providerWriteMutationPerformed: false,
  }, METHODS);
};
