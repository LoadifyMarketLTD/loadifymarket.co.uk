import { createClient } from "@supabase/supabase-js";
import type { Handler } from "@netlify/functions";
import { authenticateActiveAccount } from "./_shared/activeAccountAuth";
import { prepareAiProductBuilderBrief } from "./_shared/aiProductBuilderContract";
import { jsonResponse, optionsResponse } from "./_shared/http";
import { readVerifiedCanonicalProductFacts } from "./_shared/verifiedCanonicalProductFacts";

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

  const canonicalProductId = typeof body.canonicalProductId === "string" ? body.canonicalProductId.trim() : "";
  const verified = await readVerifiedCanonicalProductFacts(admin, canonicalProductId);
  if (!verified.ok) {
    const status = verified.kind === "validation" ? 400 : verified.kind === "not_found" ? 409 : 503;
    return jsonResponse(status, { error: verified.error, factsLocked: true }, METHODS);
  }

  try {
    const brief = prepareAiProductBuilderBrief({
      facts: verified.facts,
      factsVerified: true,
    });

    return jsonResponse(200, {
      ok: true,
      canonicalProductId: verified.canonicalProductId,
      verifiedFactCount: verified.factCount,
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
