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

  it('assigns deterministic dedicated asset paths to every subcategory', () => {
    const paths = WHOLESALE_VISUAL_TAXONOMY.flatMap((category) =>
      category.subcategories.map((subcategory) => subcategory.imagePath),
    );

    expect(paths).toHaveLength(96);
    expect(new Set(paths).size).toBe(96);
    for (const path of paths) {
      expect(path).toMatch(/^\/category-visuals\/subcategories\/[a-z0-9-]+\.jpg$/);
    }
  });

  it('keeps all subcategory visuals pending until dedicated assets are staged', () => {
    expect(allWholesaleSubcategoriesPending()).toBe(true);
    for (const category of WHOLESALE_VISUAL_TAXONOMY) {
      for (const subcategory of category.subcategories) {
        expect(subcategory.status).toBe('subcategory-pending');
      }
    }
  });
});
