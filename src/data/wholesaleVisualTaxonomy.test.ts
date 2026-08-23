import { describe, expect, it } from 'vitest';
import {
  WHOLESALE_VISUAL_CATEGORY_COUNT,
  WHOLESALE_VISUAL_SUBCATEGORY_COUNT,
  WHOLESALE_VISUAL_TAXONOMY,
  allWholesaleSubcategoriesPending,
} from './wholesaleVisualTaxonomy';

describe('wholesale visual taxonomy contract', () => {
  it('contains exactly 16 wholesale categories', () => {
    expect(WHOLESALE_VISUAL_CATEGORY_COUNT).toBe(16);
  });

  it('contains exactly six subcategories per category and 96 total', () => {
    expect(WHOLESALE_VISUAL_SUBCATEGORY_COUNT).toBe(96);
    for (const category of WHOLESALE_VISUAL_TAXONOMY) {
      expect(category.subcategories).toHaveLength(6);
    }
  });

  it('assigns globally unique namespaced local asset paths to every subcategory', () => {
    const paths = WHOLESALE_VISUAL_TAXONOMY.flatMap((category) =>
      category.subcategories.map((subcategory) => subcategory.imagePath),
    );

    expect(paths).toHaveLength(96);
    expect(new Set(paths).size).toBe(96);
    for (const path of paths) {
      expect(path).toMatch(/^\/category-visuals\/subcategories\/[a-z0-9-]+\/[a-z0-9-]+\.jpg$/);
    }
  });

  it('has a dedicated visual source selected for every subcategory', () => {
    expect(allWholesaleSubcategoriesPending()).toBe(false);
    const subcategories = WHOLESALE_VISUAL_TAXONOMY.flatMap((category) => category.subcategories);
    expect(subcategories).toHaveLength(96);
    expect(subcategories.every((subcategory) => subcategory.status === 'dedicated')).toBe(true);
    expect(subcategories.every((subcategory) => Boolean(subcategory.sourcePage))).toBe(true);
    expect(new Set(subcategories.map((subcategory) => subcategory.displayImage)).size).toBe(96);
  });
});
