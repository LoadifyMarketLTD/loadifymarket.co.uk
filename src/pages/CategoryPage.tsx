import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Product, Category } from '../types';
import { Search, X, Filter, ArrowRight, ChevronRight } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import CATEGORY_CONFIG, { getCategoryConfig } from '../lib/category-config';
import type { CategoryChip } from '../lib/category-config';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PRODUCT_LIMIT = 48;

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const config = getCategoryConfig(slug ?? '');

  // ── Filter state ──────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [activeChip, setActiveChip] = useState<CategoryChip | null>(null);
  const [sortBy, setSortBy] = useState('createdAt_desc');
  const [priceMax, setPriceMax] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  // ── Category resolution (slug → UUID) ────────────────────────────────────
  const [categoryUUID, setCategoryUUID] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase
        .from('categories')
        .select('*')
        .is('parentId', null)
        .order('name', { ascending: true });
      setCategories(data || []);
    };
    fetchCategories();
  }, []);

  // Resolve the DB category slug → UUID once categories are loaded
  useEffect(() => {
    if (!config?.productFilter.categorySlug) {
      setCategoryUUID(null);
      return;
    }
    const dbSlug = config.productFilter.categorySlug;
    if (UUID_PATTERN.test(dbSlug)) {
      setCategoryUUID(dbSlug);
      return;
    }
    const match = categories.find((c) => c.slug === dbSlug);
    setCategoryUUID(match?.id ?? null);
  }, [config, categories]);

  // ── Reset filters when category changes ──────────────────────────────────
  useEffect(() => {
    setSearchQuery('');
    setActiveChip(null);
    setSortBy('createdAt_desc');
    setPriceMax('');
    setShowFilters(false);
  }, [slug]);

  // ── Products ──────────────────────────────────────────────────────────────
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = useCallback(async () => {
    if (!config) return;

    // For category-slug-based pages, wait until UUID is resolved or confirmed absent
    const needsUUID = !!config.productFilter.categorySlug;
    if (needsUUID && categoryUUID === null && categories.length > 0) {
      // UUID not resolved yet (categories still loading) — wait
      setProducts([]);
      return;
    }

    setLoading(true);
    try {
      let query = supabase
        .from('products')
        .select(`
          *,
          seller:seller_profiles_public!left(
            businessName,
            isApproved,
            rating,
            marketplaceRole,
            paymentBehaviour,
            userId
          ),
          store:seller_stores!left(
            storeSlug
          )
        `)
        .eq('isActive', true)
        .eq('isApproved', true);

      // ── Primary category filter (from config) ──────────────────────────
      if (config.productFilter.types) {
        query = query.in('type', config.productFilter.types);
      } else if (categoryUUID) {
        query = query.eq('categoryId', categoryUUID);
      } else if (needsUUID) {
        // Category not found in DB — return no results rather than all products
        setProducts([]);
        setLoading(false);
        return;
      }

      // ── Chip filter ───────────────────────────────────────────────────
      if (activeChip?.condition) {
        query = query.eq('condition', activeChip.condition);
      }
      if (activeChip?.searchTerm) {
        const terms = activeChip.searchTerm.split(' ').filter(Boolean);
        const clauses = terms.flatMap((t) => [
          `title.ilike.%${t}%`,
          `description.ilike.%${t}%`,
        ]);
        query = query.or(clauses.join(','));
      }

      // ── User search query ─────────────────────────────────────────────
      if (searchQuery.trim()) {
        query = query.or(
          `title.ilike.%${searchQuery.trim()}%,description.ilike.%${searchQuery.trim()}%`
        );
      }

      // ── Price filter ──────────────────────────────────────────────────
      const maxP = priceMax !== '' ? parseFloat(priceMax) : null;
      if (maxP !== null && isFinite(maxP) && maxP > 0) {
        query = query.lte('price', maxP);
      }

      // ── Sort ──────────────────────────────────────────────────────────
      const [sortField, sortDir] = sortBy.split('_');
      query = query.order(sortField || 'createdAt', { ascending: sortDir === 'asc' });

      const { data, error } = await query.limit(PRODUCT_LIMIT);
      if (error) throw error;

      const mapped = (data || []).map((p: Record<string, unknown>) => ({
        ...p,
        seller: Array.isArray(p.seller) ? p.seller[0] : p.seller,
        store: Array.isArray(p.store) ? p.store[0] : p.store,
      }));
      setProducts(mapped as unknown as Product[]);
    } catch (err) {
      console.error('CategoryPage: error fetching products:', err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [config, categoryUUID, categories, activeChip, searchQuery, priceMax, sortBy]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // ── Unknown slug → 404 redirect ──────────────────────────────────────────
  if (!config) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center gap-6 px-4">
        <h1 className="text-2xl font-bold text-gray-900">Category not found</h1>
        <p className="text-gray-500">The category you are looking for does not exist.</p>
        <Link to="/catalog" className="btn-primary">
          Browse all categories
        </Link>
      </div>
    );
  }

  const Icon = config.icon;
  const hasActiveFilters = !!activeChip || searchQuery || priceMax;

  const clearAllFilters = () => {
    setActiveChip(null);
    setSearchQuery('');
    setPriceMax('');
    setSortBy('createdAt_desc');
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      {/* ── Hero / Category header ─────────────────────────────────────────── */}
      <section className="bg-white border-b border-gray-200 py-10">
        <div className="container-cinematic">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-sm text-gray-400 mb-4" aria-label="Breadcrumb">
            <Link to="/catalog" className="hover:text-gray-600 transition-colors">All Categories</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-gray-600">{config.label}</span>
          </nav>

          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-premium-sm ${config.accentBg} flex-shrink-0`}>
              <Icon className={`w-8 h-8 ${config.iconColor}`} />
            </div>
            <div>
              <h1 className="heading-section text-gray-900">{config.title}</h1>
              <p className="text-gray-500 mt-1 max-w-xl">{config.subtitle}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Category-specific chips ────────────────────────────────────────── */}
      <div className="bg-[#F8F9FA] border-b border-gray-200 py-3">
        <div className="container-cinematic">
          <div className="flex flex-wrap gap-2">
            {config.chips.map((chip) => {
              const isActive =
                activeChip === null
                  ? chip === config.chips[0]
                  : activeChip.label === chip.label;
              return (
                <button
                  key={chip.label}
                  onClick={() => setActiveChip(chip === config.chips[0] ? null : chip)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                    isActive
                      ? 'bg-[#1E3A5F] text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <div className="container-cinematic py-8">
        {/* Controls row */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder={`Search ${config.label.toLowerCase()}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-search w-full pl-12 pr-10"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-white text-gray-900 border border-gray-200 rounded-premium-sm px-4 py-2 text-sm focus:outline-none focus:border-[#1E3A5F]"
          >
            <option value="createdAt_desc">Newest First</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="rating_desc">Top Rated</option>
          </select>

          {/* Filters toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-glass flex items-center gap-2 ${showFilters ? 'bg-[#1E3A5F]/10 border-[#1E3A5F]/30' : ''}`}
          >
            <Filter className="h-4 w-4" />
            Filters
          </button>

          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="btn-glass text-sm flex items-center gap-1 text-gray-600 hover:text-gray-900"
            >
              <X className="h-4 w-4" /> Clear
            </button>
          )}
        </div>

        {/* Expanded filters panel */}
        {showFilters && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 p-5 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-gray-500 text-sm mb-1.5">Max Price (£)</label>
              <input
                type="number"
                min="0"
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
                placeholder="No limit"
                className="input-field w-full py-2 px-3 text-sm"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={clearAllFilters}
                className="w-full btn-outline py-2 text-sm"
              >
                Reset All Filters
              </button>
            </div>
          </div>
        )}

        {/* Product count */}
        {!loading && products.length > 0 && (
          <p className="text-gray-400 text-sm mb-4">
            {products.length}{products.length === PRODUCT_LIMIT ? '+' : ''} products found
            {activeChip && activeChip !== config.chips[0] ? ` in "${activeChip.label}"` : ''}
          </p>
        )}

        {/* Grid / Loading / Empty */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-gray-100 rounded-lg aspect-[3/4] animate-pulse" />
            ))}
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl text-center py-16">
            <Icon className={`h-16 w-16 mx-auto mb-4 opacity-20 ${config.iconColor}`} />
            <h3 className="text-xl font-bold text-gray-900 mb-2">{config.emptyState.title}</h3>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">{config.emptyState.description}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
              {hasActiveFilters && (
                <button onClick={clearAllFilters} className="btn-primary">
                  Clear Filters
                </button>
              )}
              {activeChip && (
                <button
                  onClick={() => setActiveChip(null)}
                  className="btn-glass flex items-center gap-2 justify-center"
                >
                  View all {config.label}
                </button>
              )}
              <Link to="/catalog" className="btn-glass flex items-center gap-2 justify-center">
                Browse All Listings
                <ArrowRight className="h-4 w-4" />
              </Link>
              {CATEGORY_CONFIG.filter((c) => c.slug !== slug).slice(0, 2).map((c) => (
                <Link
                  key={c.slug}
                  to={`/category/${c.slug}`}
                  className="btn-glass flex items-center gap-2 justify-center"
                >
                  {c.label}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Cross-category browse bar */}
        <div className="mt-16">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Browse Other Categories</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {CATEGORY_CONFIG.filter((c) => c.slug !== slug).slice(0, 8).map((cat) => {
              const CatIcon = cat.icon;
              return (
                <Link
                  key={cat.slug}
                  to={`/category/${cat.slug}`}
                  className="group flex items-center gap-2.5 p-3 bg-white rounded-premium-sm
                             hover:bg-white/70 transition-all duration-200 border border-gray-100
                             hover:border-gold/30"
                >
                  <CatIcon className={`h-5 w-5 flex-shrink-0 ${cat.iconColor}`} />
                  <span className="text-sm text-gray-600 group-hover:text-[#1E3A5F] leading-tight line-clamp-1">
                    {cat.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
