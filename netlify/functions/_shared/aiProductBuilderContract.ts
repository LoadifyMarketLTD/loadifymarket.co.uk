export const AI_PRODUCT_BUILDER_CONTRACT_VERSION = 1 as const;

const FORBIDDEN_FACT_KEYS = new Set([
  "certification",
  "certifications",
  "safety",
  "material",
  "materials",
  "origin",
  "countryoforigin",
  "warranty",
  "compatibility",
  "performance",
  "environmental",
  "medical",
  "authenticity",
  "delivery",
  "deliverytime",
  "shippingtime",
]);

export type VerifiedFactValue = string | number | boolean | null | string[];

export interface VerifiedProductFactsV1 {
  title: string;
  description?: string;
  brand?: string;
  sku?: string;
  gtin?: string;
  mpn?: string;
  price?: string;
  currency?: string;
  availability?: string;
  attributes?: Record<string, VerifiedFactValue>;
}

export interface AiProductBuilderBriefV1 {
  interfaceVersion: typeof AI_PRODUCT_BUILDER_CONTRACT_VERSION;
  factsLocked: true;
  verifiedFacts: VerifiedProductFactsV1;
  allowedOutputs: [
    "title",
    "description",
    "benefits",
    "seo",
    "faq",
    "variant_presentation",
    "marketing_copy",
    "creative_brief",
  ];
  forbiddenClaims: string[];
  instructions: string[];
}
function cleanString(value: unknown, max = 4000): string | undefined {
  if (typeof value !== "string") return undefined;
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned ? cleaned.slice(0, max) : undefined;
}

function cleanScalar(value: unknown): VerifiedFactValue | undefined {
  if (typeof value === "string") return cleanString(value, 1000);
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "boolean" || value === null) return value;
  if (Array.isArray(value)) {
    const strings = value
      .filter((item): item is string => typeof item === "string")
      .map((item) => cleanString(item, 500))
      .filter((item): item is string => Boolean(item))
      .slice(0, 50);
    return strings;
  }
  return undefined;
}

function normalizedKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function prepareAiProductBuilderBrief(input: {
  facts: Record<string, unknown>;
  factsVerified: boolean;
}): AiProductBuilderBriefV1 {
  if (!input.factsVerified) {
    throw new Error("AI Product Builder requires verified product facts");
  }

  const title = cleanString(input.facts.title, 300);
  if (!title) throw new Error("Verified product title is required");

  const verifiedFacts: VerifiedProductFactsV1 = {
    title,
  };

  for (const key of ["description", "brand", "sku", "gtin", "mpn", "price", "currency", "availability"] as const) {
    const value = cleanString(input.facts[key], key === "description" ? 6000 : 500);
    if (value) verifiedFacts[key] = value;
  }

  if (input.facts.attributes !== undefined) {
    if (!input.facts.attributes || typeof input.facts.attributes !== "object" || Array.isArray(input.facts.attributes)) {
      throw new Error("Verified product attributes must be an object");
    }
    const attributes: Record<string, VerifiedFactValue> = {};
    for (const [key, rawValue] of Object.entries(input.facts.attributes as Record<string, unknown>)) {
      const cleanedKey = cleanString(key, 100);
      if (!cleanedKey) continue;
      const value = cleanScalar(rawValue);
      if (value === undefined) continue;
      attributes[cleanedKey] = value;
    }
    if (Object.keys(attributes).length) verifiedFacts.attributes = attributes;
  }
  const presentKeys = new Set<string>([
    ...Object.keys(verifiedFacts).map(normalizedKey),
    ...Object.keys(verifiedFacts.attributes ?? {}).map(normalizedKey),
  ]);

  const forbiddenClaims = [
    "certification",
    "safety",
    "material",
    "origin",
    "warranty",
    "compatibility",
    "performance",
    "environmental",
    "medical",
    "authenticity",
    "delivery",
  ].filter((key) => !presentKeys.has(normalizedKey(key)));

  for (const key of Object.keys(input.facts)) {
    if (FORBIDDEN_FACT_KEYS.has(normalizedKey(key)) && !presentKeys.has(normalizedKey(key))) {
      throw new Error("Unverified restricted product claim rejected");
    }
  }

  return {
    interfaceVersion: AI_PRODUCT_BUILDER_CONTRACT_VERSION,
    factsLocked: true,
    verifiedFacts,
    allowedOutputs: [
      "title",
      "description",
      "benefits",
      "seo",
      "faq",
      "variant_presentation",
      "marketing_copy",
      "creative_brief",
    ],
    forbiddenClaims,
    instructions: [
      "Use only the verifiedFacts object as factual source material.",
      "Do not infer or invent product facts that are absent from verifiedFacts.",
      "Do not create certifications, safety claims, materials, origin, warranty, compatibility, performance, environmental, medical, authenticity or delivery claims unless the exact fact is present.",
      "You may improve structure, readability, SEO presentation and merchandising language without changing factual meaning.",
      "If a requested statement cannot be supported by verifiedFacts, omit it rather than guessing.",
    ],
  };
}
