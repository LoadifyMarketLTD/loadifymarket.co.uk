import { describe, expect, it } from 'vitest';
import {
  DEDICATED_WHOLESALE_SUBCATEGORY_VISUALS,
  PENDING_WHOLESALE_SUBCATEGORY_VISUALS,
  WHOLESALE_SUBCATEGORY_VISUAL_MANIFEST,
  WHOLESALE_SUBCATEGORY_VISUAL_MANIFEST_COUNT,
} from './wholesaleSubcategoryVisualManifest';

describe('wholesale subcategory visual manifest', () => {
  it('contains exactly 96 entries', () => {
    expect(WHOLESALE_SUBCATEGORY_VISUAL_MANIFEST_COUNT).toBe(96);
  });

  it('has a unique asset path for every subcategory', () => {
    const paths = WHOLESALE_SUBCATEGORY_VISUAL_MANIFEST.map((entry) => entry.assetPath);
    expect(new Set(paths).size).toBe(96);
  });

  it('accounts for every subcategory as pending or dedicated', () => {
    expect(
      PENDING_WHOLESALE_SUBCATEGORY_VISUALS.length + DEDICATED_WHOLESALE_SUBCATEGORY_VISUALS.length,
    ).toBe(96);
  });

  it('locks the shared visual standard', () => {
    for (const entry of WHOLESALE_SUBCATEGORY_VISUAL_MANIFEST) {
      expect(entry.ratio).toBe('4:3');
      expect(entry.crop).toBe('cover');
      expect(entry.style).toBe('premium-commercial-clean');
      expect(entry.assetPath).toMatch(/^\/category-visuals\/subcategories\/.+\.jpg$/);
      expect(entry.visualBrief.length).toBeGreaterThan(100);
      expect(entry.alt.length).toBeGreaterThan(10);
    }
  });

  it('forbids duplicate final visual sources inside the same parent category', () => {
    const byCategory = new Map<string, string[]>();

    for (const entry of DEDICATED_WHOLESALE_SUBCATEGORY_VISUALS) {
      const visuals = byCategory.get(entry.categorySlug) ?? [];
      visuals.push(entry.displayImage);
      byCategory.set(entry.categorySlug, visuals);
    }

    for (const [categorySlug, visuals] of byCategory) {
      expect(
        new Set(visuals).size,
        `Duplicate dedicated subcategory imagery detected in ${categorySlug}`,
      ).toBe(visuals.length);
    }
  });

  it('never treats a parent-category image as a dedicated subcategory visual', () => {
    for (const entry of DEDICATED_WHOLESALE_SUBCATEGORY_VISUALS) {
      expect(entry.displayImage).not.toMatch(/\/category-visuals\/wholesale\//);
      expect(entry.displayImage).not.toEqual(entry.assetPath.replace('/subcategories/', '/wholesale/'));
    }
  });

  it('Home & Garden has six distinct dedicated visuals', () => {
    const homeGarden = DEDICATED_WHOLESALE_SUBCATEGORY_VISUALS.filter(
      (entry) => entry.categorySlug === 'home-and-garden',
    );

    expect(homeGarden).toHaveLength(6);
    expect(new Set(homeGarden.map((entry) => entry.displayImage)).size).toBe(6);
    expect(homeGarden.every((entry) => Boolean(entry.sourcePage))).toBe(true);
  });
});
