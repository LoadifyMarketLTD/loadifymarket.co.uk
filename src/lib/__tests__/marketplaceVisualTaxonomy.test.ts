import { describe, expect, it } from "vitest";
import { marketplaceTaxonomy } from "@/data/marketplaceTaxonomy";
import { marketplaceVisuals } from "@/data/marketplaceVisuals";
import { duplicateDedicatedImagesGlobally } from "@/data/subcategoryImages";

describe("canonical marketplace visual taxonomy", () => {
  it("keeps exactly 16 categories and 96 subcategories", () => {
    expect(marketplaceTaxonomy).toHaveLength(16);
    expect(marketplaceTaxonomy.reduce((total, category) => total + category.subcategories.length, 0)).toBe(96);
  });

  it("keeps every root category image same-origin", () => {
    expect(marketplaceVisuals).toHaveLength(16);
    for (const category of marketplaceVisuals) {
      expect(category.image).toMatch(/^\/images\/categories\//);
      expect(category.image).not.toMatch(/^https?:\/\//);
    }
  });

  it("serves every dedicated subcategory image through the Loadify same-origin boundary", () => {
    for (const category of marketplaceVisuals) {
      for (const subcategory of category.subcategories) {
        expect(subcategory.image).toMatch(/^\/api\/category-editorial-image\?/);
        expect(subcategory.image).not.toMatch(/^https?:\/\//);
      }
    }
  });

  it("gives every subcategory a dedicated non-parent image", () => {
    expect(marketplaceVisuals).toHaveLength(16);
    for (const category of marketplaceVisuals) {
      expect(category.subcategories).toHaveLength(6);
      for (const subcategory of category.subcategories) {
        expect(subcategory.image).toBeTruthy();
        expect(subcategory.image).not.toBe(category.image);
      }
    }
  });

  it("does not reuse a dedicated subcategory image anywhere in the taxonomy", () => {
    expect(duplicateDedicatedImagesGlobally()).toEqual([]);
    const images = marketplaceVisuals.flatMap((category) => category.subcategories.map((subcategory) => subcategory.image));
    expect(new Set(images).size).toBe(96);
  });
});