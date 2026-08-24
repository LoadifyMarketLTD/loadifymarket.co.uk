import { useCallback, useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { Link, useParams, useSearchParams } from "react-router-dom";
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
import { visualForCategory } from "@/data/marketplaceVisuals";
import { marketplaceSubcategorySlug } from "@/data/marketplaceTaxonomy";
import MainLayout from "@/layouts/MainLayout";
import SEO from "@/components/SEO";

const PRODUCT_QUERY = `
  *,
  category:categories!categoryId(name, slug),
  subcategory:categories!subcategoryId(name, slug)
`;

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

  const config = CATEGORY_CONFIG.find((category) => category.slug === slug);
  const visual = visualForCategory(slug);

  const [dbCategory, setDbCategory] = useState<{ id: string; name: string; slug: string } | null>(null);
  const [dbCategoryLoading, setDbCategoryLoading] = useState(!config);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [sortBy, setSortBy] = useState("newest");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filtersVisible, setFiltersVisible] = useState(false);

  useEffect(() => {
    if (config || !slug) {
      setDbCategoryLoading(false);
      return;
    }

    (async () => {
      const { data } = await supabase
        .from("categories")
        .select("id, name, slug")
        .eq("slug", slug)
        .eq("isActive", true)
        .maybeSingle();
      setDbCategory(data ?? null);
      setDbCategoryLoading(false);
    })();
  }, [slug, config]);

  const categoryLabel = config?.label ?? dbCategory?.name ?? slug ?? "";
  const Icon = config?.icon;

  const initialChip = useMemo(() => {
    if (!config || !subParam) return 0;
    const index = config.chips.findIndex((chip) => chip.subSlug === subParam || chip.label === subParam);
    return index >= 0 ? index : 0;
  }, [config, subParam]);

  const [activeChip, setActiveChip] = useState(initialChip);

  useEffect(() => {
    setActiveChip(initialChip);
  }, [initialChip]);

  const activeVisualSubcategory = useMemo(() => {
    if (!visual || !subParam) return undefined;
    return visual.subcategories.find(
      (subcategory) =>
        subcategory.title === subParam ||
        marketplaceSubcategorySlug(visual.title, subcategory.title) === subParam,
    );
  }, [visual, subParam]);

  useEffect(() => {
    if (config?.productFilter.categorySlug) {
      (async () => {
        try {
          const { data } = await supabase
            .from("categories")
            .select("id")
            .eq("slug", config.productFilter.categorySlug)
            .single();
          if (data) setCategoryId(data.id as string);
        } catch (error) {
          console.error("category id lookup failed:", error);
          toast({
            title: "Could not load category",
            description: "Please try refreshing the page.",
            variant: "destructive",
          });
        }
      })();
      return;
    }

    if (dbCategory) setCategoryId(dbCategory.id);
  }, [config, dbCategory]);

  const fetchProducts = useCallback(async () => {
    if (!config && !categoryId) return;
    setLoading(true);

    const filter = config?.productFilter;
    const chip = config?.chips[activeChip];

    try {
      let query = supabase
        .from("products")
        .select(PRODUCT_QUERY)
        .eq("isActive", true)
        .eq("isApproved", true);

      if (filter?.types) {
        query = query.in("type", filter.types);
      } else if (categoryId) {
        query = query.eq("categoryId", categoryId);
      }

      if (chip?.searchTerm) {
        const sanitize = (value: string) => value.replace(/[%,.()"'\\]/g, "");
        const terms = chip.searchTerm.trim().split(/\s+/).map(sanitize).filter(Boolean);
        if (terms.length > 0) {
          const orClause = terms
            .map((term) => `title.ilike.%${term}%,description.ilike.%${term}%`)
            .join(",");
          query = query.or(orClause);
        }
      }

      if (chip?.condition) query = query.eq("condition", chip.condition);
      if (selectedConditions.length > 0) query = query.in("condition", selectedConditions);
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

      const rows = data ?? [];
      const sellerIds = [
        ...new Set(rows.map((product: Record<string, unknown>) => product.sellerId as string).filter(Boolean)),
      ];
      const sellerMap = await fetchSellerMap(sellerIds);

      const mapped = rows.map((product: Record<string, unknown>) => ({
        ...product,
        category: Array.isArray(product.category) ? product.category[0] : product.category,
        subcategory: Array.isArray(product.subcategory) ? product.subcategory[0] : product.subcategory,
        seller: sellerMap.get(product.sellerId as string) ?? null,
      }));

      setProducts(adaptProducts(mapped as unknown as DBProduct[]));
    } catch (error) {
      console.error("Error fetching category products:", error);
      toast({
        title: "Could not load products",
        description: "Please try refreshing the page.",
        variant: "destructive",
      });
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [config, activeChip, categoryId, selectedConditions, priceRange, sortBy]);

  useEffect(() => {
    if (!config && !dbCategory) return;
    if (config?.productFilter.types || categoryId) fetchProducts();
  }, [fetchProducts, config, dbCategory, categoryId]);

  const clearAll = () => {
    setSelectedConditions([]);
    setSelectedLocations([]);
    setPriceRange([0, 10000]);
  };

  const filteredProducts = useMemo(() => {
    if (selectedLocations.length === 0) return products;
    return products.filter((product) => selectedLocations.includes(product.location));
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
      setSelectedConditions(selectedConditions.filter((condition) => condition !== filter));
    } else if (selectedLocations.includes(filter)) {
      setSelectedLocations(selectedLocations.filter((location) => location !== filter));
    } else {
      setPriceRange([0, 10000]);
    }
  };

  if (!config && dbCategoryLoading) {
    return (
      <MainLayout>
        <main id="main-content" className="pt-4 md:pt-28 pb-16">
          <div className="container mx-auto px-4 py-20 text-center text-muted-foreground">Loading…</div>
        </main>
      </MainLayout>
    );
  }

  if (!config && !dbCategory) {
    return (
      <MainLayout>
        <SEO
          title="Category Not Found | Loadify Market"
          description="The category you're looking for doesn't exist. Browse all categories on Loadify Market."
        />
        <main id="main-content" className="pt-4 md:pt-28 pb-16">
          <div className="container mx-auto px-4 py-20 text-center">
            <p className="mb-4 text-2xl font-display font-bold text-foreground">Category Not Found</p>
            <p className="mb-8 text-muted-foreground">The category you're looking for doesn't exist.</p>
            <Button asChild><Link to="/catalog">Browse All Listings</Link></Button>
          </div>
        </main>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <SEO
        title={`${categoryLabel} | Loadify Market`}
        description={config?.subtitle || `Browse ${categoryLabel} products on Loadify Market.`}
        canonical={`/category/${slug}`}
      />

      <main id="main-content" className="pt-4 md:pt-28 pb-16">
        <div className="container mx-auto px-4">
          <BreadcrumbNav
            items={[
              { label: "Home", to: "/" },
              { label: "Catalog", to: "/catalog" },
              { label: categoryLabel },
            ]}
            showBack
            backLabel="Back"
            backTo="/catalog"
          />

          {visual ? (
            <section className="my-6 overflow-hidden rounded-2xl border border-border bg-card shadow-card">
              <div className="grid md:grid-cols-[1.08fr_1fr]">
                <div className="aspect-[4/3] overflow-hidden bg-muted md:aspect-auto md:min-h-[360px]">
                  <img
                    src={activeVisualSubcategory?.image || visual.image}
                    alt={activeVisualSubcategory?.altText || visual.altText}
                    className="h-full w-full object-cover"
                    onError={(event) => {
                      const image = event.currentTarget;
                      if (image.src !== new URL(visual.image, window.location.origin).href) {
                        image.src = visual.image;
                      }
                    }}
                  />
                </div>
                <div className="flex flex-col justify-center p-7 sm:p-9 lg:p-11">
                  <span className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
                    {activeVisualSubcategory ? "Subcategory" : "Marketplace category"}
                  </span>
                  <h1 className="mt-3 text-3xl font-display font-bold text-foreground sm:text-4xl">
                    {activeVisualSubcategory?.title || categoryLabel}
                  </h1>
                  <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
                    {activeVisualSubcategory
                      ? `Explore ${activeVisualSubcategory.title.toLowerCase()} within ${categoryLabel}.`
                      : config?.subtitle}
                  </p>
                  <p className="mt-5 text-sm text-muted-foreground">
                    Editorial imagery represents the range. Live inventory appears only when approved seller listings are available.
                  </p>
                  <div className="mt-6">
                    <Badge variant="secondary" className="px-3 py-1.5 text-sm">
                      {loading
                        ? "Checking live listings…"
                        : filteredProducts.length > 0
                          ? `${filteredProducts.length} live listing${filteredProducts.length === 1 ? "" : "s"}`
                          : "Seller listings welcome"}
                    </Badge>
                  </div>
                </div>
              </div>
            </section>
          ) : (
            <div className="py-6 flex items-center gap-4">
              {Icon && (
                <div className={`${config?.accentBg ?? "bg-gray-100"} rounded-xl p-3 shrink-0`}>
                  <Icon className={`h-8 w-8 ${config?.iconColor ?? "text-gray-400"}`} />
                </div>
              )}
              <div>
                <h1 className="text-2xl font-display font-bold text-foreground">{config?.title ?? categoryLabel}</h1>
                <p className="mt-0.5 text-sm text-muted-foreground">{config?.subtitle}</p>
              </div>
            </div>
          )}

          {visual && !subParam && (
            <section className="mb-10">
              <div className="mb-5">
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Explore visually</span>
                <h2 className="mt-2 text-2xl font-display font-bold text-foreground">
                  {categoryLabel} subcategories
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {visual.subcategories.map((subcategory) => {
                  const subSlug = marketplaceSubcategorySlug(visual.title, subcategory.title);
                  return (
                    <Link
                      key={subcategory.title}
                      to={`/category/${slug}?sub=${encodeURIComponent(subSlug)}`}
                      className="group overflow-hidden rounded-xl border border-border bg-card transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-card"
                    >
                      <div className="aspect-[4/3] overflow-hidden bg-muted">
                        <img
                          src={subcategory.image}
                          alt={subcategory.altText}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                          onError={(event) => {
                            event.currentTarget.src = visual.image;
                          }}
                        />
                      </div>
                      <div className="p-3">
                        <span className="text-sm font-semibold leading-5 text-foreground">{subcategory.title}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {config && config.chips.length > 1 && (
            <div className="flex flex-wrap gap-2 pb-6">
              {config.chips.map((chip, index) => (
                <Link
                  key={chip.label}
                  to={chip.subSlug ? `/category/${slug}?sub=${encodeURIComponent(chip.subSlug)}` : `/category/${slug}`}
                  onClick={() => setActiveChip(index)}
                  className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                    activeChip === index
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-background text-muted-foreground hover:border-foreground hover:text-foreground"
                  }`}
                >
                  {chip.label}
                </Link>
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

          {activeFilters.length > 0 && (
            <div className="flex flex-wrap gap-2 pb-4">
              {activeFilters.map((filter) => (
                <Badge
                  key={filter}
                  variant="secondary"
                  className="flex cursor-pointer items-center gap-1.5 px-3 py-1.5 text-xs transition-colors hover:bg-destructive/10"
                  onClick={() => removeFilter(filter)}
                >
                  {filter}<X className="h-3 w-3" />
                </Badge>
              ))}
            </div>
          )}

          <div className="flex gap-8">
            <aside className="hidden w-64 shrink-0 lg:block">
              <div className="sticky top-24 rounded-xl border border-border bg-card p-5">
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

            {filtersVisible && (
              <div className="fixed inset-0 z-50 lg:hidden">
                <div className="absolute inset-0 bg-black/50" onClick={() => setFiltersVisible(false)} />
                <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-card p-6 animate-in slide-in-from-bottom duration-300">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-display font-bold text-foreground">Filters</h3>
                    <button onClick={() => setFiltersVisible(false)} className="p-1 text-muted-foreground hover:text-foreground">
                      <X className="h-5 w-5" />
                    </button>
                  </div>
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
                  <div className="mt-6 pb-2">
                    <Button className="h-11 w-full bg-primary font-semibold text-black hover:bg-primary-hover" onClick={() => setFiltersVisible(false)}>
                      Apply Filters
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="min-w-0 flex-1">
              {loading ? (
                <div className={viewMode === "grid" ? "grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3" : "flex flex-col gap-4"}>
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className="aspect-[4/5] rounded-xl border border-border bg-card animate-pulse" />
                  ))}
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-primary/25 bg-primary/5 px-6 py-14 text-center">
                  <p className="mb-2 text-xl font-display font-bold text-foreground">
                    This range is ready for sellers.
                  </p>
                  <p className="mx-auto mb-6 max-w-xl text-sm text-muted-foreground">
                    There are no live seller listings in this range yet. The category and subcategory structure is already prepared for new stock.
                  </p>
                  <Button asChild variant="outline"><Link to="/signup">Start selling in this category</Link></Button>
                </div>
              ) : (
                <div className={viewMode === "grid" ? "grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3" : "flex flex-col gap-4"}>
                  {filteredProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      linkState={{ flow: "marketplace", categorySlug: slug, categoryLabel: config?.label }}
                    />
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
