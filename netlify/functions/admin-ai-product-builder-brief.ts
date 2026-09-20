import { createClient } from "@supabase/supabase-js";
import type { Handler } from "@netlify/functions";
import { authenticateActiveAccount } from "./_shared/activeAccountAuth";
import { prepareAiProductBuilderBrief } from "./_shared/aiProductBuilderContract";
import { jsonResponse, optionsResponse } from "./_shared/http";

const METHODS = "POST, OPTIONS";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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
    if (!isRecord(parsed)) throw new Error("invalid body");
    body = parsed;
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body" }, METHODS);
  }

  if (!isRecord(body.facts)) {
    return jsonResponse(400, { error: "Verified product facts are required" }, METHODS);
  }
  if (body.factsVerified !== true) {
    return jsonResponse(409, {
      error: "AI Product Builder remains locked until product facts are verified",
      factsLocked: true,
    }, METHODS);
  }
  try {
    const brief = prepareAiProductBuilderBrief({
      facts: body.facts,
      factsVerified: true,
    });

    return jsonResponse(200, {
      ok: true,
      brief,
      generation: {
        performed: false,
        providerCalled: false,
        marketplaceMutationPerformed: false,
        publicationPerformed: false,
        reason: "brief_ready_provider_not_invoked",
      },
      reviewRequired: true,
    }, METHODS);
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI Product Builder brief rejected";
    return jsonResponse(400, { error: message, factsLocked: true }, METHODS);
  }
};
