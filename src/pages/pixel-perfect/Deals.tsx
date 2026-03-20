import { useState, useMemo } from "react";
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
import { mockProducts } from "@/data/mockProducts";
import heroWarehouse from "@/assets/hero-clearance-alt1.jpg";

const dealCategories = [
  "Mixed Lots",
  "Customer Returns",
  "Overstock",
  "Clearance Deals",
];

const dealSubSections = [
  {
    icon: Package,
    label: "Mixed Lots & Pallets",
    description: "Sellers list mixed merchandise pallets — browse and buy directly from them.",
    category: "Mixed Lots",
  },
  {
    icon: RotateCcw,
    label: "Customer Returns",
    description: "Sellers offering graded and unchecked customer return stock.",
    category: "Customer Returns",
  },
  {
    icon: Layers,
    label: "Overstock & End-of-Line",
    description: "Excess inventory and discontinued lines listed by sellers across the UK.",
    category: "Overstock",
  },
  {
    icon: TrendingDown,
    label: "Clearance & Flash Deals",
    description: "Time-limited clearance listings from sellers looking to move stock fast.",
    category: "Clearance Deals",
  },
];

const Deals = () => {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [sortBy, setSortBy] = useState("newest");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filtersVisible, setFiltersVisible] = useState(false);

  const clearAll = () => {
    setSelectedCategories([]);
    setSelectedConditions([]);
    setSelectedLocations([]);
    setPriceRange([0, 10000]);
  };

  // Pre-filter to deal categories only, then apply user filters
  const filteredProducts = useMemo(() => {
    let products = mockProducts.filter((p) => dealCategories.includes(p.category));

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
  }, [selectedCategories, selectedConditions, selectedLocations, priceRange, sortBy]);

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
                  { label: "Catalog", to: "/catalog" },
                  { label: "Clearance" },
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
                Pallets, Clearance &amp; Bulk Deals
              </h1>
              <p className="text-foreground text-base font-semibold leading-relaxed drop-shadow-sm mb-2">
                Browse thousands of listings from UK sellers or sell your excess stock fast.
              </p>
              <p className="text-sm text-foreground font-medium drop-shadow-sm mb-5">
                This is a marketplace section where sellers list stock and buyers connect directly.
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
              const count = mockProducts.filter((p) => p.category === section.category).length;
              return (
                <button
                  key={section.category}
                  onClick={() => {
                    setSelectedCategories(
                      selectedCategories.includes(section.category)
                        ? selectedCategories.filter((c) => c !== section.category)
                        : [section.category]
                    );
                  }}
                  className={`text-left p-4 rounded-xl border transition-all duration-200 ${
                    selectedCategories.includes(section.category)
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border bg-card hover:border-primary/30 hover:shadow-sm"
                  }`}
                >
                  <section.icon className={`h-5 w-5 mb-2 ${
                    selectedCategories.includes(section.category) ? "text-primary" : "text-muted-foreground"
                  }`} />
                  <h3 className="font-display text-sm font-semibold text-foreground mb-1">{section.label}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{section.description}</p>
                  <p className="text-xs font-medium text-primary mt-2">{count} listing{count !== 1 ? "s" : ""}</p>
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
                <p className="text-muted-foreground"><strong className="text-foreground">Sellers list</strong> their pallets, clearance, or bulk stock on the platform.</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">2</span>
                <p className="text-muted-foreground"><strong className="text-foreground">Buyers browse</strong> listings, compare prices, and contact sellers directly.</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">3</span>
                <p className="text-muted-foreground"><strong className="text-foreground">Transactions happen</strong> through the platform with secure checkout and buyer protection.</p>
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
              {filteredProducts.length === 0 ? (
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
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="mt-12 text-center bg-card rounded-xl border border-border p-8">
            <h3 className="font-display text-xl font-bold text-foreground mb-2">
              Have pallets, clearance, or bulk stock to sell?
            </h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-lg mx-auto">
              List your stock on Loadify Market and reach thousands of buyers across the UK.
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
