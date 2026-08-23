import { describe, expect, it } from 'vitest';
import { WHOLESALE_SUBCATEGORY_BLUEPRINT } from './wholesaleSubcategoryBlueprint';
import { WHOLESALE_VISUAL_TAXONOMY } from './wholesaleVisualTaxonomy';

describe('wholesale subcategory blueprint', () => {
  it('contains exactly 96 explicit subcategory briefs', () => {
    expect(WHOLESALE_SUBCATEGORY_BLUEPRINT).toHaveLength(96);
  });

  it('matches the real 16 x 6 wholesale taxonomy exactly', () => {
    const taxonomyKeys = WHOLESALE_VISUAL_TAXONOMY.flatMap((category) =>
      category.subcategories.map((subcategory) => `${category.label}::${subcategory.label}`),
    ).sort();

    const blueprintKeys = WHOLESALE_SUBCATEGORY_BLUEPRINT.map(
      (entry) => `${entry.categoryLabel}::${entry.subcategoryLabel}`,
    ).sort();

    expect(blueprintKeys).toEqual(taxonomyKeys);
  });

  it('has no duplicate category/subcategory blueprint entries', () => {
    const keys = WHOLESALE_SUBCATEGORY_BLUEPRINT.map(
      (entry) => `${entry.categoryLabel}::${entry.subcategoryLabel}`,
    );
    expect(new Set(keys).size).toBe(96);
  });

  it('requires an explicit meaningful focus for every subcategory', () => {
    for (const entry of WHOLESALE_SUBCATEGORY_BLUEPRINT) {
      expect(entry.focus.trim().length).toBeGreaterThan(12);
    }
  });
});
