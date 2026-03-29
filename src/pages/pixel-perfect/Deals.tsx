import { useState, useMemo, useEffect, useCallback } from "react";
import { X, Package, Tag, RotateCcw, Layers, TrendingDown, ArrowRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import BreadcrumbNav from "@/components/BreadcrumbNav";
import Footer from "@/components/Footer";
import CountdownBanner from "@/components/CountdownBanner";
import CatalogFilters from "@/components/catalog/CatalogFilters";
import CatalogHeader from "@/components/catalog/CatalogHeader";
import ProductCard from "@/components/catalog/ProductCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import type { Product } from "@/components/catalog/ProductCard";
import { supabase } from "@/lib/supabase";
import { adaptProducts } from "@/lib/productAdapter";
import type { DBProduct } from "@/lib/productAdapter";
const heroWarehouse = "/images/categories/clearance.jpg";

// Deal types shown on this page (maps to DB product `type` column)
const DEALS_TYPES = ["lot", "clearance", "pallet", "wholesale"];

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

const dealSubSections = [
  {
    icon: Package,
    label: "Multi-Item Listings",
    description: "Sellers listing multiple items or product bundles — browse and buy directly from them.",
    types: ["lot"],
  },
  {
    icon: RotateCcw,
    label: "Special Offers",
    description: "Sellers offering products at reduced prices and end-of-line deals.",
    types: ["clearance", "lot"],
  },
  {
    icon: Layers,
    label: "Overstock & End-of-Line",
    description: "Excess inventory and discontinued lines listed by sellers across the UK.",
    types: ["wholesale"],
  },
  {
    icon: TrendingDown,
    label: "Flash Deals",
    description: "Time-limited offers from sellers looking to move products fast.",
    types: ["clearance"],
  },
];

const Deals = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [sortBy, setSortBy] = useState("newest");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filtersVisible, setFiltersVisible] = useState(false);
  // Active deal subsection filter (by type array)
  const [activeSubTypes, setActiveSubTypes] = useState<string[] | null>(null);

  // ── Fetch deal products from Supabase ──────────────────────────────────────
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      // If a subsection is active, filter to its types only; otherwise show all deal types
      const typesToFetch = activeSubTypes && activeSubTypes.length > 0 ? activeSubTypes : DEALS_TYPES;

      // Step 1: Fetch products with category joins only
      let query = supabase
        .from("products")
        .select(PRODUCT_QUERY)
        .eq("isActive", true)
        .eq("isApproved", true)
        .in("type", typesToFetch);

      if (priceRange[0] > 0) query = query.gte("price", priceRange[0]);
      if (priceRange[1] < 10000) query = query.lte("price", priceRange[1]);

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
      setProducts(adaptProducts(mapped as unknown as DBProduct[]));
    } catch (err) {
      console.error("Error fetching deals:", err);
    } finally {
      setLoading(false);
    }
  }, [priceRange, sortBy, activeSubTypes]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const clearAll = () => {
    setSelectedCategories([]);
    setSelectedConditions([]);
    setSelectedLocations([]);
    setPriceRange([0, 10000]);
    setActiveSubTypes(null);
  };

  // Client-side filtering on category name, condition, location (subsection filtering is server-side)
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
    ...selectedCategories,
    ...selectedConditions,
    ...selectedLocations,
    ...(priceRange[0] > 0 || priceRange[1] < 10000
      ? [`£${priceRange[0].toLocaleString()} – £${priceRange[1].toLocaleString()}`]
      : []),
  ];

  const removeFilter = (filter: string) => {
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
        {/* Hero section */}
        <div className="relative border-b border-border overflow-hidden">
          <div className="absolute inset-0">
            <img src={heroWarehouse} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-background/50 to-transparent" />
          </div>
          <div className="relative container mx-auto px-4 py-12">
            <div className="inline-flex [&_nav]:text-foreground [&_a]:text-foreground/80 [&_a]:font-semibold [&_a:hover]:text-foreground [&_span]:text-foreground [&_span]:font-bold [&_svg]:text-foreground/60">
              <BreadcrumbNav
                items={[
                  { label: "Home", to: "/" },
                  { label: "Deals" },
                ]}
                showBack={false}
              />
            </div>

            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 mb-3 bg-primary/90 text-primary-foreground px-3 py-1 rounded-full">
                <Tag className="h-3.5 w-3.5" />
                <span className="text-xs font-semibold uppercase tracking-wider">Marketplace Section</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground drop-shadow-md mb-3">
                Deals &amp; Special Offers
              </h1>
              <p className="text-foreground text-base font-semibold leading-relaxed drop-shadow-sm mb-2">
                Browse discounted listings from UK sellers or list your own products today.
              </p>
              <p className="text-sm text-foreground font-medium drop-shadow-sm mb-5">
                This is a marketplace section where sellers list products and buyers connect directly.
              </p>
              <div className="flex flex-wrap gap-3">
                <a href="#listings">
                  <Button variant="outline" size="sm" className="text-xs font-semibold bg-background text-foreground border-border shadow-md hover:bg-background/90">
                    Browse Deals
                  </Button>
                </a>
                <Link to="/signup">
                  <Button variant="default" size="sm" className="text-xs bg-gradient-hero text-primary-foreground shadow-md">
                    Start Selling <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
              <CountdownBanner variant="inline" />
            </div>
          </div>
        </div>

        {/* Sub-sections overview */}
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {dealSubSections.map((section) => {
              const isActive = activeSubTypes !== null &&
                section.types.every((t) => activeSubTypes?.includes(t)) &&
                activeSubTypes.length === section.types.length;
              return (
                <button
                  key={section.label}
                  onClick={() => {
                    setActiveSubTypes(isActive ? null : section.types);
                  }}
                  className={`text-left p-4 rounded-xl border transition-all duration-200 ${
                    isActive
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border bg-card hover:border-primary/30 hover:shadow-sm"
                  }`}
                >
                  <section.icon className={`h-5 w-5 mb-2 ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`} />
                  <h3 className="font-display text-sm font-semibold text-foreground mb-1">{section.label}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{section.description}</p>
                  <p className="text-xs font-medium text-primary mt-2">
                    {(() => {
                      if (!isActive) return "Browse →";
                      if (loading) return "…";
                      return `${products.length} listing${products.length !== 1 ? "s" : ""}`;
                    })()}
                  </p>
                </button>
              );
            })}
          </div>

          {/* How it works mini-section */}
          <div className="bg-muted/50 rounded-xl border border-border p-5 mb-8">
            <h3 className="font-display text-sm font-semibold text-foreground mb-3">How this section works</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">1</span>
                <p className="text-muted-foreground"><strong className="text-foreground">Sellers list</strong> their products on the platform with special pricing or offers.</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">2</span>
                <p className="text-muted-foreground"><strong className="text-foreground">Buyers browse</strong> listings, compare prices, and contact sellers directly.</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">3</span>
                <p className="text-muted-foreground"><strong className="text-foreground">Transactions happen</strong> through the platform with secure checkout via Stripe.</p>
              </div>
            </div>
          </div>

          {/* Catalog area */}
          <CatalogHeader
            totalResults={filteredProducts.length}
            sortBy={sortBy}
            setSortBy={setSortBy}
            viewMode={viewMode}
            setViewMode={setViewMode}
            onToggleFilters={() => setFiltersVisible(!filtersVisible)}
            filtersVisible={filtersVisible}
          />

          {activeFilters.length > 0 && (
            <div className="flex flex-wrap gap-2 py-4">
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

          <div className="flex gap-8 mt-4">
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
                  />
                </div>
              </div>
            )}

            {/* Product grid */}
            <div className="flex-1 min-w-0">
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="bg-card rounded-xl border border-border aspect-[4/5] animate-pulse" />
                  ))}
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-lg font-display font-semibold text-foreground mb-2">No listings found</p>
                  <p className="text-sm text-muted-foreground mb-4">Try adjusting your filters or browse the full marketplace.</p>
                  <Link to="/catalog">
                    <Button variant="outline" size="sm">Browse Full Marketplace</Button>
                  </Link>
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
                    <ProductCard key={product.id} product={product} linkState={{ flow: "deals", from: "/deals", fromLabel: "Deals" }} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="mt-12 text-center bg-card rounded-xl border border-border p-8">
            <h3 className="font-display text-xl font-bold text-foreground mb-2">
              Have products to sell on the marketplace?
            </h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-lg mx-auto">
              List your products on Loadify Market and reach thousands of buyers across the UK.
              Free to create an account — you only pay when you sell.
            </p>
            <Link to="/signup">
              <Button className="bg-gradient-hero text-primary-foreground">
                Start Selling <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Deals;
