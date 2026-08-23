import { describe, expect, it } from 'vitest';
import {
  WHOLESALE_SUBCATEGORY_VISUAL_MANIFEST,
  WHOLESALE_SUBCATEGORY_VISUAL_MANIFEST_COUNT,
  PENDING_WHOLESALE_SUBCATEGORY_VISUALS,
} from './wholesaleSubcategoryVisualManifest';

describe('wholesale subcategory visual manifest', () => {
  it('contains exactly 96 entries', () => {
    expect(WHOLESALE_SUBCATEGORY_VISUAL_MANIFEST_COUNT).toBe(96);
  });

  it('has a unique asset path for every subcategory', () => {
    const paths = WHOLESALE_SUBCATEGORY_VISUAL_MANIFEST.map((entry) => entry.assetPath);
    expect(new Set(paths).size).toBe(96);
  });

  it('keeps all subcategory assets pending until dedicated files exist', () => {
    expect(PENDING_WHOLESALE_SUBCATEGORY_VISUALS).toHaveLength(96);
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

  it('forbids duplicate final image paths inside the same parent category', () => {
    const byCategory = new Map<string, string[]>();

    for (const entry of WHOLESALE_SUBCATEGORY_VISUAL_MANIFEST) {
      if (entry.status !== 'dedicated') continue;
      const paths = byCategory.get(entry.categorySlug) ?? [];
      paths.push(entry.assetPath);
      byCategory.set(entry.categorySlug, paths);
    }

    for (const [categorySlug, paths] of byCategory) {
      expect(
        new Set(paths).size,
        `Duplicate dedicated subcategory imagery detected in ${categorySlug}`,
      ).toBe(paths.length);
    }
  });

  it('never treats a parent-category image as a dedicated subcategory image', () => {
    for (const entry of WHOLESALE_SUBCATEGORY_VISUAL_MANIFEST) {
      if (entry.status !== 'dedicated') continue;
      expect(entry.assetPath).not.toMatch(/^\/category-visuals\/wholesale\//);
    }
  });
});
