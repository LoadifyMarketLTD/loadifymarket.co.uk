import { useState, useEffect } from "react";
import { useParams, useLocation, Link, useNavigate } from "react-router-dom";
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
import { useAuthStore } from "@/store";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Flag, MessageSquare, Tag, ShoppingCart } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { copyToClipboard } from "@/lib/clipboard";
import MainLayout from "@/layouts/MainLayout";
import SEO from "@/components/SEO";
import MakeOfferSheet from "@/components/MakeOfferSheet";
import { useCart } from "@/contexts/CartContext";

const BASE_URL = "https://loadifymarket.co.uk";
const DEFAULT_PRODUCT_SEO_DESCRIPTION =
  "Discover products from verified UK sellers on Loadify Market.";
const DEFAULT_OG_IMAGE = `${BASE_URL}/og-image.jpg`;

function toAbsolutePublicUrl(value?: string | null): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  if (trimmed.startsWith("/")) return `${BASE_URL}${trimmed}`;
  return `${BASE_URL}/${trimmed}`;
}

function excerpt(text: string, max = 180): string {
  const normalised = text.replace(/\s+/g, " ").trim();
  if (normalised.length <= max) return normalised;
  return `${normalised.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

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

const REPORT_REASONS = [
  { value: "fake", label: "Fake or counterfeit product" },
  { value: "misleading", label: "Misleading description" },
  { value: "prohibited", label: "Prohibited item" },
  { value: "counterfeit", label: "Counterfeit goods" },
  { value: "wrong_category", label: "Wrong category" },
  { value: "spam", label: "Spam or duplicate listing" },
  { value: "other", label: "Other" },
];

const ProductDetail = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { addToCart } = useCart();
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
  const [productDescription, setProductDescription] = useState("");
  const [sellerListingCount, setSellerListingCount] = useState(0);
  const [productSellerId, setProductSellerId] = useState<string | null>(null);
  const [productCategorySlug, setProductCategorySlug] = useState<string | null>(null);
  const [sellerStoreSlug, setSellerStoreSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Report listing dialog state
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [reportLoading, setReportLoading] = useState(false);

  // Mobile CTA state
  const [ctaLoading, setCtaLoading] = useState(false);
  const [offerConvId, setOfferConvId] = useState<string | null>(null);
  const [offerOpen, setOfferOpen] = useState(false);

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

        // Step 4: Merge — include sellerId so owner-awareness works on the UI
        const normalised = {
          ...data,
          category: Array.isArray(data.category) ? data.category[0] : data.category,
          subcategory: Array.isArray(data.subcategory) ? data.subcategory[0] : data.subcategory,
          seller: sellerMap.get(data.sellerId) ?? null,
          sellerId: data.sellerId as string | undefined,
        } as unknown as DBProduct;

        // Step 5: Adapt to UI shape
        const adapted = adaptProduct(normalised);
        setProduct(adapted);
        setProductDescription(
          typeof data.description === "string" ? data.description : "",
        );
        setProductSellerId(data.sellerId ?? null);

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

        // Fetch seller's active listing count and store slug
        if (data.sellerId) {
          const [countRes, storeRes] = await Promise.all([
            supabase
              .from("products")
              .select("id", { count: "exact", head: true })
              .eq("sellerId", data.sellerId)
              .eq("isActive", true)
              .eq("isApproved", true),
            supabase
              .from("seller_stores")
              .select("storeSlug")
              .eq("userId", data.sellerId)
              .eq("isActive", true)
              .maybeSingle(),
          ]);
          setSellerListingCount(countRes.count ?? 0);
          setSellerStoreSlug((storeRes.data as { storeSlug?: string } | null)?.storeSlug ?? null);
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
      <MainLayout>
        <main id="main-content" className="pt-28 pb-16">
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
      </MainLayout>
    );
  }

  if (notFound || !product) {
    return (
      <MainLayout>
        <div className="pt-28 text-center">
          <h1 className="text-2xl font-display font-bold text-foreground">Product Not Found</h1>
          <Link to="/catalog" className="text-primary hover:underline mt-4 inline-block">
            Back to Catalog
          </Link>
        </div>
      </MainLayout>
    );
  }

  const handleReportSubmit = async () => {
    if (!id || !user || !reportReason) return;
    setReportLoading(true);
    try {
      const { error } = await supabase.from("reported_listings").insert({
        productId: id,
        reportedBy: user.id,
        reason: reportReason,
        description: reportDescription.trim() || null,
        status: "pending",
      });
      if (error) throw error;
      toast({ title: "Report submitted", description: "Thank you. Our team will review this listing." });
      setReportOpen(false);
      setReportReason("");
      setReportDescription("");
    } catch (err) {
      toast({ title: "Failed to submit report", description: (err as Error).message, variant: "destructive" });
    } finally {
      setReportLoading(false);
    }
  };

  /**
   * Finds or creates a conversation between the current buyer and the seller
   * for this product, then returns the conversation id.
   *
   * Handles the UNIQUE (user1Id, user2Id, productId) constraint race by
   * catching error code 23505 and re-querying for the existing row.
   */
  const getOrCreateConversation = async (): Promise<string | null> => {
    if (!user?.id || !productSellerId || !id) return null;

    // Check both orderings because user1Id/user2Id is set at creation time
    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .eq("productId", id)
      .or(
        `and(user1Id.eq.${user.id},user2Id.eq.${productSellerId}),` +
        `and(user1Id.eq.${productSellerId},user2Id.eq.${user.id})`
      )
      .maybeSingle<{ id: string }>();

    if (existing?.id) return existing.id;

    // Create new conversation
    const { data: created, error } = await supabase
      .from("conversations")
      .insert({
        user1Id: user.id,
        user2Id: productSellerId,
        productId: id,
        subject: product.title ? `Re: ${product.title}` : null,
      })
      .select("id")
      .single<{ id: string }>();

    // 23505 = unique_violation: a concurrent request already created the row
    if (error) {
      if (error.code === "23505") {
        const { data: raceWinner } = await supabase
          .from("conversations")
          .select("id")
          .eq("productId", id)
          .or(
            `and(user1Id.eq.${user.id},user2Id.eq.${productSellerId}),` +
            `and(user1Id.eq.${productSellerId},user2Id.eq.${user.id})`
          )
          .maybeSingle<{ id: string }>();
        return raceWinner?.id ?? null;
      }
      console.error("Failed to create conversation:", error.message);
      return null;
    }
    return created?.id ?? null;
  };

  const handleMessageSeller = async () => {
    if (!user) { navigate("/login", { state: { from: `/product/${id}` } }); return; }
    setCtaLoading(true);
    try {
      const convId = await getOrCreateConversation();
      if (convId) navigate(`/inbox/${convId}`);
      else toast({ title: "Could not open conversation", variant: "destructive" });
    } finally {
      setCtaLoading(false);
    }
  };

  const handleMakeOffer = async () => {
    if (!user) { navigate("/login", { state: { from: `/product/${id}` } }); return; }
    setCtaLoading(true);
    try {
      const convId = await getOrCreateConversation();
      if (convId) { setOfferConvId(convId); setOfferOpen(true); }
      else toast({ title: "Could not open conversation", variant: "destructive" });
    } finally {
      setCtaLoading(false);
    }
  };

  const handleBuyNow = () => {
    if (!product) return;
    addToCart(product, 1);
    navigate("/checkout");
  };

  // True when the logged-in user is the seller/owner of this product
  const isMobileCtaVisible = !!(product && productSellerId && (!user || user.id !== productSellerId));

  const normalizedCategory = (product.category ?? "").trim().toLowerCase();
  const normalizedSubcategory = (product.subcategory ?? "").trim().toLowerCase();
  const hasDistinctSubcategory =
    normalizedSubcategory.length > 0 && normalizedSubcategory !== normalizedCategory;
  const detailsCategoryLabel = hasDistinctSubcategory ? product.subcategory : product.category;
  const canonicalProductUrl = `${BASE_URL}/product/${product.id}`;
  const currentProductUrl = typeof window !== "undefined"
    ? `${window.location.origin}${window.location.pathname}`
    : canonicalProductUrl;
  const normalisedDescription = productDescription.replace(/\s+/g, " ").trim();
  const firstSentenceMatch = normalisedDescription
    ? normalisedDescription.match(/^[^.!?]+[.!?]?/)
    : null;
  const firstSentence = firstSentenceMatch?.[0]?.trim() ?? "";
  const shortDescription =
    firstSentence.length > 0 && firstSentence.length <= 140
      ? firstSentence
      : "";
  const longDescriptionExcerpt = normalisedDescription
    ? excerpt(normalisedDescription, 200)
    : "";
  const categoryFallbackDescription = product.category
    ? `${product.title} in ${product.category} on Loadify Market.`
    : `${product.title} on Loadify Market.`;
  const seoDescription =
    shortDescription ||
    longDescriptionExcerpt ||
    categoryFallbackDescription ||
    DEFAULT_PRODUCT_SEO_DESCRIPTION;
  const primaryImageCandidate = galleryImages.find((img) => typeof img === "string" && img.trim().length > 0) || product.image;
  const seoImage = toAbsolutePublicUrl(primaryImageCandidate) ?? DEFAULT_OG_IMAGE;
  const encodedProductUrl = encodeURIComponent(currentProductUrl);
  const whatsappText = `Check out this product on Loadify Market: ${product.title} - ${currentProductUrl}`;
  const encodedWhatsAppText = encodeURIComponent(whatsappText);
  const supportsNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const handleShareFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodedProductUrl}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleShareWhatsApp = () => {
    const url = `https://wa.me/?text=${encodedWhatsAppText}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleCopyLink = async () => {
    try {
      await copyToClipboard(currentProductUrl);
      toast({ title: "Link copied", description: "Product link copied to clipboard." });
    } catch {
      toast({
        title: "Could not copy link",
        description: "Please copy the page URL from your browser.",
        variant: "destructive",
      });
    }
  };

  const handleShareInstagram = async () => {
    try {
      await copyToClipboard(currentProductUrl);
      toast({
        title: "Link copied for Instagram",
        description: "Open Instagram, create a post or story, and paste the link in your caption.",
      });
    } catch {
      toast({
        title: "Could not copy link",
        description: "Please copy the page URL from your browser.",
        variant: "destructive",
      });
    }
  };

  const handleShareTikTok = async () => {
    try {
      await copyToClipboard(currentProductUrl);
      toast({
        title: "Link copied for TikTok",
        description: "Open TikTok, create a video, and paste the link in your caption or bio.",
      });
    } catch {
      toast({
        title: "Could not copy link",
        description: "Please copy the page URL from your browser.",
        variant: "destructive",
      });
    }
  };

  const handleNativeShare = async () => {
    if (!supportsNativeShare) return;
    try {
      await navigator.share({
        title: product.title,
        text: `Check out this product on Loadify Market: ${product.title}`,
        url: currentProductUrl,
      });
    } catch {
      // User cancellation is non-fatal; no toast needed.
    }
  };

  return (
    <MainLayout>
      <SEO
        title={`${product.title} | Loadify Market`}
        description={seoDescription}
        canonical={canonicalProductUrl}
        ogImage={seoImage}
        ogType="product"
      />
      <main id="main-content" className="pt-28 pb-16">
        <div className="container mx-auto px-4">
          {(() => {
            const isClearance = navState.flow === "clearance" || navState.flow === "deals";
            const sectionLabel = isClearance
              ? (navState.fromLabel ?? "Deals")
              : "Catalog";
            const sectionPath = isClearance
              ? (navState.from ?? "/deals")
              : "/catalog";
            // Category slug: prefer what was passed from CategoryPage, fall back to DB-derived
            const catSlug = navState.categorySlug ?? productCategorySlug;
            const catLabel = navState.categoryLabel ?? product.category;
            const showSubcategoryCrumb =
              !!product.subcategory &&
              product.subcategory.trim().length > 0 &&
              product.subcategory.trim().toLowerCase() !== (catLabel ?? "").trim().toLowerCase();
            return (
              <BreadcrumbNav
                items={[
                  { label: "Home", to: "/" },
                  { label: sectionLabel, to: sectionPath },
                  ...(catSlug
                    ? [{ label: catLabel, to: `/category/${catSlug}` }]
                    : [{ label: catLabel }]),
                  ...(showSubcategoryCrumb ? [{ label: product.subcategory }] : []),
                  { label: product.title },
                ]}
                showBack={true}
                backLabel={isClearance ? `Back to ${sectionLabel}` : "Back to Catalog"}
                backTo={sectionPath}
              />
            );
          })()}

          {/* Main content — mobile: Gallery → Info → Desc/Reviews  |  desktop: 2-column grid */}
          <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[1fr_420px]">
            {/* Gallery — first on both mobile and desktop */}
            <div className="order-1 lg:col-start-1 lg:row-start-1">
              <ProductGallery images={galleryImages} title={product.title} />
            </div>

            {/* Info + Seller — second on mobile (above desc/reviews), right column on desktop */}
            <div className="order-2 lg:col-start-2 lg:row-start-1 lg:row-span-2 space-y-6">
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
                    sellerId={productSellerId}
                    onShareFacebook={handleShareFacebook}
                    onShareWhatsApp={handleShareWhatsApp}
                    onShareInstagram={handleShareInstagram}
                    onShareTikTok={handleShareTikTok}
                    onCopyLink={handleCopyLink}
                    onNativeShare={handleNativeShare}
                    supportsNativeShare={supportsNativeShare}
                  />
                </div>

                <SellerCard
                  name={product.seller}
                  verified={product.sellerVerified}
                  rating={product.rating}
                  location={product.location}
                  totalListings={sellerListingCount}
                  storeSlug={sellerStoreSlug}
                />

                {/* Report Listing */}
                {user && (
                  <button
                    onClick={() => setReportOpen(true)}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Flag className="h-3.5 w-3.5" />
                    Report this listing
                  </button>
                )}
              </div>
            </div>

            {/* Description + Reviews — third on mobile, below gallery on desktop */}
            <div className="order-3 lg:col-start-1 lg:row-start-2 space-y-8">
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
                    <li>Mixed brands and product types within {detailsCategoryLabel}</li>
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

      {/* Report Listing Dialog */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report this Listing</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Help us keep Loadify Market safe by reporting listings that violate our policies.
            </p>
            <div className="space-y-2">
              <Label htmlFor="report-reason">Reason</Label>
              <Select value={reportReason} onValueChange={setReportReason}>
                <SelectTrigger id="report-reason">
                  <SelectValue placeholder="Select a reason…" />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_REASONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="report-description">Additional details (optional)</Label>
              <Textarea
                id="report-description"
                placeholder="Provide any additional context…"
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportOpen(false)} disabled={reportLoading}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReportSubmit}
              disabled={reportLoading || !reportReason}
            >
              {reportLoading ? "Submitting…" : "Submit Report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Mobile CTA bar — sticky at bottom, hidden on desktop ─────────── */}
      {isMobileCtaVisible && (
        <div
          className="md:hidden fixed bottom-[60px] left-0 right-0 z-[9996] px-4 py-3 flex gap-2"
          style={{
            background: "rgba(11,15,26,0.96)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))",
          }}
        >
          {/* Message Seller */}
          <button
            onClick={() => void handleMessageSeller()}
            disabled={ctaLoading}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-white/20 text-white text-sm font-semibold active:bg-white/10 transition-colors disabled:opacity-50"
          >
            <MessageSquare className="h-4 w-4" />
            <span>Message</span>
          </button>

          {/* Make Offer */}
          <button
            onClick={() => void handleMakeOffer()}
            disabled={ctaLoading}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-[#FBBF24]/50 text-[#FBBF24] text-sm font-semibold active:bg-[#FBBF24]/10 transition-colors disabled:opacity-50"
          >
            <Tag className="h-4 w-4" />
            <span>Make Offer</span>
          </button>

          {/* Buy Now */}
          <button
            onClick={handleBuyNow}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#FBBF24] text-[#020617] text-sm font-bold active:bg-[#F59E0B] transition-colors"
          >
            <ShoppingCart className="h-4 w-4" />
            <span>Buy Now</span>
          </button>
        </div>
      )}

      {/* Make Offer sheet */}
      {offerConvId && productSellerId && (
        <MakeOfferSheet
          open={offerOpen}
          onOpenChange={setOfferOpen}
          conversationId={offerConvId}
          receiverId={productSellerId}
          productTitle={product?.title}
          onSent={() => navigate(`/inbox/${offerConvId}`)}
        />
      )}

    </MainLayout>
  );
};

export default ProductDetail;
