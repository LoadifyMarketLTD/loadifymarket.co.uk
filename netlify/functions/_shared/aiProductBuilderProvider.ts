import type { AiProductBuilderBriefV1 } from "./aiProductBuilderContract";
import {
  buildAiProductBuilderProviderPayload,
  validateAiProductBuilderDraft,
  type AiProductBuilderDraftV1,
} from "./aiProductBuilderGeneration";

export interface AiProductBuilderProviderResult {
  ok: boolean;
  reason: string;
  provider: string;
  draft?: AiProductBuilderDraftV1;
}

function runtimeConfig() {
  const enabled = process.env.LOADIFY_AI_PRODUCT_BUILDER_ENABLED === "true";
  const url = (process.env.LOADIFY_AI_PRODUCT_BUILDER_PROVIDER_URL || "").trim();
  const apiKey = (process.env.LOADIFY_AI_PRODUCT_BUILDER_API_KEY || "").trim();
  const model = (process.env.LOADIFY_AI_PRODUCT_BUILDER_MODEL || "").trim();
  return { enabled, url, apiKey, model };
}

export function aiProductBuilderProviderAvailable(): boolean {
  const config = runtimeConfig();
  return config.enabled && /^https:\/\//i.test(config.url) && Boolean(config.apiKey && config.model);
}
export async function generateAiProductBuilderDraft(
  brief: AiProductBuilderBriefV1,
): Promise<AiProductBuilderProviderResult> {
  const config = runtimeConfig();
  if (!config.enabled) return { ok: false, reason: "ai_product_builder_disabled", provider: "none" };
  if (!/^https:\/\//i.test(config.url) || !config.apiKey || !config.model) {
    return { ok: false, reason: "ai_product_builder_provider_not_configured", provider: "none" };
  }

  let response: Response;
  try {
    response = await fetch(config.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        input: buildAiProductBuilderProviderPayload(brief),
        response_format: "json",
      }),
      signal: AbortSignal.timeout(30000),
    });
  } catch {
    return { ok: false, reason: "ai_product_builder_provider_unavailable", provider: "http_json" };
  }
  if (!response.ok) {
    return { ok: false, reason: "ai_product_builder_provider_rejected", provider: "http_json" };
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return { ok: false, reason: "ai_product_builder_provider_invalid_json", provider: "http_json" };
  }

  try {
    const draft = validateAiProductBuilderDraft(brief, payload);
    return { ok: true, reason: "generated_and_validated", provider: "http_json", draft };
  } catch {
    return { ok: false, reason: "ai_product_builder_output_failed_evidence_validation", provider: "http_json" };
  }
}
