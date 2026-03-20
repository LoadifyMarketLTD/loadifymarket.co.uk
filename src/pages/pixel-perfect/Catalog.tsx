import { useState, useMemo, useEffect, useCallback } from "react";
import { X } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BreadcrumbNav from "@/components/BreadcrumbNav";
import CatalogFilters from "@/components/catalog/CatalogFilters";
import CatalogHeader from "@/components/catalog/CatalogHeader";
import ProductCard from "@/components/catalog/ProductCard";
import { Badge } from "@/components/ui/badge";
import type { Product } from "@/components/catalog/ProductCard";
import { supabase } from "@/lib/supabase";
import { adaptProducts } from "@/lib/productAdapter";
import type { DBProduct } from "@/lib/productAdapter";

const PRODUCT_QUERY = `
  *,
  category:categories!categoryId(name, slug),
  subcategory:categories!subcategoryId(name, slug),
  seller:seller_profiles_public!left(
    businessName,
    isApproved,
    rating,
    userId
  )
`;

const Catalog = () => {
  const [searchParams] = useSearchParams();
  const queryParam = searchParams.get("q") || "";
  const categoryParam = searchParams.get("category") || "";

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
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
    supabase
      .from("categories")
      .select("name")
      .eq("isActive", true)
      .order("order", { ascending: true })
      .then(({ data }) => {
        if (data) {
          const names = data
            .map((c: { name: string }) => c.name)
            .filter((n: string) => n !== "Logistics Jobs"); // exclude internal-only
          setDbCategories(names);
        }
      });
  }, []);

  // ── Fetch products from Supabase ──────────────────────────────────────────
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
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

      // Server-side price filter
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

      const { data, error } = await query.limit(96);
      if (error) throw error;

      const mapped = (data || []).map((p: Record<string, unknown>) => ({
        ...p,
        category: Array.isArray(p.category) ? p.category[0] : p.category,
        subcategory: Array.isArray(p.subcategory) ? p.subcategory[0] : p.subcategory,
        seller: Array.isArray(p.seller) ? p.seller[0] : p.seller,
      }));

      setProducts(adaptProducts(mapped as unknown as DBProduct[]));
    } catch (err) {
      console.error("Error fetching catalog products:", err);
    } finally {
      setLoading(false);
    }
  }, [queryParam, priceRange, sortBy]);

  useEffect(() => {
    fetchProducts();
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
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-20 pb-16">
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
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Catalog;
