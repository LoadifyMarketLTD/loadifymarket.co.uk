import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface CategoryVisualNode {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  level: number;
  children: CategoryVisualNode[];
}

let cache: CategoryVisualNode[] | null = null;
let pending: Promise<CategoryVisualNode[]> | null = null;

async function loadTree(): Promise<CategoryVisualNode[]> {
  if (cache) return cache;
  if (pending) return pending;

  pending = (async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name, slug, parentId, level, order')
      .eq('isActive', true)
      .lte('level', 3)
      .order('level', { ascending: true })
      .order('order', { ascending: true });

    if (error || !data) {
      if (error) console.error('[useCategoryVisualTree] Failed to load category tree:', error);
      return [];
    }

    const rows = data as Array<{
      id: string;
      name: string;
      slug: string;
      parentId: string | null;
      level: number | null;
    }>;

    const nodes = new Map<string, CategoryVisualNode>();
    for (const row of rows) {
      nodes.set(row.id, {
        id: row.id,
        name: row.name,
        slug: row.slug,
        parentId: row.parentId,
        level: row.level ?? (row.parentId ? 2 : 1),
        children: [],
      });
    }

    const roots: CategoryVisualNode[] = [];
    for (const node of nodes.values()) {
      if (!node.parentId) {
        roots.push(node);
        continue;
      }
      nodes.get(node.parentId)?.children.push(node);
    }

    cache = roots;
    return roots;
  })().finally(() => {
    pending = null;
  });

  return pending;
}

export function useCategoryVisualTree() {
  const [categories, setCategories] = useState<CategoryVisualNode[]>(cache ?? []);
  const [loading, setLoading] = useState(cache === null);

  useEffect(() => {
    if (cache) return;
    let cancelled = false;

    loadTree()
      .then((tree) => {
        if (!cancelled) {
          setCategories(tree);
          setLoading(false);
        }
      })
      .catch((error) => {
        console.error('[useCategoryVisualTree] Unexpected category tree failure:', error);
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { categories, loading };
}
