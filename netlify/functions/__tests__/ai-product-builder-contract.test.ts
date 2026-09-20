import { describe, expect, it } from "vitest";
import { prepareAiProductBuilderBrief } from "../_shared/aiProductBuilderContract";

describe("AI Product Builder facts-lock contract", () => {
  it("rejects any attempt to prepare merchandising before facts are verified", () => {
    expect(() => prepareAiProductBuilderBrief({
      facts: { title: "Example product" },
      factsVerified: false,
    })).toThrow("requires verified product facts");
  });

  it("creates a presentation-only brief from verified facts", () => {
    const brief = prepareAiProductBuilderBrief({
      facts: {
        title: "Example product",
        description: "Supplier-backed description",
        brand: "Example",
        attributes: { colour: "Black", pack_size: 2 },
      },
      factsVerified: true,
    });

    expect(brief.factsLocked).toBe(true);
    expect(brief.verifiedFacts.title).toBe("Example product");
    expect(brief.verifiedFacts.attributes).toEqual({ colour: "Black", pack_size: 2 });
    expect(brief.instructions.join(" ")).toContain("Do not infer or invent product facts");
  });

  it("lists high-risk claims as forbidden when they are absent from evidence", () => {
    const brief = prepareAiProductBuilderBrief({
      facts: { title: "Example product" },
      factsVerified: true,
    });
    expect(brief.forbiddenClaims).toContain("certification");
    expect(brief.forbiddenClaims).toContain("medical");
    expect(brief.forbiddenClaims).toContain("delivery");
  });
});
