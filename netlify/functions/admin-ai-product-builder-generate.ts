import { createClient } from "@supabase/supabase-js";
import type { Handler } from "@netlify/functions";
import { authenticateActiveAccount } from "./_shared/activeAccountAuth";
import { prepareAiProductBuilderBrief } from "./_shared/aiProductBuilderContract";
import { generateAiProductBuilderDraft } from "./_shared/aiProductBuilderProvider";
import { jsonResponse, optionsResponse } from "./_shared/http";
import { readVerifiedCanonicalProductFacts } from "./_shared/verifiedCanonicalProductFacts";

const METHODS = "POST, OPTIONS";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
  let canonicalProductId = "";
  try {
    const parsed = JSON.parse(event.body || "{}") as Record<string, unknown>;
    canonicalProductId = typeof parsed.canonicalProductId === "string" ? parsed.canonicalProductId.trim() : "";
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body" }, METHODS);
  }

  if (!UUID_RE.test(canonicalProductId)) {
    return jsonResponse(400, { error: "A valid canonicalProductId is required" }, METHODS);
  }

  const verified = await readVerifiedCanonicalProductFacts(admin, canonicalProductId);
  if (!verified.ok) {
    const status = verified.kind === "validation" ? 400 : verified.kind === "not_found" ? 409 : 503;
    return jsonResponse(status, { error: verified.error, factsLocked: true }, METHODS);
  }

  let brief;
  try {
    brief = prepareAiProductBuilderBrief({ facts: verified.facts, factsVerified: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI Product Builder brief rejected";
    return jsonResponse(400, { error: message, factsLocked: true }, METHODS);
  }
  const generated = await generateAiProductBuilderDraft(brief);
  if (!generated.ok || !generated.draft) {
    const unavailable = generated.reason === "ai_product_builder_disabled"
      || generated.reason === "ai_product_builder_provider_not_configured";
    return jsonResponse(unavailable ? 503 : 502, {
      error: generated.reason,
      provider: generated.provider,
      publicationPerformed: false,
      marketplaceMutationPerformed: false,
    }, METHODS);
  }

  return jsonResponse(200, {
    ok: true,
    canonicalProductId,
    verifiedFactCount: verified.factCount,
    provider: generated.provider,
    draft: generated.draft,
    reviewRequired: true,
    publicationPerformed: false,
    marketplaceMutationPerformed: false,
  }, METHODS);
};
