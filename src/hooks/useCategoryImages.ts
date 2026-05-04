/**
 * useCategoryImages
 *
 * Fetches one representative product image per category from the live database.
 * Returns a map of { [categorySlug]: imageUrl } so category circles on the
 * mobile home screen show real product photos instead of generic placeholders.
 *
 * Strategy:
 *  1. Resolve category IDs from the known slugs (one round-trip).
 *  2. Fetch the most-viewed active+approved product for each of those categories
 *     (one round-trip, limit 50 to cover all categories comfortably).
 *  3. Pick the first image for each category slug and return the map.
 *
 * Falls back gracefully to an empty map (caller uses static fallback images).
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

/** Map of category slug → first product image URL */
export type CategoryImageMap = Record<string, string>;

/** The DB category slugs we want to resolve product images for */
export const CATEGORY_SLUGS = [
  'electrical',
  'wholesale-clothing',
  'homeware',
  'sports-fitness',
  'health-beauty',
  'toys',
] as const;

export function useCategoryImages(): CategoryImageMap {
  const [imageMap, setImageMap] = useState<CategoryImageMap>({});

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // Step 1: Resolve category IDs for our slugs
      const { data: cats, error: catsError } = await supabase
        .from('categories')
        .select('id, slug')
        .in('slug', CATEGORY_SLUGS as unknown as string[]);

      if (catsError || !cats || cats.length === 0) return;

      const catIdToSlug = new Map<string, string>(
        (cats as Array<{ id: string; slug: string }>).map((c) => [c.id, c.slug]),
      );
      const catIds = (cats as Array<{ id: string }>).map((c) => c.id);

      // Step 2: Fetch top products for those categories (ordered by views desc)
      const { data: products, error: prodError } = await supabase
        .from('products')
        .select('images, categoryId')
        .eq('isActive', true)
        .eq('isApproved', true)
        .not('type', 'eq', 'logistics')
        .in('categoryId', catIds)
        .order('views', { ascending: false })
        .limit(50);

      if (prodError || !products || cancelled) return;

      // Step 3: Pick the first image for each slug (preserve views-desc order)
      const map: CategoryImageMap = {};
      for (const p of products as Array<{ images: string[] | null; categoryId: string }>) {
        const slug = catIdToSlug.get(p.categoryId);
        if (slug && !map[slug] && Array.isArray(p.images) && p.images.length > 0) {
          map[slug] = p.images[0];
        }
        // Stop early once we have one image per slug
        if (Object.keys(map).length === CATEGORY_SLUGS.length) break;
      }

      if (!cancelled) setImageMap(map);
    }

    load().catch(() => { /* non-fatal — caller uses static fallback */ });

    return () => {
      cancelled = true;
    };
  }, []);

  return imageMap;
}
