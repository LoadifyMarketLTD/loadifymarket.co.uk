/**
 * useMobileGrid — paginated product feed for the mobile home 2-column grid.
 * Fetches PAGE_SIZE products per page ordered by newest, deduped by id.
 * Exposes loadMore() for infinite scroll / load-more button.
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

interface SellerInfo {
  businessName?: string;
  isApproved?: boolean;
  rating?: number;
  userId?: string;
}

async function fetchSellerMap(sellerIds: string[]): Promise<Map<string, SellerInfo>> {
  const map = new Map<string, SellerInfo>();
  if (sellerIds.length === 0) return map;
  const { data } = await supabase
    .from('seller_profiles_public')
    .select('userId, businessName, isApproved, rating')
    .in('userId', sellerIds);
  (data ?? []).forEach((row: SellerInfo) => {
    if (row.userId) map.set(row.userId, row);
  });
  return map;
}

async function fetchPage(offset: number): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_QUERY)
    .eq('isActive', true)
    .eq('isApproved', true)
    .not('type', 'eq', 'logistics')
    .order('createdAt', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (error || !data || data.length === 0) return [];

  const rows = data as Record<string, unknown>[];
  const sellerIds = [...new Set(rows.map((p) => p.sellerId as string).filter(Boolean))];
  const sellerMap = await fetchSellerMap(sellerIds);

  const mapped = rows.map((p) => ({
    ...p,
    category: Array.isArray(p.category) ? p.category[0] : p.category,
    subcategory: Array.isArray(p.subcategory) ? p.subcategory[0] : p.subcategory,
    seller: sellerMap.get(p.sellerId as string) ?? null,
  }));

  return adaptProducts(mapped as unknown as DBProduct[]);
}

export interface MobileGrid {
  products: Product[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  loadMore: () => void;
}

export function useMobileGrid(): MobileGrid {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const offsetRef = useRef(0);
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    fetchPage(0).then((items) => {
      if (!cancelledRef.current) {
        setProducts(items);
        offsetRef.current = items.length;
        setHasMore(items.length === PAGE_SIZE);
        setLoading(false);
      }
    }).catch((err) => {
      console.error('[useMobileGrid] initial fetch failed:', err);
      if (!cancelledRef.current) setLoading(false);
    });
    return () => { cancelledRef.current = true; };
  }, []);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const currentOffset = offsetRef.current;
    fetchPage(currentOffset).then((items) => {
      if (!cancelledRef.current) {
        setProducts((prev) => {
          const ids = new Set(prev.map((p) => p.id));
          const deduped = items.filter((p) => !ids.has(p.id));
          return [...prev, ...deduped];
        });
        offsetRef.current = currentOffset + items.length;
        setHasMore(items.length === PAGE_SIZE);
        setLoadingMore(false);
      }
    }).catch((err) => {
      console.error('[useMobileGrid] loadMore failed:', err);
      if (!cancelledRef.current) setLoadingMore(false);
    });
  }, [loadingMore, hasMore]);

  return { products, loading, loadingMore, hasMore, loadMore };
}
