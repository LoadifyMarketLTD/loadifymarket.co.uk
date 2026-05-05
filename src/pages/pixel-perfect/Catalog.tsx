import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { X, ChevronDown } from "lucide-react";
import { useSearchParams } from "react-router-dom";
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

// Number of products fetched per page
const PAGE_SIZE = 24;

const Catalog = () => {
  const [searchParams] = useSearchParams();
  const queryParam = searchParams.get("q") || "";
  const categoryParam = searchParams.get("category") || "";
  const filterParam = searchParams.get("filter") || "";

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const pageRef = useRef(0);
  const [dbCategories, setDbCategories] = useState<string[]>([]);

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [sortBy, setSortBy] = useState("newest");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filtersVisible, setFiltersVisible] = useState(false);

  // Sync category param from URL into filter state on mount / param change
  useEffect(() => {
    if (categoryParam) {
      setSelectedCategories((prev) =>
        prev.includes(categoryParam) ? prev : [categoryParam]
      );
    }
  }, [categoryParam]);

  // ── Fetch real category names from Supabase (once on mount) ───────────────
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from("categories")
          .select("name")
          .eq("isActive", true)
          .is("parentId", null)
          .order("order", { ascending: true });
        if (data) {
          const names = data.map((c: { name: string }) => c.name);
          setDbCategories(names);
        }
      } catch (err) {
        console.error("categories fetch failed:", err);
        toast({ title: "Could not load categories", description: "Category filters may be unavailable.", variant: "destructive" });
      }
    })();
  }, []);

  // ── Fetch products from Supabase ──────────────────────────────────────────
  const fetchProducts = useCallback(async (page = 0) => {
    if (page === 0) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    try {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      // Step 1: Fetch products with category joins only
      let query = supabase
        .from("products")
        .select(PRODUCT_QUERY)
        .eq("isActive", true)
        .eq("isApproved", true)
        .not("type", "eq", "logistics");

      // Server-side text search
      if (queryParam.trim()) {
        const q = queryParam.trim();
        query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
      }

      // Quick-action filter from ?filter= param
      switch (filterParam) {
        case "price-crunch":
          // Cheapest first
          query = query.order("price", { ascending: true });
          break;
        case "back-in-stock":
          // Most recently updated
          query = query.order("updatedAt", { ascending: false });
          break;
        case "best-sellers":
          query = query.order("views", { ascending: false });
          break;
        case "latest":
          query = query.order("createdAt", { ascending: false });
          break;
        case "pallet-deals":
          query = query.eq("type", "pallet");
          break;
        case "multi-buy":
          query = query.eq("type", "bulk");
          break;
        case "brand":
          // Brand view — just show all, client can filter by seller name
          query = query.order("createdAt", { ascending: false });
          break;
        default:
          // Server-side price filter (only when no special filter)
          if (priceRange[0] > 0) query = query.gte("price", priceRange[0]);
          if (priceRange[1] < 10000) query = query.lte("price", priceRange[1]);

          // Server-side sort
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
          break;
      }

      const { data, error } = await query.range(from, to);
      if (error) throw error;

      // Step 2: Collect unique sellerIds
      const rows = data || [];
      const sellerIds = [...new Set(rows.map((p: Record<string, unknown>) => p.sellerId as string).filter(Boolean))];

      // Step 3: Fetch seller_profiles by userId
      const sellerMap = await fetchSellerMap(sellerIds);

      // Step 4: Merge seller data and normalise category arrays
      const mapped = rows.map((p: Record<string, unknown>) => ({
        ...p,
        category: Array.isArray(p.category) ? p.category[0] : p.category,
        subcategory: Array.isArray(p.subcategory) ? p.subcategory[0] : p.subcategory,
        seller: sellerMap.get(p.sellerId as string) ?? null,
      }));

      // Step 5: Adapt to UI shape
      const newProducts = adaptProducts(mapped as unknown as DBProduct[]);
      setProducts((prev) => page === 0 ? newProducts : [...prev, ...newProducts]);
      setHasMore(rows.length === PAGE_SIZE);
      pageRef.current = page;
    } catch (err) {
      console.error("Error fetching catalog products:", err);
      toast({ title: "Could not load products", description: "Please try refreshing the page.", variant: "destructive" });
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [queryParam, priceRange, sortBy, filterParam]);

  useEffect(() => {
    pageRef.current = 0;
    fetchProducts(0);
  }, [fetchProducts]);

  const clearAll = () => {
    setSelectedCategories([]);
    setSelectedConditions([]);
    setSelectedLocations([]);
    setPriceRange([0, 10000]);
  };

  // Client-side filtering on category name, condition display label, location
  const filteredProducts = useMemo(() => {
    let list = [...products];

    if (selectedCategories.length > 0) {
      list = list.filter((p) => selectedCategories.includes(p.category));
    }
    if (selectedConditions.length > 0) {
      list = list.filter((p) => selectedConditions.includes(p.condition));
    }
    if (selectedLocations.length > 0) {
      list = list.filter((p) => selectedLocations.includes(p.location));
    }

    return list;
  }, [products, selectedCategories, selectedConditions, selectedLocations]);

  const activeFilters = [
    ...(queryParam.trim() ? [`"${queryParam}"`] : []),
    ...selectedCategories,
    ...selectedConditions,
    ...selectedLocations,
    ...(priceRange[0] > 0 || priceRange[1] < 10000
      ? [`£${priceRange[0].toLocaleString()} – £${priceRange[1].toLocaleString()}`]
      : []),
  ];

  const removeFilter = (filter: string) => {
    if (filter.startsWith('"') && filter.endsWith('"')) {
      // Can't remove query param via state — user can clear search bar
      return;
    }
    if (selectedCategories.includes(filter)) {
      setSelectedCategories(selectedCategories.filter((c) => c !== filter));
    } else if (selectedConditions.includes(filter)) {
      setSelectedConditions(selectedConditions.filter((c) => c !== filter));
    } else if (selectedLocations.includes(filter)) {
      setSelectedLocations(selectedLocations.filter((c) => c !== filter));
    } else {
      setPriceRange([0, 10000]);
    }
  };

  return (
    <MainLayout>
      <SEO
        title="Browse Products | Loadify Market"
        description="Browse products across all categories from UK sellers. Filter by category, price, and condition on Loadify Market."
        canonical="/catalog"
      />

      <main id="main-content" className="pt-4 md:pt-28 pb-16">
        <div className="container mx-auto px-4">
          <BreadcrumbNav
            items={[
              { label: "Home", to: "/" },
              { label: "Catalog" },
            ]}
            showBack={true}
            backLabel="Back"
            backTo="/"
          />
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
            {queryParam.trim() && (
              <p className="text-sm text-muted-foreground mt-2">
                Showing results for: <span className="font-medium text-foreground">"{queryParam}"</span>
              </p>
            )}
            {filterParam && !queryParam.trim() && (
              <p className="text-sm text-muted-foreground mt-2">
                Showing:{" "}
                <span className="font-medium text-foreground capitalize">
                  {filterParam.replace(/-/g, " ")}
                </span>
              </p>
            )}
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
                <CatalogFilters
                  selectedCategories={selectedCategories}
                  setSelectedCategories={setSelectedCategories}
                  selectedConditions={selectedConditions}
                  setSelectedConditions={setSelectedConditions}
                  selectedLocations={selectedLocations}
                  setSelectedLocations={setSelectedLocations}
                  priceRange={priceRange}
                  setPriceRange={setPriceRange}
                  onClearAll={clearAll}
                  availableCategories={dbCategories}
                />
              </div>
            </aside>

            {/* Mobile filters — bottom sheet */}
            {filtersVisible && (
              <div className="fixed inset-0 z-50 lg:hidden">
                <div className="absolute inset-0 bg-black/50" onClick={() => setFiltersVisible(false)} />
                <div className="absolute bottom-0 inset-x-0 max-h-[85vh] rounded-t-2xl bg-card p-6 overflow-y-auto animate-in slide-in-from-bottom duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-display text-lg font-bold text-foreground">Filters</h3>
                    <button onClick={() => setFiltersVisible(false)} className="text-muted-foreground hover:text-foreground p-1">
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <CatalogFilters
                    selectedCategories={selectedCategories}
                    setSelectedCategories={setSelectedCategories}
                    selectedConditions={selectedConditions}
                    setSelectedConditions={setSelectedConditions}
                    selectedLocations={selectedLocations}
                    setSelectedLocations={setSelectedLocations}
                    priceRange={priceRange}
                    setPriceRange={setPriceRange}
                    onClearAll={clearAll}
                    availableCategories={dbCategories}
                  />
                  {/* Apply button to close the sheet */}
                  <div className="mt-6 pb-2">
                    <Button className="w-full h-11 bg-gradient-hero text-primary-foreground font-semibold" onClick={() => setFiltersVisible(false)}>
                      Apply Filters
                    </Button>
                  </div>
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
                  <p className="text-lg font-display font-semibold text-foreground mb-2">No listings found</p>
                  <p className="text-sm text-muted-foreground">Try adjusting your filters to see more results.</p>
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
                    <ProductCard key={product.id} product={product} linkState={{ flow: "marketplace" }} />
                  ))}
                </div>
              )}
              {!loading && hasMore && (
                <div className="flex justify-center mt-8">
                  <Button
                    variant="outline"
                    className="gap-2 px-8"
                    onClick={() => fetchProducts(pageRef.current + 1)}
                    disabled={loadingMore}
                  >
                    {loadingMore ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                        Loading…
                      </span>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4" />
                        Load More
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

    </MainLayout>
  );
};

export default Catalog;
