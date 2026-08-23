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

  it('has a unique namespaced local asset path for every subcategory', () => {
    const paths = WHOLESALE_SUBCATEGORY_VISUAL_MANIFEST.map((entry) => entry.assetPath);
    expect(paths).toHaveLength(96);
    expect(new Set(paths).size).toBe(96);
    for (const entry of WHOLESALE_SUBCATEGORY_VISUAL_MANIFEST) {
      expect(entry.assetPath).toMatch(/^\/category-visuals\/subcategories\/[a-z0-9-]+\/[a-z0-9-]+\.jpg$/);
      expect(entry.displayImage).toBe(entry.assetPath);
    }
  });

  it('has all 96 visual sources selected and no pending subcategory', () => {
    expect(DEDICATED_WHOLESALE_SUBCATEGORY_VISUALS).toHaveLength(96);
    expect(PENDING_WHOLESALE_SUBCATEGORY_VISUALS).toHaveLength(0);
  });

  it('locks the shared visual standard and explicit blueprint focus', () => {
    for (const entry of WHOLESALE_SUBCATEGORY_VISUAL_MANIFEST) {
      expect(entry.ratio).toBe('4:3');
      expect(entry.crop).toBe('cover');
      expect(entry.style).toBe('premium-commercial-clean');
      expect(entry.visualBrief.length).toBeGreaterThan(100);
      expect(entry.alt.length).toBeGreaterThan(10);
      expect(entry.focus.length).toBeGreaterThan(3);
      expect(entry.sourceImage).toMatch(/^https:\/\/unsplash\.com\/photos\//);
      expect(entry.sourcePage).toMatch(/^https:\/\/unsplash\.com\/photos\//);
    }
  });

  it('forbids reuse of a source image anywhere across the 96 subcategories', () => {
    const images = DEDICATED_WHOLESALE_SUBCATEGORY_VISUALS.map((entry) => entry.sourceImage);
    const pages = DEDICATED_WHOLESALE_SUBCATEGORY_VISUALS.map((entry) => entry.sourcePage);
    expect(new Set(images).size).toBe(96);
    expect(new Set(pages).size).toBe(96);
  });

  it('never treats a parent-category image as a dedicated subcategory visual', () => {
    for (const entry of DEDICATED_WHOLESALE_SUBCATEGORY_VISUALS) {
      expect(entry.displayImage).not.toMatch(/^\/category-visuals\/wholesale\//);
      expect(entry.assetPath).not.toMatch(/^\/category-visuals\/wholesale\//);
    }
  });

  it('requires every category to be complete at exactly six of six', () => {
    const counts = new Map<string, number>();
    for (const entry of DEDICATED_WHOLESALE_SUBCATEGORY_VISUALS) {
      counts.set(entry.categorySlug, (counts.get(entry.categorySlug) ?? 0) + 1);
    }

    expect(counts.size).toBe(16);
    for (const [categorySlug, count] of counts) {
      expect(count, `${categorySlug} must have six dedicated visuals`).toBe(6);
    }
  });
});
