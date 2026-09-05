import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  CATEGORY_SEO_LANDINGS,
  CATEGORY_SEO_PATHS,
} from '../../../src/lib/categorySeo';
import {
  marketplaceCategorySlug,
  marketplaceTaxonomy,
} from '../../../src/data/marketplaceTaxonomy';
import { buildLiveCategoryPaths, STATIC_PAGES } from '../sitemap';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('SEO Level 3 category architecture', () => {
  it('covers the complete curated marketplace taxonomy with one landing per parent category', () => {
    const taxonomySlugs = marketplaceTaxonomy.map((category) => marketplaceCategorySlug(category.label));
    const landingSlugs = new Set(CATEGORY_SEO_LANDINGS.map((landing) => landing.slug));

    expect(CATEGORY_SEO_LANDINGS).toHaveLength(16);
    expect(new Set(CATEGORY_SEO_PATHS).size).toBe(16);
    expect(taxonomySlugs).toHaveLength(CATEGORY_SEO_LANDINGS.length);
    for (const slug of taxonomySlugs) {
      expect(landingSlugs.has(slug), `missing SEO landing for ${slug}`).toBe(true);
    }
  });

  it('keeps category keyword intents distinct and metadata within useful limits', () => {
    const keywords = CATEGORY_SEO_LANDINGS.map((landing) => landing.primaryKeyword.toLowerCase());
    expect(new Set(keywords).size).toBe(keywords.length);

    for (const landing of CATEGORY_SEO_LANDINGS) {
      expect(landing.title.length, `title too long: ${landing.slug}`).toBeLessThanOrEqual(70);
      expect(landing.description.length, `description too short: ${landing.slug}`).toBeGreaterThanOrEqual(110);
      expect(landing.description.length, `description too long: ${landing.slug}`).toBeLessThanOrEqual(170);
    }
  });

  it('separates retail category intent from trade-stock intent', () => {
    const retail = CATEGORY_SEO_LANDINGS.filter((landing) => landing.intent === 'retail-category');
    const trade = CATEGORY_SEO_LANDINGS.filter((landing) => landing.intent === 'trade-stock');
    expect(retail).toHaveLength(12);
    expect(trade).toHaveLength(4);

    expect(trade.find((landing) => landing.slug === 'mixed-lots')?.primaryKeyword).toBe('wholesale job lots UK');
    expect(trade.find((landing) => landing.slug === 'customer-returns')?.primaryKeyword).toBe('customer returns pallets UK');
    expect(trade.find((landing) => landing.slug === 'clearance-deals')?.primaryKeyword).toBe('wholesale clearance stock UK');
  });

  it('publishes a curated landing only when its displayed primary hosted category has live inventory', () => {
    const categories = [
      { id: 'toys-games-id', slug: 'toys-games' },
      { id: 'toys-alias-id', slug: 'toys' },
      { id: 'electronics-id', slug: 'electronics' },
      { id: 'empty-id', slug: 'home-garden' },
    ];
    const primaryPaths = buildLiveCategoryPaths(categories, new Set(['toys-games-id']));
    expect(primaryPaths).toContain('/category/toys-games');
    expect(primaryPaths).toContain('/category/toys-and-games');

    const aliasOnlyPaths = buildLiveCategoryPaths(categories, new Set(['toys-alias-id']));
    expect(aliasOnlyPaths).toContain('/category/toys');
    expect(aliasOnlyPaths).not.toContain('/category/toys-and-games');
    expect(aliasOnlyPaths).not.toContain('/category/electronics-and-technology');
    expect(aliasOnlyPaths).not.toContain('/category/home-and-garden');
  });

  it('keeps category URLs out of the static fallback sitemap', () => {
    expect(STATIC_PAGES.some((entry) => entry.loc.startsWith('/category/'))).toBe(false);
    expect(read('public/sitemap.xml')).not.toContain('<loc>https://loadifymarket.co.uk/category/');
  });

  it('fails closed for empty and faceted category URLs at the edge', () => {
    const source = read('netlify/edge-functions/category-meta.ts');
    expect(source).toContain("path: '/category/*'");
    expect(source).toContain("'noindex, follow'");
    expect(source).toContain('requestUrl.search.length > 0');
    expect(source).toContain('primaryDbSlug');
    expect(source).toContain('status: 404');
    expect(source).toContain('stockQuantity.gt.0');
  });

  it('noindexes catalog query/filter states while keeping the parent catalog canonical', () => {
    const source = read('netlify/edge-functions/public-meta.ts');
    expect(source).toContain("pathname === '/catalog' && requestUrl.search.length > 0");
    expect(source).toContain("setRobots(html, 'noindex, follow')");
    expect(source).toContain('`${BASE_URL}${pathname}`');
  });

  it('shares curated category metadata with browser rendering', () => {
    const source = read('src/components/SEO.tsx');
    expect(source).toContain('getCategorySeoLanding');
    expect(source).toContain('categoryMeta(canonical)');
  });
});
