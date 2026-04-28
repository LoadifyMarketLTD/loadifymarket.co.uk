/**
 * useMobileProducts
 *
 * Fetches two small product sets for the mobile home screen in parallel:
 *   - trending: ordered by views desc  (most popular)
 *   - latest:   ordered by createdAt desc (newest listings)
 *
 * Uses the same Supabase query pattern and adapter as the Catalog page so
 * data shapes are consistent with the rest of the app.
 *
 * Results are intentionally not cached at module level — this hook is only
 * mounted on the mobile home screen and its data should be fresh on each visit.
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { adaptProducts } from '@/lib/productAdapter';
import type { DBProduct } from '@/lib/productAdapter';
import type { Product } from '@/components/catalog/ProductCard';

// Same join shape used by the Catalog page
const PRODUCT_QUERY = `
  *,
  category:categories!categoryId(name, slug),
  subcategory:categories!subcategoryId(name, slug)
`;

async function fetchSellerMap(
  sellerIds: string[],
): Promise<Map<string, { businessName?: string; isApproved?: boolean; rating?: number; userId?: string }>> {
  const map = new Map<string, { businessName?: string; isApproved?: boolean; rating?: number; userId?: string }>();
  if (sellerIds.length === 0) return map;
  const { data } = await supabase
    .from('seller_profiles_public')
    .select('userId, businessName, isApproved, rating')
    .in('userId', sellerIds);
  (data ?? []).forEach((row: { userId?: string; businessName?: string; isApproved?: boolean; rating?: number }) => {
    if (row.userId) map.set(row.userId, row);
  });
  return map;
}

async function fetchProductSet(
  orderColumn: 'views' | 'createdAt',
  limit = 8,
): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_QUERY)
    .eq('isActive', true)
    .eq('isApproved', true)
    .not('type', 'eq', 'logistics')
    .order(orderColumn, { ascending: false })
    .limit(limit);

  if (error || !data || data.length === 0) return [];

  const rows = data as Record<string, unknown>[];
  const sellerIds = [
    ...new Set(rows.map((p) => p.sellerId as string).filter(Boolean)),
  ];
  const sellerMap = await fetchSellerMap(sellerIds);

  const mapped = rows.map((p) => ({
    ...p,
    category: Array.isArray(p.category) ? p.category[0] : p.category,
    subcategory: Array.isArray(p.subcategory) ? p.subcategory[0] : p.subcategory,
    seller: sellerMap.get(p.sellerId as string) ?? null,
  }));

  return adaptProducts(mapped as unknown as DBProduct[]);
}

export interface MobileProducts {
  trending: Product[];
  latest: Product[];
  loading: boolean;
}

export function useMobileProducts(): MobileProducts {
  const [trending, setTrending] = useState<Product[]>([]);
  const [latest, setLatest] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      fetchProductSet('views', 8),
      fetchProductSet('createdAt', 8),
    ])
      .then(([t, l]) => {
        if (!cancelled) {
          setTrending(t);
          setLatest(l);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { trending, latest, loading };
}
