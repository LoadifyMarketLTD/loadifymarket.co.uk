import { describe, expect, it } from "vitest";
import { prepareAiProductBuilderBrief } from "../_shared/aiProductBuilderContract";
import { validateAiProductBuilderDraft } from "../_shared/aiProductBuilderGeneration";

const brief = prepareAiProductBuilderBrief({
  factsVerified: true,
  facts: {
    title: "Verified Product",
    description: "Verified description",
    brand: "Loadify Test",
    attributes: { colour: "Blue" },
  },
});

describe("AI Product Builder generation evidence contract", () => {
  it("accepts structured copy whose evidence keys are verified", () => {
    const draft = validateAiProductBuilderDraft(brief, {
      interfaceVersion: 1,
      title: { text: "Verified Product", evidenceKeys: ["title"] },
      description: { text: "Verified description", evidenceKeys: ["description"] },
      benefits: [{ text: "Presented in blue", evidenceKeys: ["attributes.colour"] }],
      seo: {
        title: { text: "Verified Product", evidenceKeys: ["title"] },
        description: { text: "Verified description", evidenceKeys: ["description"] },
      },
      faq: [{ question: "What brand is it?", answer: "Loadify Test", evidenceKeys: ["brand"] }],
      creativeBrief: { text: "Show the verified blue colour.", evidenceKeys: ["attributes.colour"] },
    });
    expect(draft.interfaceVersion).toBe(1);
    expect(draft.benefits).toHaveLength(1);
  });

  it("rejects unverified evidence references", () => {
    expect(() => validateAiProductBuilderDraft(brief, {
      interfaceVersion: 1,
      title: { text: "Certified product", evidenceKeys: ["certification"] },
      description: { text: "Verified description", evidenceKeys: ["description"] },
      benefits: [],
      seo: {
        title: { text: "Verified Product", evidenceKeys: ["title"] },
        description: { text: "Verified description", evidenceKeys: ["description"] },
      },
      faq: [],
      creativeBrief: { text: "Simple product image.", evidenceKeys: ["title"] },
    })).toThrow(/unverified evidence/i);
  });
});
