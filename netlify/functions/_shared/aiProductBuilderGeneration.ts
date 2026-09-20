import type { AiProductBuilderBriefV1 } from "./aiProductBuilderContract";

export interface EvidenceText {
  text: string;
  evidenceKeys: string[];
}

export interface AiProductBuilderDraftV1 {
  interfaceVersion: 1;
  title: EvidenceText;
  description: EvidenceText;
  benefits: EvidenceText[];
  seo: {
    title: EvidenceText;
    description: EvidenceText;
  };
  faq: Array<{ question: string; answer: string; evidenceKeys: string[] }>;
  creativeBrief: EvidenceText;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizedKey(value: string): string {
  return value.trim().toLowerCase();
}
function verifiedKeySet(brief: AiProductBuilderBriefV1): Set<string> {
  const keys = new Set(Object.keys(brief.verifiedFacts).map(normalizedKey));
  for (const key of Object.keys(brief.verifiedFacts.attributes ?? {})) {
    keys.add(normalizedKey(key));
    keys.add(`attributes.${normalizedKey(key)}`);
  }
  return keys;
}

function parseEvidenceText(value: unknown, keys: Set<string>, label: string, max: number): EvidenceText {
  if (!isRecord(value) || typeof value.text !== "string" || !Array.isArray(value.evidenceKeys)) {
    throw new Error(`${label} must contain text and evidenceKeys`);
  }
  const text = value.text.trim();
  if (!text || text.length > max) throw new Error(`${label} text is invalid`);
  const evidenceKeys = value.evidenceKeys
    .filter((item): item is string => typeof item === "string")
    .map(normalizedKey)
    .filter(Boolean);
  if (!evidenceKeys.length) throw new Error(`${label} requires evidence keys`);
  if (evidenceKeys.some((key) => !keys.has(key))) throw new Error(`${label} references unverified evidence`);
  return { text, evidenceKeys: [...new Set(evidenceKeys)] };
}
export function validateAiProductBuilderDraft(
  brief: AiProductBuilderBriefV1,
  raw: unknown,
): AiProductBuilderDraftV1 {
  if (!isRecord(raw) || raw.interfaceVersion !== 1 || !isRecord(raw.seo)) {
    throw new Error("AI Product Builder output is malformed");
  }
  const keys = verifiedKeySet(brief);
  const benefitsRaw = Array.isArray(raw.benefits) ? raw.benefits : [];
  const faqRaw = Array.isArray(raw.faq) ? raw.faq : [];
  if (benefitsRaw.length > 8 || faqRaw.length > 8) throw new Error("AI Product Builder output exceeds limits");

  const benefits = benefitsRaw.map((item, index) =>
    parseEvidenceText(item, keys, `benefit ${index + 1}`, 500),
  );
  const faq = faqRaw.map((item, index) => {
    if (!isRecord(item) || typeof item.question !== "string" || typeof item.answer !== "string" || !Array.isArray(item.evidenceKeys)) {
      throw new Error(`faq ${index + 1} is malformed`);
    }
    const question = item.question.trim();
    const answer = item.answer.trim();
    const evidenceKeys = item.evidenceKeys.filter((key): key is string => typeof key === "string").map(normalizedKey).filter(Boolean);
    if (!question || !answer || question.length > 500 || answer.length > 1500 || !evidenceKeys.length) throw new Error(`faq ${index + 1} is invalid`);
    if (evidenceKeys.some((key) => !keys.has(key))) throw new Error(`faq ${index + 1} references unverified evidence`);
    return { question, answer, evidenceKeys: [...new Set(evidenceKeys)] };
  });
  return {
    interfaceVersion: 1,
    title: parseEvidenceText(raw.title, keys, "title", 300),
    description: parseEvidenceText(raw.description, keys, "description", 6000),
    benefits,
    seo: {
      title: parseEvidenceText(raw.seo.title, keys, "seo title", 70),
      description: parseEvidenceText(raw.seo.description, keys, "seo description", 180),
    },
    faq,
    creativeBrief: parseEvidenceText(raw.creativeBrief, keys, "creative brief", 3000),
  };
}

export function buildAiProductBuilderProviderPayload(brief: AiProductBuilderBriefV1) {
  return {
    task: "loadify_ai_product_builder_v1",
    instructions: brief.instructions,
    forbiddenClaims: brief.forbiddenClaims,
    verifiedFacts: brief.verifiedFacts,
    outputContract: {
      interfaceVersion: 1,
      evidenceRule: "Every generated section must include evidenceKeys referencing only keys present in verifiedFacts.",
      requiredSections: ["title", "description", "benefits", "seo", "faq", "creativeBrief"],
    },
  };
}
