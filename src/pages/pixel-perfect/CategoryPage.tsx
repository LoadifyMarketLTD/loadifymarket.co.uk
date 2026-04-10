import { useState, useMemo, useEffect, useCallback } from "react";
import { X } from "lucide-react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import BreadcrumbNav from "@/components/BreadcrumbNav";
import CatalogFilters from "@/components/catalog/CatalogFilters";
import CatalogHeader from "@/components/catalog/CatalogHeader";
import ProductCard from "@/components/catalog/ProductCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import type { Product } from "@/components/catalog/ProductCard";
import { supabase } from "@/lib/supabase";
import { adaptProducts } from "@/lib/productAdapter";
import type { DBProduct } from "@/lib/productAdapter";
import CATEGORY_CONFIG from "@/lib/category-config";
import MainLayout from "@/layouts/MainLayout";
import SEO from "@/components/SEO";

// Product select — category joins only; seller data fetched separately
const PRODUCT_QUERY = `
  *,
  category:categories!categoryId(name, slug),
  subcategory:categories!subcategoryId(name, slug)
`;

/** Fetch seller info for a list of seller IDs from seller_profiles_public */
async function fetchSellerMap(
  sellerIds: string[],
): Promise<Map<string, { businessName?: string; isApproved?: boolean; rating?: number; userId?: string }>> {
  const map = new Map<string, { businessName?: string; isApproved?: boolean; rating?: number; userId?: string }>();
  if (sellerIds.length === 0) return map;
  const { data } = await supabase
    .from("seller_profiles_public")
    .select("userId, businessName, isApproved, rating")
    .in("userId", sellerIds);
  (data ?? []).forEach((row: { userId?: string; businessName?: string; isApproved?: boolean; rating?: number }) => {
    if (row.userId) map.set(row.userId, row);
  });
  return map;
}

const CategoryPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const subParam = searchParams.get("sub");

  const config = CATEGORY_CONFIG.find((c) => c.slug === slug);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryId, setCategoryId] = useState<string | null>(null);

  // Pre-select chip based on ?sub= query param
  const initialChip = useMemo(() => {
    if (!config || !subParam) return 0;
    const idx = config.chips.findIndex((chip) => chip.subSlug === subParam);
    return idx >= 0 ? idx : 0;
  }, [config, subParam]);

  const [activeChip, setActiveChip] = useState<number>(initialChip);
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [sortBy, setSortBy] = useState("newest");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filtersVisible, setFiltersVisible] = useState(false);

  // Sync chip if sub param changes (e.g. back/forward navigation)
  useEffect(() => {
    setActiveChip(initialChip);
  }, [initialChip]);

  // ── Resolve category slug → UUID once on mount ────────────────────────────
  useEffect(() => {
    if (!config) return;
    const filter = config.productFilter;
    if (filter.categorySlug) {
      (async () => {
        try {
          const { data } = await supabase
            .from("categories")
            .select("id")
            .eq("slug", filter.categorySlug)
            .single();
          if (data) setCategoryId(data.id as string);
        } catch (err) {
          console.error("category id lookup failed:", err);
          toast({ title: "Could not load category", description: "Please try refreshing the page.", variant: "destructive" });
        }
      })();
    }
  }, [config]);

  // ── Fetch products from Supabase ──────────────────────────────────────────
  const fetchProducts = useCallback(async () => {
    if (!config) return;
    setLoading(true);

    const filter = config.productFilter;
    const chip = config.chips[activeChip];

    try {
      let query = supabase
        .from("products")
        .select(PRODUCT_QUERY)
        .eq("isActive", true)
        .eq("isApproved", true);

      if (filter.types) {
        // Filter by product type (e.g. lot, clearance, pallet)
        query = query.in("type", filter.types);
      } else if (filter.categorySlug && categoryId) {
        // Filter by category UUID
        query = query.eq("categoryId", categoryId);
      }

      // Chip: search term (terms are hardcoded config values, sanitize for safe PostgREST interpolation)
      if (chip?.searchTerm) {
        // Strip characters that have special meaning in PostgREST filter syntax
        const sanitize = (s: string) => s.replace(/[%,.()"'\\]/g, "");
        const terms = chip.searchTerm.trim().split(/\s+/).map(sanitize).filter(Boolean);
        if (terms.length > 0) {
          const orClause = terms
            .map((t) => `title.ilike.%${t}%,description.ilike.%${t}%`)
            .join(",");
          query = query.or(orClause);
        }
      }

      // Chip: condition override
      if (chip?.condition) {
        query = query.eq("condition", chip.condition);
      }

      // User-selected condition filter
      if (selectedConditions.length > 0) {
        query = query.in("condition", selectedConditions);
      }

      // Price range
      if (priceRange[0] > 0) query = query.gte("price", priceRange[0]);
      if (priceRange[1] < 10000) query = query.lte("price", priceRange[1]);

      // Sort
      switch (sortBy) {
        case "price-low":
          query = query.order("price", { ascending: true });
          break;
        case "price-high":
          query = query.order("price", { ascending: false });
          break;
        case "popular":
          query = query.order("views", { ascending: false });
          break;
        case "rating":
          query = query.order("rating", { ascending: false });
          break;
        default:
          query = query.order("createdAt", { ascending: false });
          break;
      }

      const { data, error } = await query.limit(96);
      if (error) throw error;

      const rows = data || [];
      const sellerIds = [...new Set(rows.map((p: Record<string, unknown>) => p.sellerId as string).filter(Boolean))];
      const sellerMap = await fetchSellerMap(sellerIds);

      const mapped = rows.map((p: Record<string, unknown>) => ({
        ...p,
        category: Array.isArray(p.category) ? p.category[0] : p.category,
        subcategory: Array.isArray(p.subcategory) ? p.subcategory[0] : p.subcategory,
        seller: sellerMap.get(p.sellerId as string) ?? null,
      }));

      setProducts(adaptProducts(mapped as unknown as DBProduct[]));
    } catch (err) {
      console.error("Error fetching category products:", err);
      toast({ title: "Could not load products", description: "Please try refreshing the page.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [config, activeChip, categoryId, selectedConditions, priceRange, sortBy]);

  // Fetch when categoryId resolves (for slug-based filters) or dependencies change
  useEffect(() => {
    if (!config) return;
    const filter = config.productFilter;
    // For type-based categories, fetch immediately; for slug-based, wait for categoryId
    if (filter.types || categoryId) {
      fetchProducts();
    }
  }, [fetchProducts, config, categoryId]);

  const clearAll = () => {
    setSelectedConditions([]);
    setSelectedLocations([]);
    setPriceRange([0, 10000]);
  };

  // Client-side location filter
  const filteredProducts = useMemo(() => {
    if (selectedLocations.length === 0) return products;
    return products.filter((p) => selectedLocations.includes(p.location));
  }, [products, selectedLocations]);

  const activeFilters = [
    ...selectedConditions,
    ...selectedLocations,
    ...(priceRange[0] > 0 || priceRange[1] < 10000
      ? [`£${priceRange[0].toLocaleString()} – £${priceRange[1].toLocaleString()}`]
      : []),
  ];

  const removeFilter = (filter: string) => {
    if (selectedConditions.includes(filter)) {
      setSelectedConditions(selectedConditions.filter((c) => c !== filter));
    } else if (selectedLocations.includes(filter)) {
      setSelectedLocations(selectedLocations.filter((c) => c !== filter));
    } else {
      setPriceRange([0, 10000]);
    }
  };

  // ── 404 state for unknown slugs ───────────────────────────────────────────
  if (!config) {
    return (
      <MainLayout>
        <SEO
          title="Category Not Found | Loadify Market"
          description="The category you're looking for doesn't exist. Browse all categories on Loadify Market."
        />
        <main className="pt-28 pb-16">
          <div className="container mx-auto px-4 py-20 text-center">
            <p className="text-2xl font-display font-bold text-foreground mb-4">Category Not Found</p>
            <p className="text-muted-foreground mb-8">The category you're looking for doesn't exist.</p>
            <Button asChild>
              <Link to="/catalog">Browse All Listings</Link>
            </Button>
          </div>
        </main>
      </MainLayout>
    );
  }

  const Icon = config.icon;

  return (
    <MainLayout>
      <SEO
        title={`${config.label} | Loadify Market`}
        description={config.subtitle || `Browse ${config.label} products from verified UK sellers on Loadify Market.`}
        canonical={`/category/${slug}`}
      />

      <main className="pt-28 pb-16">
        <div className="container mx-auto px-4">
          <BreadcrumbNav
            items={[
              { label: "Home", to: "/" },
              { label: "Catalog", to: "/catalog" },
              { label: config.label },
            ]}
            showBack={true}
            backLabel="Back"
            backTo="/catalog"
          />

          {/* Category hero */}
          <div className="py-6 flex items-center gap-4">
            <div className={`${config.accentBg} rounded-xl p-3 shrink-0`}>
              <Icon className={`h-8 w-8 ${config.iconColor}`} />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold text-foreground">{config.title}</h1>
              <p className="text-sm text-muted-foreground mt-0.5">{config.subtitle}</p>
            </div>
          </div>

          {/* Subcategory pills */}
          {config.subcategories.length > 0 && (
            <div className="flex flex-wrap gap-2 pb-4">
              {config.subcategories.map((sub) => (
                <Link
                  key={sub}
                  to={`/category/${config.slug}?sub=${encodeURIComponent(sub.toLowerCase().replace(/\s+/g, "-"))}`}
                  className="px-3 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary border border-border transition-colors"
                >
                  {sub}
                </Link>
              ))}
            </div>
          )}

          {/* Chip filters */}
          {config.chips.length > 1 && (
            <div className="flex flex-wrap gap-2 pb-6">
              {config.chips.map((chip, i) => (
                <button
                  key={chip.label}
                  onClick={() => setActiveChip(i)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    activeChip === i
                      ? "bg-foreground text-background border-foreground"
                      : "bg-background text-muted-foreground border-border hover:border-foreground hover:text-foreground"
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          )}

          <div className="pb-4">
            <CatalogHeader
              totalResults={filteredProducts.length}
              sortBy={sortBy}
              setSortBy={setSortBy}
              viewMode={viewMode}
              setViewMode={setViewMode}
              onToggleFilters={() => setFiltersVisible(!filtersVisible)}
              filtersVisible={filtersVisible}
            />
          </div>

          {/* Active filter tags */}
          {activeFilters.length > 0 && (
            <div className="flex flex-wrap gap-2 pb-4">
              {activeFilters.map((filter) => (
                <Badge
                  key={filter}
                  variant="secondary"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs cursor-pointer hover:bg-destructive/10 transition-colors"
                  onClick={() => removeFilter(filter)}
                >
                  {filter}
                  <X className="h-3 w-3" />
                </Badge>
              ))}
            </div>
          )}

          <div className="flex gap-8">
            {/* Sidebar filters - desktop */}
            <aside className="hidden lg:block w-64 shrink-0">
              <div className="sticky top-24 bg-card rounded-xl border border-border p-5">
                {/* Category filter is intentionally omitted: this page already scopes products
                    to a single category via the slug. Showing a category picker here would
                    be redundant. The empty props satisfy the CatalogFilters interface. */}
                <CatalogFilters
                  selectedCategories={[]}
                  setSelectedCategories={() => {}}
                  selectedConditions={selectedConditions}
                  setSelectedConditions={setSelectedConditions}
                  selectedLocations={selectedLocations}
                  setSelectedLocations={setSelectedLocations}
                  priceRange={priceRange}
                  setPriceRange={setPriceRange}
                  onClearAll={clearAll}
                  availableCategories={[]}
                />
              </div>
            </aside>

            {/* Mobile filters overlay */}
            {filtersVisible && (
              <div className="fixed inset-0 z-50 lg:hidden">
                <div className="absolute inset-0 bg-foreground/50" onClick={() => setFiltersVisible(false)} />
                <div className="absolute left-0 top-0 bottom-0 w-80 max-w-[85vw] bg-card p-6 overflow-y-auto animate-fade-in">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-display text-lg font-bold text-foreground">Filters</h3>
                    <button onClick={() => setFiltersVisible(false)} className="text-muted-foreground hover:text-foreground">
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  {/* Category filter omitted — already scoped by page slug */}
                  <CatalogFilters
                    selectedCategories={[]}
                    setSelectedCategories={() => {}}
                    selectedConditions={selectedConditions}
                    setSelectedConditions={setSelectedConditions}
                    selectedLocations={selectedLocations}
                    setSelectedLocations={setSelectedLocations}
                    priceRange={priceRange}
                    setPriceRange={setPriceRange}
                    onClearAll={clearAll}
                    availableCategories={[]}
                  />
                </div>
              </div>
            )}

            {/* Product grid */}
            <div className="flex-1 min-w-0">
              {loading ? (
                <div
                  className={
                    viewMode === "grid"
                      ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5"
                      : "flex flex-col gap-4"
                  }
                >
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div
                      key={i}
                      className="bg-card rounded-xl border border-border aspect-[4/5] animate-pulse"
                    />
                  ))}
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-lg font-display font-semibold text-foreground mb-2">
                    {config.emptyState.title}
                  </p>
                  <p className="text-sm text-muted-foreground mb-6">
                    {config.emptyState.description}
                  </p>
                  <Button asChild variant="outline">
                    <Link to="/catalog">Browse All Listings</Link>
                  </Button>
                </div>
              ) : (
                <div
                  className={
                    viewMode === "grid"
                      ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5"
                      : "flex flex-col gap-4"
                  }
                >
                  {filteredProducts.map((product) => (
                    <ProductCard key={product.id} product={product} linkState={{ flow: "marketplace", categorySlug: slug, categoryLabel: config?.label }} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

    </MainLayout>
  );
};

export default CategoryPage;
