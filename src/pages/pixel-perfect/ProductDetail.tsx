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
import { adaptProduct, adaptProducts } from "@/lib/productAdapter";
import type { DBProduct } from "@/lib/productAdapter";
import { useAuthStore } from "@/store";
import { useAuthPromptStore } from "@/store/authPromptStore";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Flag, ShoppingCart, ArrowLeft, Share2, Heart, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { copyToClipboard } from "@/lib/clipboard";
import { shareProduct, canShare } from "@/lib/shareProduct";
import { isCapacitorNative } from "@/lib/capacitorUtils";
import { authorizedFetch } from "@/lib/authorizedFetch";
import MainLayout from "@/layouts/MainLayout";
import SEO from "@/components/SEO";
import { useCart } from "@/contexts/CartContext";
import {
  trackProductView,
  trackShareProduct,
  trackCopyLink,
  trackAddToCart,
} from "@/lib/analytics";

const BASE_URL = "https://loadifymarket.co.uk";
const DEFAULT_PRODUCT_SEO_DESCRIPTION =
  "Discover products from verified UK sellers on Loadify Market.";
const DEFAULT_OG_IMAGE = `${BASE_URL}/og-loadify-market.png`;

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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
  const promptAuth = useAuthPromptStore((s) => s.open);
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
  const [sellerJoinDate, setSellerJoinDate] = useState<string | null>(null);
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
  const [ctaLoadingAction, setCtaLoadingAction] = useState<"message" | null>(null);
  // Mobile wishlist state (mirrored for the mobile overlay header)
  const [mobileWishlisted, setMobileWishlisted] = useState(false);
  const [mobileWishlistLoading, setMobileWishlistLoading] = useState(false);
  // Mobile quantity selector
  const [mobileQty, setMobileQty] = useState(1);
  // Mobile description expand/collapse (collapsed by default)
  const [descExpanded, setDescExpanded] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchProduct = async () => {
      setLoading(true);
      setNotFound(false);
      try {
        // Step 1: Fetch product with category joins only. Public links may use
        // either the product UUID or its SEO slug.
        const query = supabase
          .from("products")
          .select(PRODUCT_QUERY)
          .eq("isActive", true);
        const { data, error } = await (UUID_RE.test(id)
          ? query.eq("id", id)
          : query.eq("slug", id)
        ).maybeSingle();

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

        // Step 5: Adapt to UI shape, including canonical purchase availability.
        const adapted = adaptProduct(normalised);
        setProduct(adapted);
        setMobileQty(1);
        setProductDescription(
          typeof data.description === "string" ? data.description : "",
        );
        setProductSellerId(data.sellerId ?? null);

        // Sync mobile wishlist state
        if (user?.id) {
          supabase
            .from("wishlists")
            .select("productIds")
            .eq("userId", user.id)
            .maybeSingle()
            .then(({ data: wl }) => {
              const ids: string[] = (wl as { productIds?: string[] } | null)?.productIds ?? [];
              setMobileWishlisted(ids.includes(adapted.id));
            });
        }

        // Track product page view for analytics
        trackProductView(adapted.id, adapted.title, adapted.price);

        // Capture category slug for breadcrumb link
        const rawCat = Array.isArray(data.category) ? data.category[0] : data.category;
        setProductCategorySlug((rawCat as { slug?: string } | null)?.slug ?? null);

        // Use real product images
        const imgs = Array.isArray(data.images) && data.images.length > 0
          ? data.images
          : [adapted.image];
        setGalleryImages(imgs);

        // Fetch related products from the same category. These must satisfy the
        // same sellability contract as the marketplace grids and checkout.
        if (data.categoryId) {
          const { data: relData } = await supabase
            .from("products")
            .select(PRODUCT_QUERY)
            .eq("isActive", true)
            .eq("isApproved", true)
            .eq("listingStatus", "active")
            .or("listingContext.eq.service,stockQuantity.gt.0")
            .eq("categoryId", data.categoryId)
            .neq("id", data.id)
            .order("rating", { ascending: false })
            .limit(3);

          if (relData && relData.length > 0) {
            const relSellerIds = [...new Set(relData.map((p: Record<string, unknown>) => p.sellerId as string).filter(Boolean))];
            const relSellerMap = await fetchSellerMap(relSellerIds);

            const normRel = relData.map((p: Record<string, unknown>) => ({
              ...p,
              category: Array.isArray(p.category) ? p.category[0] : p.category,
              subcategory: Array.isArray(p.subcategory) ? p.subcategory[0] : p.subcategory,
              seller: relSellerMap.get(p.sellerId as string) ?? null,
            }));
            setRelated(adaptProducts(normRel as unknown as DBProduct[]));
          } else {
            setRelated([]);
          }
        }

        // Fetch seller's public active listing count, store slug, and join date.
        if (data.sellerId) {
          const [countRes, storeRes, joinRes] = await Promise.all([
            supabase
              .from("products")
              .select("id", { count: "exact", head: true })
              .eq("sellerId", data.sellerId)
              .eq("isActive", true)
              .eq("isApproved", true)
              .eq("listingStatus", "active")
              .or("listingContext.eq.service,stockQuantity.gt.0"),
            supabase
              .from("seller_stores")
              .select("storeSlug")
              .eq("userId", data.sellerId)
              .eq("isActive", true)
              .maybeSingle(),
            supabase
              .from("seller_profiles_public")
              .select("createdAt")
              .eq("userId", data.sellerId)
              .maybeSingle(),
          ]);
          setSellerListingCount(countRes.count ?? 0);
          setSellerStoreSlug((storeRes.data as { storeSlug?: string } | null)?.storeSlug ?? null);
          setSellerJoinDate((joinRes.data as { createdAt?: string } | null)?.createdAt ?? null);
        }
      } catch (err) {
        console.error("Error fetching product:", err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id, user?.id]);

  if (loading) {
    return (
      <MainLayout>
        <main id="main-content" className="pt-4 md:pt-28 pb-16">
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
        <div className="pt-4 md:pt-28 text-center">
          <h1 className="text-2xl font-display font-bold text-foreground">Product Not Found</h1>
          <Link to="/catalog" className="text-primary hover:underline mt-4 inline-block">
            Back to Catalog
          </Link>
        </div>
      </MainLayout>
    );
  }

  const handleReportSubmit = async () => {
    if (!user || !reportReason) return;
    setReportLoading(true);
    try {
      const { error } = await supabase.from("reported_listings").insert({
        productId: product.id,
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

  const getOrCreateConversation = async (): Promise<string | null> => {
    if (!user?.id || !productSellerId) return null;
    const res = await authorizedFetch("/.netlify/functions/conversation-get-or-create", {
      method: "POST",
      body: JSON.stringify({ productId: product.id, sellerId: productSellerId }),
    });
    const json = await res.json().catch(() => ({})) as { conversationId?: string; error?: string };
    if (!res.ok) {
      throw new Error(json.error ?? `HTTP ${res.status}`);
    }
    return typeof json.conversationId === "string" ? json.conversationId : null;
  };

  /** Guards against unauthenticated access and resolves/creates the conversation id. */
  const requireConversation = async (
    action: "message",
    context: import('@/store/authPromptStore').AuthPromptContext = null,
  ): Promise<string | null> => {
    if (!user) { promptAuth(context); return null; }
    setCtaLoadingAction(action);
    try {
      const convId = await getOrCreateConversation();
      if (!convId) toast({ title: "Could not open conversation", variant: "destructive" });
      return convId;
    } catch (err) {
      console.error("Failed to open conversation:", err);
      toast({
        title: "Unable to open chat",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
      return null;
    } finally {
      setCtaLoadingAction(null);
    }
  };

  const handleMobileToggleWishlist = async () => {
    if (!user) { promptAuth('save'); return; }
    setMobileWishlistLoading(true);
    try {
      const { data: wl } = await supabase
        .from("wishlists")
        .select("productIds")
        .eq("userId", user.id)
        .maybeSingle();
      const existing: string[] = (wl as { productIds?: string[] } | null)?.productIds ?? [];
      const alreadyIn = existing.includes(product.id);
      const newIds = alreadyIn ? existing.filter((x) => x !== product.id) : [...existing, product.id];
      if (wl) {
        await supabase.from("wishlists").update({ productIds: newIds }).eq("userId", user.id);
      } else {
        await supabase.from("wishlists").insert({ userId: user.id, productIds: newIds });
      }
      setMobileWishlisted(!alreadyIn);
      toast({ title: alreadyIn ? "Removed from wishlist" : "Added to wishlist" });
    } catch {
      toast({ title: "Wishlist error", variant: "destructive" });
    } finally {
      setMobileWishlistLoading(false);
    }
  };

  const handleBuyNow = () => {
    if (product.isAvailable === false) {
      toast({
        title: "Listing unavailable",
        description: product.availabilityMessage || "This listing is not currently available for purchase.",
        variant: "destructive",
      });
      return;
    }
    if (!user) { promptAuth('buy'); return; }
    trackAddToCart(product.id, product.title, product.price);
    addToCart(product, mobileQty);
    navigate("/checkout");
  };

  const handleMessage = async () => {
    const convId = await requireConversation("message", "message");
    if (convId) {
      navigate(`/inbox/${convId}`);
    }
  };

  // True when the logged-in user is the seller/owner of this product
  const isMobileCtaVisible = !!(productSellerId && (!user || user.id !== productSellerId));
  const mobileBottomNavOffset = "calc(var(--mob-nav-h, 68px) + env(safe-area-inset-bottom, 0px))";
  const mobileQuantityLimit = Math.max(1, Math.min(10, product.maxPurchaseQuantity ?? 10));

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
  // Always append the brand tagline if not already present anywhere in the text
  const BRAND_TAGLINE = " Sell with 0% commission on Loadify Market.";
  const ogDescription = seoDescription.toLowerCase().includes("0% commission")
    ? seoDescription
    : seoDescription.trimEnd() + BRAND_TAGLINE;
  const primaryImageCandidate = galleryImages.find((img) => typeof img === "string" && img.trim().length > 0) || product.image;
  const seoImage = toAbsolutePublicUrl(primaryImageCandidate) ?? DEFAULT_OG_IMAGE;
  const encodedProductUrl = encodeURIComponent(currentProductUrl);
  const whatsappText = `Check out this product on Loadify Market: ${product.title} — £${product.price.toLocaleString("en-GB")} ${currentProductUrl}`;
  const encodedWhatsAppText = encodeURIComponent(whatsappText);
  const supportsNativeShare = canShare();

  // Build Product JSON-LD for rich snippets
  const productJsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: normalisedDescription || seoDescription,
    image: seoImage,
    url: canonicalProductUrl,
    offers: {
      "@type": "Offer",
      price: product.price.toFixed(2),
      priceCurrency: "GBP",
      availability: product.isAvailable === false
        ? "https://schema.org/OutOfStock"
        : "https://schema.org/InStock",
      seller: {
        "@type": "Organization",
        name: product.seller || "Loadify Market Seller",
      },
    },
  };

  const handleShareFacebook = () => {
    trackShareProduct("facebook", product.id, product.title);
    const webSharerUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedProductUrl}`;
    if (isCapacitorNative()) {
      // On Android APK use an Intent URL so Android routes directly into the
      // installed Facebook app (where the user is already logged in).
      // If Facebook is not installed the browser_fallback_url opens the web sharer.
      const fallback = encodeURIComponent(webSharerUrl);
      const intentUrl =
        `intent://www.facebook.com/sharer/sharer.php?u=${encodedProductUrl}` +
        `#Intent;package=com.facebook.katana;scheme=https;` +
        `S.browser_fallback_url=${fallback};end`;
      window.open(intentUrl, "_blank");
    } else {
      window.open(webSharerUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleShareMessenger = () => {
    trackShareProduct("messenger", product.id, product.title);
    const messengerUrl = isCapacitorNative()
      ? `fb-messenger://share?link=${encodedProductUrl}`
      : `https://www.facebook.com/dialog/send?link=${encodedProductUrl}&redirect_uri=${encodedProductUrl}`;
    window.open(messengerUrl, "_blank", "noopener,noreferrer");
  };

  const handleShareWhatsApp = () => {
    trackShareProduct("whatsapp", product.id, product.title);
    const url = `https://wa.me/?text=${encodedWhatsAppText}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleCopyLink = async () => {
    try {
      await copyToClipboard(currentProductUrl);
      trackCopyLink(product.id);
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
      trackShareProduct("instagram", product.id, product.title);
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
      trackShareProduct("tiktok", product.id, product.title);
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
      await shareProduct({ id: product.id, title: product.title, price: product.price });
      trackShareProduct("native", product.id, product.title);
    } catch {
      // User cancellation is non-fatal; no toast needed.
    }
  };

  return (
    <MainLayout>
      <SEO
        title={`${product.title} — £${product.price.toLocaleString("en-GB")}`}
        description={ogDescription}
        canonical={canonicalProductUrl}
        ogImage={seoImage}
        ogType="product"
        ogPrice={product.price != null ? product.price.toFixed(2) : undefined}
        ogPriceCurrency="GBP"
        structuredData={productJsonLd}
      />

      {/* ── Mobile overlay header (back + share + heart) — hidden on desktop ── */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 z-[9998] flex items-center justify-between px-4"
        style={{
          paddingTop: "calc(0.625rem + env(safe-area-inset-top, 0px))",
          paddingBottom: "0.625rem",
          background: "rgba(7,8,11,0.85)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl active:bg-white/10 transition-colors"
          style={{ background: "rgba(255,255,255,0.10)" }}
          aria-label="Back"
        >
          <ArrowLeft style={{ width: "20px", height: "20px", color: "rgba(255,255,255,1)" }} />
        </button>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={handleNativeShare}
            className="p-2 rounded-xl active:bg-white/10 transition-colors"
            style={{ background: "rgba(255,255,255,0.10)" }}
            aria-label="Share"
          >
            <Share2 style={{ width: "20px", height: "20px", color: "rgba(255,255,255,1)" }} />
          </button>
          <button
            onClick={() => void handleMobileToggleWishlist()}
            disabled={mobileWishlistLoading}
            className="p-2 rounded-xl active:bg-white/10 transition-colors"
            style={{ background: "rgba(255,255,255,0.10)" }}
            aria-label={mobileWishlisted ? "Remove from wishlist" : "Add to wishlist"}
          >
            <Heart
              style={{
                width: "20px",
                height: "20px",
                color: mobileWishlisted ? "rgba(239,68,68,1)" : "rgba(255,255,255,1)",
                fill: mobileWishlisted ? "rgba(239,68,68,1)" : "none",
              }}
            />
          </button>
        </div>
      </div>

      <main id="main-content" className="pt-0 md:pt-28 pb-16">
        <div className="container mx-auto px-4">
          {/* Breadcrumb — desktop only */}
          <div className="hidden md:block">
            {(() => {
              const isClearance = navState.flow === "clearance" || navState.flow === "deals";
              const sectionLabel = isClearance
                ? (navState.fromLabel ?? "Deals")
                : "Catalog";
              const sectionPath = isClearance
                ? (navState.from ?? "/deals")
                : "/catalog";
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
          </div>

          {/* Main content — mobile: Gallery → mobile info → Desc/Reviews  |  desktop: 2-column grid */}
          <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[1fr_420px]">
            {/* Gallery — edge-to-edge on mobile (overlay header sits above it), in-flow on desktop */}
            <div className="order-1 lg:col-start-1 lg:row-start-1 -mx-4 md:mx-0">
              <ProductGallery images={galleryImages} title={product.title} />
            </div>

            {/* ── Mobile-only inline product info card ── */}
            {isMobileCtaVisible && (
              <div
                className="order-2 md:hidden"
                style={{
                  background: "rgba(18,18,26,1)",
                  borderRadius: "16px",
                  margin: "0 -16px",
                  padding: "20px 16px",
                  borderTop: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                <h1 style={{ fontSize: "20px", fontWeight: 800, color: "rgba(255,255,255,1)", lineHeight: 1.3, marginBottom: "8px" }}>
                  {product.title}
                </h1>

                <p style={{ fontSize: "26px", fontWeight: 800, color: "rgba(255,255,255,1)", marginBottom: "4px" }}>
                  £{product.price.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                </p>
                <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.45)", fontWeight: 500, marginBottom: "4px" }}>
                  Shipping calculated at checkout
                </p>
                <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.30)", marginBottom: "16px" }}>
                  Secure payments via Stripe
                </p>

                <div style={{ height: "1px", background: "rgba(255,255,255,0.07)" }} />

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "14px 0",
                    borderBottom: "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  <span style={{ fontSize: "14px", color: "rgba(255,255,255,0.60)" }}>Condition</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <span style={{ fontSize: "14px", fontWeight: 600, color: "rgba(255,255,255,1)" }}>{product.condition}</span>
                    <ChevronRight style={{ width: "16px", height: "16px", color: "rgba(255,255,255,0.30)" }} />
                  </div>
                </div>

                {product.location ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "14px 0",
                      borderBottom: "1px solid rgba(255,255,255,0.07)",
                    }}
                  >
                    <span style={{ fontSize: "14px", color: "rgba(255,255,255,0.60)" }}>Location</span>
                    <span style={{ fontSize: "14px", fontWeight: 600, color: "rgba(255,255,255,1)" }}>{product.location}</span>
                  </div>
                ) : null}

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "14px 0",
                    borderBottom: "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  <span style={{ fontSize: "14px", color: "rgba(255,255,255,0.60)" }}>Seller</span>
                  <span style={{ fontSize: "14px", fontWeight: 600, color: "rgba(255,255,255,1)" }}>{product.seller}</span>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "14px 0",
                    borderBottom: "1px solid rgba(255,255,255,0.07)",
                    marginBottom: "20px",
                  }}
                >
                  <span style={{ fontSize: "14px", color: "rgba(255,255,255,0.60)" }}>Quantity</span>
                  <select
                    value={mobileQty}
                    onChange={(e) => setMobileQty(Number(e.target.value))}
                    disabled={product.isAvailable === false}
                    style={{
                      background: "rgba(255,255,255,0.08)",
                      border: "1px solid rgba(255,255,255,0.15)",
                      borderRadius: "8px",
                      color: "rgba(255,255,255,1)",
                      fontSize: "14px",
                      fontWeight: 600,
                      padding: "6px 10px",
                      outline: "none",
                      cursor: product.isAvailable === false ? "not-allowed" : "pointer",
                      opacity: product.isAvailable === false ? 0.5 : 1,
                    }}
                    aria-label="Quantity"
                  >
                    {Array.from({ length: mobileQuantityLimit }, (_, index) => index + 1).map((n) => (
                      <option key={n} value={n} className="bg-surface">{n}</option>
                    ))}
                  </select>
                </div>

                {(product.views ?? 0) > 0 && (
                  <p
                    style={{ fontSize: "12px", color: "rgba(255,255,255,0.45)", marginBottom: "12px", display: "flex", alignItems: "center", gap: "5px" }}
                    aria-label={`${product.views.toLocaleString()} ${product.views === 1 ? "view" : "views"}`}
                  >
                    <span aria-hidden="true">👁️</span>
                    <span aria-hidden="true">{product.views.toLocaleString()} {product.views === 1 ? "view" : "views"}</span>
                  </p>
                )}

                {product.isAvailable === false && (
                  <div className="flex items-center justify-center gap-2 rounded-xl bg-primary/15 border border-primary/40 py-3 px-4 mb-3" role="status">
                    <span className="text-primary text-sm font-semibold">
                      {product.availabilityMessage || "This listing is not currently available for purchase."}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="order-2 hidden md:block lg:col-start-2 lg:row-start-1 lg:row-span-2 space-y-6">
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
                    onShareMessenger={handleShareMessenger}
                    onShareWhatsApp={handleShareWhatsApp}
                    onShareInstagram={handleShareInstagram}
                    onShareTikTok={handleShareTikTok}
                    onCopyLink={handleCopyLink}
                    onNativeShare={handleNativeShare}
                    supportsNativeShare={supportsNativeShare}
                    onMessageSeller={() => void handleMessage()}
                    contactActionLoading={ctaLoadingAction}
                  />
                </div>

                <SellerCard
                  name={product.seller}
                  verified={product.sellerVerified}
                  rating={product.rating}
                  location={product.location}
                  totalListings={sellerListingCount}
                  storeSlug={sellerStoreSlug}
                  joinDate={sellerJoinDate}
                />

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

            <div className="order-3 lg:col-start-1 lg:row-start-2 space-y-8">
              {productDescription.trim().length > 0 && (
                <div className="bg-card rounded-xl border border-border p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="font-display text-lg font-semibold text-foreground">Description</h2>
                    <button
                      className="md:hidden text-xs font-medium"
                      style={{ color: "rgba(255,255,255,0.50)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                      onClick={() => setDescExpanded((d) => !d)}
                    >
                      {descExpanded ? "Show less" : "Show more"}
                    </button>
                  </div>
                  <div
                    className={`text-sm text-muted-foreground leading-relaxed whitespace-pre-line md:max-h-none md:overflow-visible ${!descExpanded ? "overflow-hidden max-h-[72px]" : ""}`}
                  >
                    {productDescription.trim()}
                  </div>
                </div>
              )}

              <div className="hidden md:block">
                <ProductReviews
                  productId={product.id}
                  productRating={product.rating ?? 0}
                  reviewCount={product.reviewCount ?? 0}
                />
              </div>

            </div>
          </div>

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

      {isMobileCtaVisible && (
        <div
          className="md:hidden fixed left-0 right-0 z-[9998]"
          style={{
            bottom: mobileBottomNavOffset,
            background: "rgba(7,8,11,0.97)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            padding: "12px 16px",
            pointerEvents: "auto",
          }}
        >
          {product.isAvailable === false ? (
            <div
              style={{
                textAlign: "center",
                padding: "14px",
                borderRadius: "12px",
                background: "rgba(212,175,55,0.10)",
                border: "1px solid rgba(212,175,55,0.25)",
                color: "rgba(212,175,55,1)",
                fontSize: "14px",
                fontWeight: 700,
              }}
              role="status"
            >
              {product.availabilityMessage || "This listing is not currently available for purchase."}
            </div>
          ) : (
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => void handleMessage()}
                disabled={ctaLoadingAction !== null}
                aria-busy={ctaLoadingAction === "message"}
                style={{
                  flex: 1,
                  padding: "14px 8px",
                  borderRadius: "12px",
                  background: "rgba(255,255,255,0.07)",
                  color: "rgba(255,255,255,1)",
                  fontSize: "13px",
                  fontWeight: 700,
                  border: "1px solid rgba(255,255,255,0.15)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "5px",
                }}
                className="active:bg-white/10 transition-colors disabled:opacity-50"
                aria-label="Message seller"
              >
                {ctaLoadingAction === "message" ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Opening…
                  </>
                ) : (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                    Message
                  </>
                )}
              </button>

              <button
                onClick={handleBuyNow}
                style={{
                  flex: 2,
                  padding: "14px 8px",
                  borderRadius: "12px",
                  background: "rgba(212,175,55,1)",
                  color: "rgba(18,26,43,1)",
                  fontSize: "14px",
                  fontWeight: 800,
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                }}
                className="active:opacity-80 transition-opacity"
                aria-label="Buy now"
              >
                <ShoppingCart style={{ width: "16px", height: "16px" }} />
                Buy Now
              </button>
            </div>
          )}
        </div>
      )}

    </MainLayout>
  );
};

export default ProductDetail;
