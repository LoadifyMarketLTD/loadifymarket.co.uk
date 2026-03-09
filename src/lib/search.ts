/**
 * Search Utilities — Loadify Market
 *
 * Provides:
 *  - useSearch hook (debounced)
 *  - buildSearchQuery (Supabase)
 *  - getAutocompleteSuggestions
 *  - getRelatedSearches
 *  - spam/abuse-safe input sanitisation
 */

import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import type { Product, Category } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SearchFilters {
  query: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  condition?: string;
  listingType?: string;   // 'pallet' | 'retail' | 'handmade' | 'wholesale'
  sellerRating?: number;  // minimum rating
  location?: string;
  sortBy?: SearchSortOption;
}

export type SearchSortOption =
  | 'relevance'
  | 'price_asc'
  | 'price_desc'
  | 'newest'
  | 'top_rated';

export interface AutocompleteSuggestion {
  type: 'product' | 'category' | 'seller' | 'query';
  label: string;
  value: string;
  href: string;
}

export interface SearchResults {
  products: Product[];
  total: number;
  loading: boolean;
  error: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const RELATED_SEARCHES: Record<string, string[]> = {
  phone:       ['phone accessories', 'iphone', 'samsung phone', 'phone pallet'],
  laptop:      ['laptop accessories', 'gaming laptop', 'laptop pallet', 'refurbished laptop'],
  clothing:    ['mens clothing', 'womens clothing', 'clothing pallet', 'mixed lot clothing'],
  electronics: ['electronics pallet', 'mixed electronics', 'refurbished electronics', 'tech bundle'],
  tools:       ['power tools', 'hand tools', 'tools pallet', 'garden tools'],
  furniture:   ['flat pack furniture', 'office furniture', 'furniture lot', 'home furniture'],
  toys:        ['toys pallet', 'kids toys', 'educational toys', 'toy bundle'],
  pallet:      ['electronics pallet', 'clothing pallet', 'mixed pallet', 'amazon returns pallet'],
};

/** Returns related searches for a given query. */
export function getRelatedSearches(query: string): string[] {
  const q = query.toLowerCase().trim();
  // Direct match
  if (RELATED_SEARCHES[q]) return RELATED_SEARCHES[q];
  // Partial match
  for (const [key, suggestions] of Object.entries(RELATED_SEARCHES)) {
    if (q.includes(key) || key.includes(q)) return suggestions;
  }
  return [];
}

// ─── Input sanitisation ───────────────────────────────────────────────────────

/** Strips dangerous characters and limits length. Safe for Supabase text search. */
export function sanitiseSearchQuery(raw: string): string {
  return raw
    // Replace every '<' and '>' individually — prevents incomplete-tag bypass
    .replace(/</g, '')
    .replace(/>/g, '')
    .replace(/['"`;\\]/g, '')      // strip SQL/XSS characters
    .trim()
    .slice(0, 200);                 // limit length
}

// ─── Supabase query builder ───────────────────────────────────────────────────

/** Builds and executes a Supabase products search query. */
export async function searchProducts(
  filters: SearchFilters,
  page = 1,
  perPage = 24,
): Promise<{ data: Product[]; count: number; error: string | null }> {
  const safe = sanitiseSearchQuery(filters.query);

  let q = supabase
    .from('products')
    .select('*, seller:seller_profiles(rating, businessName, isApproved, paymentBehaviour)', { count: 'exact' })
    .eq('isActive', true)
    .eq('isApproved', true);

  // Full-text / ilike search across title + description
  if (safe) {
    q = q.or(`title.ilike.%${safe}%,description.ilike.%${safe}%`);
  }

  // Category filter
  if (filters.category) {
    q = q.eq('categoryId', filters.category);
  }

  // Price range
  if (filters.minPrice != null) q = q.gte('price', filters.minPrice);
  if (filters.maxPrice != null) q = q.lte('price', filters.maxPrice);

  // Condition
  if (filters.condition) q = q.eq('condition', filters.condition);

  // Listing type
  if (filters.listingType) q = q.eq('listingType', filters.listingType);

  // Sorting
  switch (filters.sortBy) {
    case 'price_asc':  q = q.order('price', { ascending: true });  break;
    case 'price_desc': q = q.order('price', { ascending: false }); break;
    case 'newest':     q = q.order('createdAt', { ascending: false }); break;
    case 'top_rated':  q = q.order('rating', { ascending: false }); break;
    default:           q = q.order('createdAt', { ascending: false }); // relevance falls back to recency
  }

  // Pagination
  const from = (page - 1) * perPage;
  q = q.range(from, from + perPage - 1);

  try {
    const { data, count, error } = await q;
    if (error) throw error;
    return { data: data ?? [], count: count ?? 0, error: null };
  } catch (e) {
    return { data: [], count: 0, error: e instanceof Error ? e.message : 'Search failed' };
  }
}

// ─── Autocomplete ─────────────────────────────────────────────────────────────

/** Returns up to `limit` autocomplete suggestions across products, categories, sellers. */
export async function getAutocompleteSuggestions(
  query: string,
  limit = 8,
): Promise<AutocompleteSuggestion[]> {
  const safe = sanitiseSearchQuery(query);
  if (!safe || safe.length < 2) return [];

  const suggestions: AutocompleteSuggestion[] = [];

  try {
    // Products
    const { data: products } = await supabase
      .from('products')
      .select('id, title, categoryId')
      .ilike('title', `%${safe}%`)
      .eq('isActive', true)
      .eq('isApproved', true)
      .limit(4);

    (products ?? []).forEach((p: { id: string; title: string }) => {
      suggestions.push({
        type: 'product',
        label: p.title,
        value: p.title,
        href: `/product/${p.id}`,
      });
    });

    // Categories
    const { data: cats } = await supabase
      .from('categories')
      .select('id, name, slug')
      .ilike('name', `%${safe}%`)
      .limit(3);

    (cats ?? []).forEach((c: { id: string; name: string; slug: string }) => {
      suggestions.push({
        type: 'category',
        label: `${c.name} — Browse category`,
        value: c.name,
        href: `/shop?category=${c.slug}`,
      });
    });

    // Sellers
    const { data: sellers } = await supabase
      .from('seller_profiles')
      .select('userId, businessName, storeName')
      .or(`businessName.ilike.%${safe}%,storeName.ilike.%${safe}%`)
      .eq('isApproved', true)
      .limit(2);

    (sellers ?? []).forEach((s: { userId: string; businessName?: string; storeName?: string }) => {
      const name = s.businessName || s.storeName || 'Seller';
      suggestions.push({
        type: 'seller',
        label: `${name} — Seller Store`,
        value: name,
        href: `/seller/${s.userId}`,
      });
    });
  } catch (e) {
    console.error('Autocomplete error:', e);
  }

  return suggestions.slice(0, limit);
}

// ─── useSearch hook ───────────────────────────────────────────────────────────

/** Debounced search hook. Returns results, loading state, and error. */
export function useSearch(filters: SearchFilters, page = 1, debounceMs = 300) {
  const [results, setResults] = useState<Product[]>([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  // Stable serialisation used only as a cache key — not passed as a dep directly
  const filtersKey = [
    filters.query,
    filters.category ?? '',
    filters.minPrice ?? '',
    filters.maxPrice ?? '',
    filters.condition ?? '',
    filters.listingType ?? '',
    filters.sortBy ?? '',
    page,
  ].join('|');

  useEffect(() => {
    if (!filters.query && !filters.category && !filters.listingType) {
      setResults([]); setTotal(0); return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      const { data, count, error: err } = await searchProducts(filters, page);
      if (!cancelled) {
        setResults(data);
        setTotal(count);
        setError(err);
        setLoading(false);
      }
    }, debounceMs);
    return () => { cancelled = true; clearTimeout(t); };
  }, [filtersKey, debounceMs]); // eslint-disable-line react-hooks/exhaustive-deps

  return { results, total, loading, error };
}

// ─── useAutocomplete hook ─────────────────────────────────────────────────────

/** Debounced autocomplete hook. Returns suggestions array. */
export function useAutocomplete(query: string, debounceMs = 200) {
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query || query.length < 2) { setSuggestions([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      const sug = await getAutocompleteSuggestions(query);
      setSuggestions(sug);
      setLoading(false);
    }, debounceMs);
    return () => clearTimeout(t);
  }, [query, debounceMs]);

  return { suggestions, loading };
}

// ─── Category helpers ─────────────────────────────────────────────────────────

export async function fetchCategories(): Promise<Category[]> {
  try {
    const { data } = await supabase.from('categories').select('*').order('name');
    return data ?? [];
  } catch {
    return [];
  }
}
