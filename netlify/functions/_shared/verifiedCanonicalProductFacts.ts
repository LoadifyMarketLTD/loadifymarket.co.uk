import type { SupabaseClient } from "@supabase/supabase-js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type VerifiedCanonicalFactsResult =
  | { ok: true; canonicalProductId: string; facts: Record<string, unknown>; factCount: number }
  | { ok: false; kind: "validation" | "not_found" | "upstream"; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function readVerifiedCanonicalProductFacts(
  admin: Pick<SupabaseClient, "rpc">,
  canonicalProductId: string,
): Promise<VerifiedCanonicalFactsResult> {
  const id = canonicalProductId.trim();
  if (!UUID_RE.test(id)) {
    return { ok: false, kind: "validation", error: "A valid canonicalProductId is required" };
  }
  const { data, error } = await admin.rpc("server_get_verified_canonical_product_facts_v1", {
    p_canonical_product_id: id,
  });
  if (error || !isRecord(data)) {
    return { ok: false, kind: "upstream", error: "Unable to read verified canonical product facts" };
  }

  const facts = isRecord(data.facts) ? data.facts : {};
  const factCount = typeof data.factCount === "number" ? data.factCount : Object.keys(facts).length;
  if (data.interfaceVersion !== 1 || data.factsVerified !== true || String(data.canonicalProductId) !== id) {
    return { ok: false, kind: "upstream", error: "Verified canonical facts response is malformed" };
  }
  if (factCount < 1) {
    return { ok: false, kind: "not_found", error: "No verified canonical product facts are available" };
  }

  return { ok: true, canonicalProductId: id, facts, factCount };
}
