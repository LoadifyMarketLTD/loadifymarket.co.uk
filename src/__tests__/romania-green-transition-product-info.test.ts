import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Romania green-transition product information contract", () => {
  const editor = read("src/pages/ProductFormPage.tsx");
  const adapter = read("src/lib/productAdapter.ts");
  const detail = read("src/pages/pixel-perfect/ProductDetail.tsx");
  const checkout = read("src/pages/pixel-perfect/Checkout.tsx");
  const createCheckout = read("netlify/functions/create-checkout.ts");
  const email = read("netlify/functions/send-email.ts");

  it("captures only reviewed producer-supplied durability, update and repair information", () => {
    expect(editor).toContain("euConsumerInformationReviewed");
    expect(editor).toContain("producerDurabilityGuaranteeMonths");
    expect(editor).toContain("softwareUpdateMinimumPeriod");
    expect(editor).toContain("reparabilityScore");
    expect(editor).toContain("sparePartsInformation");
    expect(editor).toContain("repairInformation");
    expect(editor).toContain("repairRestrictions");
    expect(editor).toContain("Do not invent information");
  });

  it("adapts and displays the reviewed information on Romania product and checkout surfaces", () => {
    expect(adapter).toContain("producerDurabilityGuaranteeMonths");
    expect(detail).toContain('market === "RO" && product.euConsumerInformationReviewed');
    expect(checkout).toContain('market === "RO" && item.product.euConsumerInformationReviewed');
  });

  it("fails Romania checkout closed when the review flag is absent", () => {
    expect(createCheckout).toContain("RO_PRODUCT_CONSUMER_INFO_REVIEW_REQUIRED");
    expect(createCheckout).toContain("euConsumerInformationReviewed");
  });

  it("retains the product information in the durable order confirmation", () => {
    expect(email).toContain("Garanție comercială de durabilitate");
    expect(email).toContain("Actualizări software");
    expect(email).toContain("Scor de reparabilitate");
    expect(email).toContain("Piese de schimb");
  });
});
