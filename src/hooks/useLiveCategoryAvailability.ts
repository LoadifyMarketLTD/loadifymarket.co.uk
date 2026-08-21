import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface AvailabilitySnapshot {
  liveCategoryIds: string[];
  liveRootCategoryIds: string[];
}

interface CategoryRow {
  id: string;
  parentId: string | null;
}

let _cache: AvailabilitySnapshot | null = null;
let _pending: Promise<AvailabilitySnapshot> | null = null;

async function loadAvailability(): Promise<AvailabilitySnapshot> {
  if (_cache) return _cache;
  if (_pending) return _pending;

  _pending = (async () => {
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('categoryId')
      .eq('isActive', true)
      .eq('isApproved', true)
      .eq('listingStatus', 'active')
      .or('listingContext.eq.service,stockQuantity.gt.0')
      .not('categoryId', 'is', null)
      .order('createdAt', { ascending: false });

    if (productsError) throw productsError;

    const productCategoryIds = Array.from(
      new Set(
        (products ?? [])
          .map((row: { categoryId?: string | null }) => row.categoryId)
          .filter((id): id is string => Boolean(id)),
      ),
    );

    if (productCategoryIds.length === 0) {
      const empty = { liveCategoryIds: [], liveRootCategoryIds: [] };
      _cache = empty;
      return empty;
    }

    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('id, parentId')
      .eq('isActive', true);

    if (categoriesError) throw categoriesError;

    const byId = new Map<string, CategoryRow>();
    (categories ?? []).forEach((row: CategoryRow) => byId.set(row.id, row));

    const liveCategoryIds = new Set<string>();
    const liveRootCategoryIds = new Set<string>();

    for (const productCategoryId of productCategoryIds) {
      let currentId: string | null = productCategoryId;
      let rootId: string | null = null;
      const visited = new Set<string>();

      while (currentId && !visited.has(currentId)) {
        visited.add(currentId);
        liveCategoryIds.add(currentId);

        const current = byId.get(currentId);
        if (!current) {
          rootId = currentId;
          break;
        }

        if (!current.parentId) {
          rootId = current.id;
          break;
        }

        currentId = current.parentId;
      }

      if (rootId) liveRootCategoryIds.add(rootId);
    }

    const snapshot = {
      liveCategoryIds: Array.from(liveCategoryIds),
      liveRootCategoryIds: Array.from(liveRootCategoryIds),
    };

    _cache = snapshot;
    return snapshot;
  })().finally(() => {
    _pending = null;
  });

  return _pending;
}

export function useLiveCategoryAvailability() {
  const [snapshot, setSnapshot] = useState<AvailabilitySnapshot>(
    _cache ?? { liveCategoryIds: [], liveRootCategoryIds: [] },
  );
  const [loading, setLoading] = useState(_cache === null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (_cache) return;

    let cancelled = false;
    loadAvailability()
      .then((next) => {
        if (!cancelled) {
          setSnapshot(next);
          setFailed(false);
          setLoading(false);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.error('[useLiveCategoryAvailability] Failed to load live category availability:', error);
          setSnapshot({ liveCategoryIds: [], liveRootCategoryIds: [] });
          setFailed(true);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    ...snapshot,
    loading,
    failed,
  };
}
