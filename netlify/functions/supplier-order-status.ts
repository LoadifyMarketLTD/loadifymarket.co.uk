import { createClient } from "@supabase/supabase-js";
import type { Handler } from "@netlify/functions";
import { authenticateActiveAccount } from "./_shared/activeAccountAuth";
import { jsonResponse, optionsResponse } from "./_shared/http";

const METHODS = "GET, OPTIONS";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const handler: Handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return optionsResponse(METHODS);
  if (event.httpMethod !== "GET") return jsonResponse(405, { error: "Method not allowed" }, METHODS);

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return jsonResponse(500, { error: "Server configuration error" }, METHODS);

  const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const auth = await authenticateActiveAccount(event, admin, ["buyer"]);
  if (!auth.ok) return jsonResponse(auth.status, { error: "Unauthorized" }, METHODS);

  const orderId = (event.queryStringParameters?.orderId || "").trim();
  if (!UUID_RE.test(orderId)) return jsonResponse(400, { error: "Valid orderId is required" }, METHODS);

  const { data, error } = await admin.rpc("server_supplier_buyer_order_status_v1", {
    p_buyer_id: auth.actor.id,
    p_order_id: orderId,
  });
  if (error) return jsonResponse(503, { error: "Unable to load supplier order status" }, METHODS);
  if (!data || typeof data !== "object" || (data as { ok?: unknown }).ok !== true) {
    return jsonResponse(404, { error: "Supplier order not found" }, METHODS);
  }

  return jsonResponse(200, data as Record<string, unknown>, METHODS);
};
