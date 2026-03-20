import { useState, useMemo, useEffect } from "react";
import { X } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BreadcrumbNav from "@/components/BreadcrumbNav";
import CatalogFilters from "@/components/catalog/CatalogFilters";
import CatalogHeader from "@/components/catalog/CatalogHeader";
import ProductCard from "@/components/catalog/ProductCard";
import { Badge } from "@/components/ui/badge";
import { mockProducts } from "@/data/mockProducts";

const Catalog = () => {
  const [searchParams] = useSearchParams();
  const queryParam = searchParams.get("q") || "";
  const categoryParam = searchParams.get("category") || "";

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [sortBy, setSortBy] = useState("newest");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filtersVisible, setFiltersVisible] = useState(false);

  // Sync category param from search into filter state on mount / param change
  useEffect(() => {
    if (categoryParam) {
      setSelectedCategories((prev) =>
        prev.includes(categoryParam) ? prev : [categoryParam]
      );
    }
  }, [categoryParam]);

  const clearAll = () => {
    setSelectedCategories([]);
    setSelectedConditions([]);
    setSelectedLocations([]);
    setPriceRange([0, 10000]);
  };

  const filteredProducts = useMemo(() => {
    let products = [...mockProducts];

    // Text search from ?q= param
    if (queryParam.trim()) {
      const q = queryParam.trim().toLowerCase();
      products = products.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.subcategory.toLowerCase().includes(q) ||
          p.seller.toLowerCase().includes(q)
      );
    }

    if (selectedCategories.length > 0) {
      products = products.filter((p) => selectedCategories.includes(p.category));
    }
    if (selectedConditions.length > 0) {
      products = products.filter((p) => selectedConditions.includes(p.condition));
    }
    if (selectedLocations.length > 0) {
      products = products.filter((p) => selectedLocations.includes(p.location));
    }
    products = products.filter((p) => p.price >= priceRange[0] && p.price <= priceRange[1]);

    switch (sortBy) {
      case "price-low":
        products.sort((a, b) => a.price - b.price);
        break;
      case "price-high":
        products.sort((a, b) => b.price - a.price);
        break;
      case "popular":
        products.sort((a, b) => b.views - a.views);
        break;
      case "rating":
        products.sort((a, b) => b.rating - a.rating);
        break;
      default:
        break;
    }

    return products;
  }, [selectedCategories, selectedConditions, selectedLocations, priceRange, sortBy, queryParam]);

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
              {filteredProducts.length === 0 ? (
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
