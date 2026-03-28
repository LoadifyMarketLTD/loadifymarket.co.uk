import { useState, useEffect } from "react";
import { useParams, useLocation, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BreadcrumbNav from "@/components/BreadcrumbNav";
import ProductGallery from "@/components/product/ProductGallery";
import ProductInfo from "@/components/product/ProductInfo";
import SellerCard from "@/components/product/SellerCard";
import ProductReviews from "@/components/product/ProductReviews";
import ProductCard from "@/components/catalog/ProductCard";
import type { Product } from "@/components/catalog/ProductCard";
import { supabase } from "@/lib/supabase";
import { adaptProduct } from "@/lib/productAdapter";
import type { DBProduct } from "@/lib/productAdapter";

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

const ProductDetail = () => {
  const { id } = useParams();
  const location = useLocation();
  // State passed from listing pages (Catalog, CategoryPage, Clearance)
  const navState = (location.state ?? {}) as {
    flow?: string;
    from?: string;
    fromLabel?: string;
    categorySlug?: string;
    categoryLabel?: string;
  };

  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [sellerListingCount, setSellerListingCount] = useState(0);
  const [productCategorySlug, setProductCategorySlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchProduct = async () => {
      setLoading(true);
      setNotFound(false);
      try {
        // Step 1: Fetch product with category joins only
        const { data, error } = await supabase
          .from("products")
          .select(PRODUCT_QUERY)
          .eq("id", id)
          .eq("isActive", true)
          .maybeSingle();

        if (error) throw error;

        if (!data) {
          setNotFound(true);
          return;
        }

        // Step 2 & 3: Fetch seller info separately
        const sellerMap = await fetchSellerMap(data.sellerId ? [data.sellerId] : []);

        // Step 4: Merge
        const normalised = {
          ...data,
          category: Array.isArray(data.category) ? data.category[0] : data.category,
          subcategory: Array.isArray(data.subcategory) ? data.subcategory[0] : data.subcategory,
          seller: sellerMap.get(data.sellerId) ?? null,
        } as unknown as DBProduct;

        // Step 5: Adapt to UI shape
        const adapted = adaptProduct(normalised);
        setProduct(adapted);

        // Capture category slug for breadcrumb link
        const rawCat = Array.isArray(data.category) ? data.category[0] : data.category;
        setProductCategorySlug((rawCat as { slug?: string } | null)?.slug ?? null);

        // Use real product images
        const imgs = Array.isArray(data.images) && data.images.length > 0
          ? data.images
          : [adapted.image];
        setGalleryImages(imgs);

        // Fetch related products from the same category
        if (data.categoryId) {
          const { data: relData } = await supabase
            .from("products")
            .select(PRODUCT_QUERY)
            .eq("isActive", true)
            .eq("isApproved", true)
            .eq("categoryId", data.categoryId)
            .neq("id", id)
            .order("rating", { ascending: false })
            .limit(3);

          if (relData && relData.length > 0) {
            // Fetch sellers for related products
            const relSellerIds = [...new Set(relData.map((p: Record<string, unknown>) => p.sellerId as string).filter(Boolean))];
            const relSellerMap = await fetchSellerMap(relSellerIds);

            const normRel = relData.map((p: Record<string, unknown>) => ({
              ...p,
              category: Array.isArray(p.category) ? p.category[0] : p.category,
              subcategory: Array.isArray(p.subcategory) ? p.subcategory[0] : p.subcategory,
              seller: relSellerMap.get(p.sellerId as string) ?? null,
            }));
            setRelated(normRel.map((p) => adaptProduct(p as unknown as DBProduct)));
          }
        }

        // Fetch seller's active listing count
        if (data.sellerId) {
          const { count } = await supabase
            .from("products")
            .select("id", { count: "exact", head: true })
            .eq("sellerId", data.sellerId)
            .eq("isActive", true)
            .eq("isApproved", true);
          setSellerListingCount(count ?? 0);
        }
      } catch (err) {
        console.error("Error fetching product:", err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-20 pb-16">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-[1fr_420px] gap-8 animate-pulse">
              <div className="space-y-8">
                <div className="aspect-[4/3] bg-card rounded-xl border border-border" />
                <div className="h-48 bg-card rounded-xl border border-border" />
              </div>
              <div className="space-y-6">
                <div className="h-80 bg-card rounded-xl border border-border" />
                <div className="h-40 bg-card rounded-xl border border-border" />
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 text-center">
          <h1 className="text-2xl font-display font-bold text-foreground">Product Not Found</h1>
          <Link to="/catalog" className="text-primary hover:underline mt-4 inline-block">
            ← Back to Catalog
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-20 pb-16">
        <div className="container mx-auto px-4">
          {(() => {
            const isClearance = navState.flow === "clearance";
            const sectionLabel = isClearance
              ? (navState.fromLabel ?? "Clearance")
              : "Catalog";
            const sectionPath = isClearance
              ? (navState.from ?? "/clearance")
              : "/catalog";
            // Category slug: prefer what was passed from CategoryPage, fall back to DB-derived
            const catSlug = navState.categorySlug ?? productCategorySlug;
            const catLabel = navState.categoryLabel ?? product.category;
            return (
              <BreadcrumbNav
                items={[
                  { label: "Home", to: "/" },
                  { label: sectionLabel, to: sectionPath },
                  ...(catSlug
                    ? [{ label: catLabel, to: `/category/${catSlug}` }]
                    : [{ label: catLabel }]),
                  { label: product.title },
                ]}
                showBack={true}
                backLabel={isClearance ? `Back to ${sectionLabel}` : "Back to Catalog"}
                backTo={sectionPath}
              />
            );
          })()}

          {/* Main content */}
          <div className="grid lg:grid-cols-[1fr_420px] gap-8">
            {/* Left: Gallery + Description */}
            <div className="space-y-8">
              <ProductGallery images={galleryImages} title={product.title} />

              {/* Description */}
              <div className="bg-card rounded-xl border border-border p-6 space-y-4">
                <h2 className="font-display text-lg font-semibold text-foreground">Description</h2>
                <div className="text-sm text-muted-foreground leading-relaxed space-y-3">
                  <p>
                    This {product.condition.toLowerCase()} condition lot includes {product.unitCount}{" "}
                    {product.unitCount === 1 ? "lot" : "lots"} of {product.category.toLowerCase()} items.
                    {product.location ? ` Located in ${product.location}, available for collection or delivery UK-wide.` : "Available for UK-wide delivery."}
                  </p>
                  <p>
                    All items have been sourced from reputable UK retailers and brands. Ideal for
                    resellers, market traders, online sellers, and wholesale buyers looking for
                    quality products at below-retail prices.
                  </p>
                  <h3 className="font-display text-sm font-semibold text-foreground pt-2">What's Included</h3>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Mixed brands and product types within {product.subcategory}</li>
                    <li>Detailed manifest available upon request</li>
                    <li>Condition: {product.condition}</li>
                    <li>All items are UK sourced with full traceability</li>
                  </ul>
                  <h3 className="font-display text-sm font-semibold text-foreground pt-2">Shipping & Collection</h3>
                  <ul className="list-disc list-inside space-y-1">
                    {product.location && <li>Collection available from {product.location}</li>}
                    <li>UK mainland delivery available (quote on request)</li>
                    <li>Items are securely packaged and ready for dispatch</li>
                  </ul>
                </div>
              </div>

              {/* Reviews */}
              <ProductReviews
                productId={id ?? ""}
                productRating={product.rating ?? 0}
                reviewCount={product.reviewCount ?? 0}
              />
            </div>

            {/* Right: Info + Seller */}
            <div className="space-y-6">
              <div className="lg:sticky lg:top-24 space-y-6">
                <div className="bg-card rounded-xl border border-border p-6">
                  <ProductInfo
                    product={product}
                    title={product.title}
                    category={product.category}
                    subcategory={product.subcategory}
                    condition={product.condition}
                    location={product.location}
                    unitCount={product.unitCount}
                    views={product.views}
                    listed={product.listed}
                  />
                </div>

                <SellerCard
                  name={product.seller}
                  verified={product.sellerVerified}
                  rating={product.rating}
                  location={product.location}
                  totalListings={sellerListingCount}
                />
              </div>
            </div>
          </div>

          {/* Related products */}
          {related.length > 0 && (
            <div className="mt-16">
              <h2 className="font-display text-xl font-bold text-foreground mb-6">Similar Listings</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {related.map((p) => (
                  <Link key={p.id} to={`/product/${p.id}`}>
                    <ProductCard product={p} />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ProductDetail;
