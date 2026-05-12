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
import { Flag, Tag, ShoppingCart, ArrowLeft, Share2, Heart, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { copyToClipboard } from "@/lib/clipboard";
import { shareProduct, canShare } from "@/lib/shareProduct";
import { isCapacitorNative } from "@/lib/capacitorUtils";
import MainLayout from "@/layouts/MainLayout";
import SEO from "@/components/SEO";
import MakeOfferSheet from "@/components/MakeOfferSheet";
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
  const [ctaLoadingAction, setCtaLoadingAction] = useState<"message" | "offer" | null>(null);
  const [offerConvId, setOfferConvId] = useState<string | null>(null);
  const [offerOpen, setOfferOpen] = useState(false);
  // Listing availability state (active | reserved | sold)
  const [listingStatus, setListingStatus] = useState<string>("active");
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
        setListingStatus((data as Record<string, unknown>).listingStatus as string ?? "active");

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

        // Fetch seller's active listing count, store slug, and join date
        if (data.sellerId) {
          const [countRes, storeRes, joinRes] = await Promise.all([
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
            supabase
              .from("seller_profiles")
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

  /** Guards against unauthenticated access and resolves/creates the conversation id. */
  const requireConversation = async (
    action: "message" | "offer",
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
    if (!product) return;
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
    if (!user) { promptAuth('buy'); return; }
    if (!product) return;
    trackAddToCart(product.id, product.title, product.price);
    addToCart(product, mobileQty);
    navigate("/checkout");
  };

  const handleMakeOffer = async () => {
    const convId = await requireConversation("offer", "offer");
    if (convId) {
      setOfferConvId(convId);
      setOfferOpen(true);
    }
  };

  const handleMessage = async () => {
    const convId = await requireConversation("message", "message");
    if (convId) {
      navigate(`/inbox/${convId}`);
    }
  };

  // True when the logged-in user is the seller/owner of this product
  const isMobileCtaVisible = !!(product && productSellerId && (!user || user.id !== productSellerId));
  const mobileBottomNavOffset = "calc(var(--mob-nav-h, 68px) + env(safe-area-inset-bottom, 0px))";

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
      availability: "https://schema.org/InStock",
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
          <ArrowLeft style={{ width: "20px", height: "20px", color: "#FFFFFF" }} />
        </button>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={handleNativeShare}
            className="p-2 rounded-xl active:bg-white/10 transition-colors"
            style={{ background: "rgba(255,255,255,0.10)" }}
            aria-label="Share"
          >
            <Share2 style={{ width: "20px", height: "20px", color: "#FFFFFF" }} />
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
                color: mobileWishlisted ? "#EF4444" : "#FFFFFF",
                fill: mobileWishlisted ? "#EF4444" : "none",
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
                  background: "#12121A",
                  borderRadius: "16px",
                  margin: "0 -16px",
                  padding: "20px 16px",
                  borderTop: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                {/* Title */}
                <h1 style={{ fontSize: "20px", fontWeight: 800, color: "#FFFFFF", lineHeight: 1.3, marginBottom: "8px" }}>
                  {product.title}
                </h1>

                {/* Price */}
                <p style={{ fontSize: "26px", fontWeight: 800, color: "#FFFFFF", marginBottom: "4px" }}>
                  £{product.price.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                </p>
                <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.45)", fontWeight: 500, marginBottom: "4px" }}>
                  Shipping calculated at checkout
                </p>
                <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.30)", marginBottom: "16px" }}>
                  Secure payments via Stripe
                </p>

                <div style={{ height: "1px", background: "rgba(255,255,255,0.07)" }} />

                {/* Condition row */}
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
                    <span style={{ fontSize: "14px", fontWeight: 600, color: "#FFFFFF" }}>{product.condition}</span>
                    <ChevronRight style={{ width: "16px", height: "16px", color: "rgba(255,255,255,0.30)" }} />
                  </div>
                </div>

                {/* Location row */}
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
                    <span style={{ fontSize: "14px", fontWeight: 600, color: "#FFFFFF" }}>{product.location}</span>
                  </div>
                ) : null}

                {/* Seller row */}
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
                  <span style={{ fontSize: "14px", fontWeight: 600, color: "#FFFFFF" }}>{product.seller}</span>
                </div>

                {/* Quantity row */}
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
                    style={{
                      background: "rgba(255,255,255,0.08)",
                      border: "1px solid rgba(255,255,255,0.15)",
                      borderRadius: "8px",
                      color: "#FFFFFF",
                      fontSize: "14px",
                      fontWeight: 600,
                      padding: "6px 10px",
                      outline: "none",
                      cursor: "pointer",
                    }}
                    aria-label="Quantity"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                      <option key={n} value={n} style={{ background: "#12121A" }}>{n}</option>
                    ))}
                  </select>
                </div>

                {/* Activity indicator */}
                {(product.views ?? 0) > 0 && (
                  <p
                    style={{ fontSize: "12px", color: "rgba(255,255,255,0.45)", marginBottom: "12px", display: "flex", alignItems: "center", gap: "5px" }}
                    aria-label={`${product.views.toLocaleString()} ${product.views === 1 ? "view" : "views"}`}
                  >
                    <span aria-hidden="true">👁️</span>
                    <span aria-hidden="true">{product.views.toLocaleString()} {product.views === 1 ? "view" : "views"}</span>
                  </p>
                )}

                {listingStatus === "reserved" && (
                  <div className="flex items-center justify-center gap-2 rounded-xl bg-amber-500/15 border border-amber-500/25 py-3 px-4 mb-3">
                    <span className="text-amber-400 text-sm font-semibold">⏳ Reserved — awaiting payment</span>
                  </div>
                )}
                {listingStatus === "sold" && (
                  <div className="flex items-center justify-center gap-2 rounded-xl bg-red-500/15 border border-red-500/25 py-3 px-4 mb-3">
                    <span className="text-red-400 text-sm font-semibold">✕ This item has been sold</span>
                  </div>
                )}
              </div>
            )}

            {/* Info + Seller — hidden on mobile (replaced by inline section above), right column on desktop */}
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
                    onMakeOffer={() => void handleMakeOffer()}
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
                  {/* Desktop: always visible. Mobile: collapsed until expanded. */}
                  <div
                    className={`text-sm text-muted-foreground leading-relaxed whitespace-pre-line md:max-h-none md:overflow-visible ${!descExpanded ? "overflow-hidden max-h-[72px]" : ""}`}
                  >
                    {productDescription.trim()}
                  </div>
                </div>
              )}

              {/* Reviews — desktop only (hidden on mobile per product page spec) */}
              <div className="hidden md:block">
                <ProductReviews
                  productId={id ?? ""}
                  productRating={product.rating ?? 0}
                  reviewCount={product.reviewCount ?? 0}
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

      {/* ── Mobile sticky bottom CTA — hidden on desktop ─────────────────────── */}
      {isMobileCtaVisible && (
        <div
          className="md:hidden fixed left-0 right-0 z-[9998]"
          style={{
            // Keep the CTA above the mobile bottom nav so its touch targets
            // remain clickable on small screens and inside the APK webview.
            bottom: mobileBottomNavOffset,
            background: "rgba(7,8,11,0.97)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            padding: "12px 16px",
            pointerEvents: "auto",
          }}
        >
          {listingStatus === "sold" ? (
            <div
              style={{
                textAlign: "center",
                padding: "14px",
                borderRadius: "12px",
                background: "rgba(239,68,68,0.10)",
                border: "1px solid rgba(239,68,68,0.25)",
                color: "#F87171",
                fontSize: "14px",
                fontWeight: 700,
              }}
            >
              ✕ This item has been sold
            </div>
          ) : listingStatus === "reserved" ? (
            <div
              style={{
                textAlign: "center",
                padding: "14px",
                borderRadius: "12px",
                background: "rgba(245,185,66,0.10)",
                border: "1px solid rgba(245,185,66,0.25)",
                color: "#F5B942",
                fontSize: "14px",
                fontWeight: 700,
              }}
            >
              ⏳ Reserved — awaiting payment
            </div>
          ) : (
            <div style={{ display: "flex", gap: "8px" }}>
              {/* Message */}
              <button
                onClick={() => void handleMessage()}
                disabled={ctaLoadingAction !== null}
                aria-busy={ctaLoadingAction === "message"}
                style={{
                  flex: 1,
                  padding: "14px 8px",
                  borderRadius: "12px",
                  background: "rgba(255,255,255,0.07)",
                  color: "#FFFFFF",
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

              {/* Make Offer */}
              <button
                onClick={() => void handleMakeOffer()}
                disabled={ctaLoadingAction !== null}
                aria-busy={ctaLoadingAction === "offer"}
                style={{
                  flex: 1,
                  padding: "14px 8px",
                  borderRadius: "12px",
                  background: "rgba(255,255,255,0.07)",
                  color: "#FFFFFF",
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
                aria-label="Make an offer"
              >
                {ctaLoadingAction === "offer" ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Preparing…
                  </>
                ) : (
                  <>
                    <Tag style={{ width: "14px", height: "14px" }} />
                    Offer
                  </>
                )}
              </button>

              {/* Buy Now */}
              <button
                onClick={handleBuyNow}
                style={{
                  flex: 2,
                  padding: "14px 8px",
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, #F5C842, #C8860A)",
                  color: "#0B0B0F",
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
