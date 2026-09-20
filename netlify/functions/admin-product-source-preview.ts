import { createClient } from "@supabase/supabase-js";
import type { Handler } from "@netlify/functions";
import { authenticateActiveAccount } from "./_shared/activeAccountAuth";
import { jsonResponse, optionsResponse } from "./_shared/http";
import { previewOperatorProductUrl } from "./_shared/operatorProductUrlPreview";

const METHODS = "POST, OPTIONS";

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

  let url = "";
  try {
    const parsed = JSON.parse(event.body || "{}") as unknown;
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      throw new Error("invalid body");
    }
    url = typeof (parsed as Record<string, unknown>).url === "string"
      ? String((parsed as Record<string, unknown>).url).trim()
      : "";
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body" }, METHODS);
  }

  if (!url || url.length > 2048) {
    return jsonResponse(400, { error: "A valid product URL is required" }, METHODS);
  }

  try {
    const preview = await previewOperatorProductUrl(url);
    return jsonResponse(200, { ok: true, preview }, METHODS);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Product source preview failed";
    return jsonResponse(400, { error: message }, METHODS);
  }
};
