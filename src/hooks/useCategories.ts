/**
 * useCategories — DB-driven category tree hook.
 *
 * Fetches the top two levels of the active categories table from Supabase and
 * returns them as a typed tree.  Results are module-level cached after the
 * first successful fetch so subsequent component mounts do not issue
 * additional network requests.
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  children: CategoryNode[];
}

// Module-level cache — populated once per page load.
let _cache: CategoryNode[] | null = null;
let _pending: Promise<CategoryNode[]> | null = null;

async function loadCategories(): Promise<CategoryNode[]> {
  if (_cache) return _cache;
  if (_pending) return _pending;

  _pending = (async () => {
    const { data: roots, error: rootErr } = await supabase
      .from('categories')
      .select('id, name, slug')
      .eq('isActive', true)
      .is('parentId', null)
      .order('order', { ascending: true });

    if (rootErr || !roots || roots.length === 0) return [];

    const rootIds = (roots as { id: string }[]).map((r) => r.id);

    const { data: children } = await supabase
      .from('categories')
      .select('id, name, slug, parentId')
      .eq('isActive', true)
      .in('parentId', rootIds)
      .order('order', { ascending: true });

    const byParent = new Map<string, CategoryNode[]>();
    (children ?? []).forEach(
      (c: { id: string; name: string; slug: string; parentId: string }) => {
        if (!byParent.has(c.parentId)) byParent.set(c.parentId, []);
        byParent
          .get(c.parentId)!
          .push({ id: c.id, name: c.name, slug: c.slug, children: [] });
      },
    );

    const tree: CategoryNode[] = (
      roots as { id: string; name: string; slug: string }[]
    ).map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      children: byParent.get(r.id) ?? [],
    }));

    _cache = tree;
    return tree;
  })().finally(() => {
    _pending = null;
  });

  return _pending;
}

export function useCategories() {
  const [categories, setCategories] = useState<CategoryNode[]>(_cache ?? []);
  const [loading, setLoading] = useState(_cache === null);

  useEffect(() => {
    if (_cache) {
      setCategories(_cache);
      setLoading(false);
      return;
    }

    let cancelled = false;
    loadCategories()
      .then((cats) => {
        if (!cancelled) {
          setCategories(cats);
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

  return { categories, loading };
}
