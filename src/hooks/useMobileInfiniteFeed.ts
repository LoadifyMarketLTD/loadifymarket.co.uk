/**
 * useMobileInfiniteFeed
 *
 * Paginated product feed for the mobile homepage infinite scroll.
 *   - PAGE_SIZE = 12 products per page
 *   - Ordered by createdAt DESC (newest first)
 *   - Page 0 loaded on mount; subsequent pages via loadMore()
 *   - Deduplicates products by id across pages
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { adaptProducts } from '@/lib/productAdapter';
import type { DBProduct } from '@/lib/productAdapter';
import type { Product } from '@/components/catalog/ProductCard';

const PAGE_SIZE = 12;

const PRODUCT_QUERY = `
  *,
  category:categories!categoryId(name, slug),
  subcategory:categories!subcategoryId(name, slug)
`;

async function fetchSellerMap(
  sellerIds: string[],
): Promise<Map<string, { businessName?: string; isApproved?: boolean; rating?: number; userId?: string }>> {
  const map = new Map<string, { businessName?: string; isApproved?: boolean; rating?: number; userId?: string }>();
  if (!sellerIds.length) return map;
  const { data } = await supabase
    .from('seller_profiles_public')
    .select('userId, businessName, isApproved, rating')
    .in('userId', sellerIds);
  (data ?? []).forEach(
    (row: { userId?: string; businessName?: string; isApproved?: boolean; rating?: number }) => {
      if (row.userId) map.set(row.userId, row);
    },
  );
  return map;
}

async function fetchPage(page: number): Promise<Product[]> {
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_QUERY)
    .eq('isActive', true)
    .eq('isApproved', true)
    .not('type', 'eq', 'logistics')
    .order('createdAt', { ascending: false })
    .range(from, to);

  if (error || !data?.length) return [];

  const rows = data as Record<string, unknown>[];
  const sellerIds = [
    ...new Set(rows.map((p) => p.sellerId as string).filter(Boolean)),
  ];
  const sellerMap = await fetchSellerMap(sellerIds);

  return adaptProducts(
    rows.map((p) => ({
      ...p,
      category: Array.isArray(p.category) ? p.category[0] : p.category,
      subcategory: Array.isArray(p.subcategory) ? p.subcategory[0] : p.subcategory,
      seller: sellerMap.get(p.sellerId as string) ?? null,
    })) as unknown as DBProduct[],
  );
}

export interface MobileInfiniteFeedState {
  products: Product[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  loadMore: () => void;
}

export function useMobileInfiniteFeed(): MobileInfiniteFeedState {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const pageRef = useRef(1); // page 0 fetched in useEffect
  const inFlightRef = useRef(false);

  // Initial load
  useEffect(() => {
    let cancelled = false;
    fetchPage(0)
      .then((prods) => {
        if (cancelled) return;
        setProducts(prods);
        setHasMore(prods.length === PAGE_SIZE);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadMore = useCallback(() => {
    if (inFlightRef.current || !hasMore) return;
    inFlightRef.current = true;
    setLoadingMore(true);
    const page = pageRef.current;
    fetchPage(page)
      .then((prods) => {
        setProducts((prev) => {
          const ids = new Set(prev.map((p) => p.id));
          return [...prev, ...prods.filter((p) => !ids.has(p.id))];
        });
        if (prods.length < PAGE_SIZE) setHasMore(false);
        pageRef.current = page + 1;
        setLoadingMore(false);
        inFlightRef.current = false;
      })
      .catch(() => {
        setLoadingMore(false);
        inFlightRef.current = false;
      });
  }, [hasMore]);

  return { products, loading, loadingMore, hasMore, loadMore };
}
