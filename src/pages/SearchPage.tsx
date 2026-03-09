import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, SlidersHorizontal, X, Package, ChevronDown, Tag, ArrowUpDown, Layers, ShoppingBag } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import { useSearch, getRelatedSearches, sanitiseSearchQuery, fetchCategories } from '../lib/search';
import { rankProducts } from '../lib/ranking';
import type { SearchFilters, SearchSortOption } from '../lib/search';
import type { Category } from '../types';

const CONDITIONS = ['new', 'used', 'refurbished'];
const LISTING_TYPES = [
  { key: 'retail',    label: 'Retail Product' },
  { key: 'pallet',    label: 'Pallet / Bulk' },
  { key: 'wholesale', label: 'Wholesale' },
  { key: 'handmade',  label: 'Handmade' },
];
const SORT_OPTIONS: { key: SearchSortOption; label: string }[] = [
  { key: 'relevance',  label: 'Best Match' },
  { key: 'newest',     label: 'Newest First' },
  { key: 'top_rated',  label: 'Top Rated' },
  { key: 'price_asc',  label: 'Price: Low → High' },
  { key: 'price_desc', label: 'Price: High → Low' },
];

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  // Build filters from URL
  const rawQuery = params.get('q') ?? '';
  const filters: SearchFilters = {
    query:       sanitiseSearchQuery(rawQuery),
    category:    params.get('category') ?? undefined,
    minPrice:    params.get('minPrice') ? Number(params.get('minPrice')) : undefined,
    maxPrice:    params.get('maxPrice') ? Number(params.get('maxPrice')) : undefined,
    condition:   params.get('condition') ?? undefined,
    listingType: params.get('listingType') ?? undefined,
    sortBy:      (params.get('sort') as SearchSortOption) ?? 'relevance',
  };

  const { results: rawResults, total, loading, error } = useSearch(filters);

  // Apply client-side ranking when sort = relevance
  const results = filters.sortBy === 'relevance'
    ? rankProducts(rawResults, filters.query)
    : rawResults;

  const related = getRelatedSearches(filters.query);

  useEffect(() => {
    fetchCategories().then(setCategories);
  }, []);

  const setFilter = useCallback((key: string, value: string | undefined) => {
    setParams(prev => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value); else next.delete(key);
      return next;
    }, { replace: true });
  }, [setParams]);

  const clearAll = () => {
    setParams(prev => {
      const q = prev.get('q');
      const next = new URLSearchParams();
      if (q) next.set('q', q);
      return next;
    }, { replace: true });
  };

  const hasActiveFilters = !!(filters.category || filters.minPrice != null || filters.maxPrice != null || filters.condition || filters.listingType);

  return (
    <div className="bg-jet min-h-screen pt-20">
      {/* Search bar */}
      <div className="bg-graphite/60 border-b border-white/10 py-4 sticky top-16 z-30">
        <div className="container-cinematic">
          <form
            onSubmit={e => { e.preventDefault(); const fd = new FormData(e.currentTarget); setFilter('q', (fd.get('q') as string) ?? ''); }}
            className="flex gap-3"
          >
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
              <input
                name="q"
                defaultValue={rawQuery}
                key={rawQuery}
                placeholder="Search products, pallets or sellers…"
                className="input-search w-full pl-12 pr-4"
                autoFocus={!rawQuery}
              />
            </div>
            <button type="submit" className="btn-primary px-6 hidden sm:flex items-center gap-2">
              <Search className="w-4 h-4" /> Search
            </button>
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`btn-glass flex items-center gap-2 ${hasActiveFilters ? 'border-gold/40 text-gold' : ''}`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline">Filters</span>
              {hasActiveFilters && <span className="bg-gold text-jet text-xs px-1.5 py-0.5 rounded-full font-bold">!</span>}
            </button>
          </form>
        </div>
      </div>

      <div className="container-cinematic py-8">
        <div className="flex gap-8">
          {/* ── Filters sidebar ── */}
          {showFilters && (
            <aside className="w-64 shrink-0 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-white">Filters</h2>
                {hasActiveFilters && (
                  <button onClick={clearAll} className="text-gold text-xs hover:underline flex items-center gap-1">
                    <X className="w-3 h-3" /> Clear all
                  </button>
                )}
              </div>

              {/* Category */}
              <div className="card-glass">
                <p className="text-xs font-bold text-white/50 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <Tag className="w-3.5 h-3.5" /> Category
                </p>
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  <button
                    onClick={() => setFilter('category', undefined)}
                    className={`w-full text-left text-sm px-2 py-1.5 rounded transition-colors ${!filters.category ? 'text-gold bg-gold/10' : 'text-white/60 hover:text-white'}`}
                  >
                    All Categories
                  </button>
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setFilter('category', cat.id)}
                      className={`w-full text-left text-sm px-2 py-1.5 rounded transition-colors ${filters.category === cat.id ? 'text-gold bg-gold/10' : 'text-white/60 hover:text-white'}`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price range */}
              <div className="card-glass">
                <p className="text-xs font-bold text-white/50 uppercase tracking-wide mb-3">Price Range (£)</p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    placeholder="Min"
                    value={filters.minPrice ?? ''}
                    onChange={e => setFilter('minPrice', e.target.value || undefined)}
                    className="input-field w-full py-2 text-sm"
                  />
                  <span className="text-white/30">–</span>
                  <input
                    type="number"
                    min={0}
                    placeholder="Max"
                    value={filters.maxPrice ?? ''}
                    onChange={e => setFilter('maxPrice', e.target.value || undefined)}
                    className="input-field w-full py-2 text-sm"
                  />
                </div>
              </div>

              {/* Condition */}
              <div className="card-glass">
                <p className="text-xs font-bold text-white/50 uppercase tracking-wide mb-3">Condition</p>
                <div className="space-y-1.5">
                  {CONDITIONS.map(c => (
                    <button
                      key={c}
                      onClick={() => setFilter('condition', filters.condition === c ? undefined : c)}
                      className={`w-full text-left text-sm px-2 py-1.5 rounded capitalize transition-colors ${filters.condition === c ? 'text-gold bg-gold/10' : 'text-white/60 hover:text-white'}`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Listing type */}
              <div className="card-glass">
                <p className="text-xs font-bold text-white/50 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5" /> Listing Type
                </p>
                <div className="space-y-1.5">
                  {LISTING_TYPES.map(lt => (
                    <button
                      key={lt.key}
                      onClick={() => setFilter('listingType', filters.listingType === lt.key ? undefined : lt.key)}
                      className={`w-full text-left text-sm px-2 py-1.5 rounded transition-colors ${filters.listingType === lt.key ? 'text-gold bg-gold/10' : 'text-white/60 hover:text-white'}`}
                    >
                      {lt.label}
                    </button>
                  ))}
                </div>
              </div>
            </aside>
          )}

          {/* ── Main results ── */}
          <div className="flex-1 min-w-0">
            {/* Results header */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <div>
                {rawQuery ? (
                  <h1 className="text-xl font-bold text-white">
                    Results for <span className="text-gold">"{rawQuery}"</span>
                  </h1>
                ) : (
                  <h1 className="text-xl font-bold text-white">Browse Products</h1>
                )}
                {!loading && (
                  <p className="text-white/40 text-sm mt-0.5">{total.toLocaleString()} result{total !== 1 ? 's' : ''}</p>
                )}
              </div>

              {/* Sort */}
              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 text-white/40" />
                <select
                  value={filters.sortBy}
                  onChange={e => setFilter('sort', e.target.value)}
                  className="input-field py-2 px-3 text-sm"
                >
                  {SORT_OPTIONS.map(s => (
                    <option key={s.key} value={s.key}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Active filter chips */}
            {hasActiveFilters && (
              <div className="flex flex-wrap gap-2 mb-4">
                {filters.category && (
                  <span className="flex items-center gap-1 bg-gold/10 border border-gold/20 text-gold text-xs px-3 py-1 rounded-full">
                    {categories.find(c => c.id === filters.category)?.name ?? filters.category}
                    <button onClick={() => setFilter('category', undefined)}><X className="w-3 h-3" /></button>
                  </span>
                )}
                {(filters.minPrice != null || filters.maxPrice != null) && (
                  <span className="flex items-center gap-1 bg-gold/10 border border-gold/20 text-gold text-xs px-3 py-1 rounded-full">
                    £{filters.minPrice ?? 0} – £{filters.maxPrice ?? '∞'}
                    <button onClick={() => { setFilter('minPrice', undefined); setFilter('maxPrice', undefined); }}><X className="w-3 h-3" /></button>
                  </span>
                )}
                {filters.condition && (
                  <span className="flex items-center gap-1 bg-gold/10 border border-gold/20 text-gold text-xs px-3 py-1 rounded-full capitalize">
                    {filters.condition}
                    <button onClick={() => setFilter('condition', undefined)}><X className="w-3 h-3" /></button>
                  </span>
                )}
                {filters.listingType && (
                  <span className="flex items-center gap-1 bg-gold/10 border border-gold/20 text-gold text-xs px-3 py-1 rounded-full">
                    {LISTING_TYPES.find(l => l.key === filters.listingType)?.label}
                    <button onClick={() => setFilter('listingType', undefined)}><X className="w-3 h-3" /></button>
                  </span>
                )}
              </div>
            )}

            {/* Loading state */}
            {loading && (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="card-glass animate-pulse h-64 rounded-2xl" />
                ))}
              </div>
            )}

            {/* Error state */}
            {!loading && error && (
              <div className="card-glass text-center py-12 border border-red-400/20">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Empty state */}
            {!loading && !error && results.length === 0 && (rawQuery || hasActiveFilters) && (
              <div className="card-glass text-center py-16">
                <Package className="w-16 h-16 text-white/10 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">No exact matches found</h3>
                <p className="text-white/50 mb-6 text-sm">
                  Try different keywords, remove some filters, or browse our categories.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  {hasActiveFilters && (
                    <button onClick={clearAll} className="btn-outline flex items-center gap-2 text-sm">
                      <X className="w-4 h-4" /> Clear Filters
                    </button>
                  )}
                  <Link to="/shop" className="btn-primary flex items-center gap-2 text-sm">
                    <ShoppingBag className="w-4 h-4" /> Browse All Products
                  </Link>
                </div>

                {/* Related searches */}
                {related.length > 0 && (
                  <div className="mt-8">
                    <p className="text-white/40 text-sm mb-3">Try searching for:</p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {related.map(s => (
                        <Link
                          key={s}
                          to={`/search?q=${encodeURIComponent(s)}`}
                          className="bg-graphite/60 hover:bg-graphite text-white/70 hover:text-gold text-sm px-4 py-2 rounded-full transition-colors border border-white/10 hover:border-gold/30"
                        >
                          {s}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Results grid */}
            {!loading && results.length > 0 && (
              <>
                <div className="product-grid">
                  {results.map(product => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>

                {/* Related searches */}
                {related.length > 0 && (
                  <div className="mt-10">
                    <p className="text-white/40 text-sm mb-3 flex items-center gap-2">
                      <ChevronDown className="w-4 h-4" /> Related searches
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {related.map(s => (
                        <Link
                          key={s}
                          to={`/search?q=${encodeURIComponent(s)}`}
                          className="bg-graphite/60 hover:bg-graphite text-white/70 hover:text-gold text-sm px-4 py-2 rounded-full transition-colors border border-white/10 hover:border-gold/30"
                        >
                          {s}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* No query yet */}
            {!loading && !error && results.length === 0 && !rawQuery && !hasActiveFilters && (
              <div className="text-center py-20">
                <Search className="w-16 h-16 text-white/10 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Search Loadify Market</h3>
                <p className="text-white/40">Enter keywords above to find products, bulk lots, and sellers.</p>
                <div className="flex flex-wrap gap-2 justify-center mt-8">
                  {['electronics', 'clothing pallet', 'tools', 'iphone', 'amazon returns'].map(s => (
                    <Link
                      key={s}
                      to={`/search?q=${encodeURIComponent(s)}`}
                      className="bg-graphite/60 hover:bg-graphite text-white/60 hover:text-gold text-sm px-4 py-2 rounded-full transition-colors border border-white/10"
                    >
                      <Search className="w-3 h-3 inline mr-1.5 opacity-50" />{s}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
