import { describe, expect, it } from 'vitest';
import {
  LEVEL_THREE_VISUAL_SLUGS,
  LEVEL_TWO_VISUAL_SLUGS,
  ROOT_CATEGORY_VISUALS,
  categoryVisualPath,
  resolveCategoryVisual,
} from './categoryVisualContract';

describe('category visual contract', () => {
  it('defines exactly the ten canonical root categories', () => {
    expect(ROOT_CATEGORY_VISUALS.map((item) => item.slug)).toEqual([
      'electronics',
      'home-garden',
      'clothing-fashion',
      'toys-games',
      'sports-fitness',
      'automotive',
      'health-beauty',
      'pets',
      'food-drink',
      'office-business',
    ]);
  });

  it('assigns a deterministic dedicated asset path to every canonical slug', () => {
    const slugs = [
      ...ROOT_CATEGORY_VISUALS.map((item) => item.slug),
      ...LEVEL_TWO_VISUAL_SLUGS,
      ...LEVEL_THREE_VISUAL_SLUGS,
    ];

    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) {
      expect(categoryVisualPath(slug)).toBe(`/category-visuals/${slug}.jpg`);
    }
  });

  it('uses the correct root visual as a level-two fallback', () => {
    const visual = resolveCategoryVisual('audio', 'Audio', 'electronics');
    expect(visual.fallbackImage).toBe('/category-visuals/electronics.jpg');
  });

  it('uses the correct root visual as a level-three fallback', () => {
    const visual = resolveCategoryVisual('headphones', 'Headphones', 'audio');
    expect(visual.fallbackImage).toBe('/category-visuals/electronics.jpg');
  });

  it('does not invent a live-listing claim in alt text', () => {
    const visual = resolveCategoryVisual('kitchen-dining', 'Kitchen & Dining', 'home-garden');
    expect(visual.alt).toBe('Kitchen & Dining category');
    expect(visual.alt.toLowerCase()).not.toContain('listing');
    expect(visual.alt.toLowerCase()).not.toContain('product for sale');
  });
});
