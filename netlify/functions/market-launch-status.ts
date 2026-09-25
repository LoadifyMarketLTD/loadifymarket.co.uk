import { createClient } from "@supabase/supabase-js";
import type { Handler } from "@netlify/functions";
import { jsonResponse, optionsResponse } from "./_shared/http";
import { readMarketLaunchDecision, type LaunchMarket } from "./_shared/marketLaunch";

const METHODS = "GET, OPTIONS";

export const handler: Handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return optionsResponse(METHODS);
  if (event.httpMethod !== "GET") return jsonResponse(405, { error: "Method not allowed" }, METHODS);

  const market = String(event.queryStringParameters?.market || "GB").trim().toUpperCase();
  if (market !== "GB" && market !== "RO") {
    return jsonResponse(400, { error: "Unsupported market" }, METHODS);
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(503, { error: "Launch status unavailable" }, METHODS);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const decision = await readMarketLaunchDecision(admin, market as LaunchMarket);
  if (!decision) {
    return jsonResponse(503, {
      market,
      status: "prelaunch",
      catalogEnabled: market === "GB",
      checkoutEnabled: false,
      paymentEnabled: false,
    }, METHODS);
  }
  return jsonResponse(200, decision, METHODS);
};
