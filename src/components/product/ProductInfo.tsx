import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  MapPin,
  Truck,
  ShieldCheck,
  ShoppingCart,
  Heart,
  Settings,
  Share2,
  Loader2,
  MessageSquare,
  Store,
} from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import type { Product } from "@/components/catalog/ProductCard";
import { toast } from "@/hooks/use-toast";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store";
import PaymentMethodBadges from "@/components/PaymentMethodBadges";

interface ProductInfoProps {
  title: string;
  category: string;
  subcategory: string;
  condition: string;
  location: string;
  unitCount: number;
  views: number;
  listed: string;
  product: Product;
  /** The seller's user ID — used to detect if the logged-in user owns this product */
  sellerId?: string | null;
  onShareFacebook: () => void;
  onShareMessenger?: () => void;
  onShareWhatsApp: () => void;
  onShareInstagram?: () => void;
  onShareTikTok?: () => void;
  onCopyLink: () => void;
  onNativeShare?: () => void;
  supportsNativeShare?: boolean;
  onMessageSeller?: () => void;
  contactActionLoading?: "message" | null;
}

const conditionColor: Record<string, string> = {
  New: "bg-[#F4F6F8] text-[#35516F] border-[#DCE3EA]",
  "Like New": "bg-[#F6F4F1] text-[#62584E] border-[#E5DED5]",
  Mixed: "bg-[#F4F4F5] text-[#52525B] border-[#E4E4E7]",
  Unchecked: "bg-[#F7F4F0] text-[#6B5F54] border-[#E9E1D8]",
};

const ProductInfo = ({
  title,
  category,
  subcategory,
  condition,
  location,
  product,
  sellerId,
  onShareFacebook,
  onShareMessenger,
  onShareWhatsApp,
  onShareInstagram,
  onShareTikTok,
  onCopyLink,
  onNativeShare,
  supportsNativeShare = false,
  onMessageSeller,
  contactActionLoading = null,
}: ProductInfoProps) => {
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const normalizedCategory = (category ?? "").trim().toLowerCase();
  const normalizedSubcategory = (subcategory ?? "").trim().toLowerCase();
  const hasDistinctSubcategory =
    normalizedSubcategory.length > 0 && normalizedSubcategory !== normalizedCategory;

  const isOwner = !!(user && sellerId && user.id === sellerId);
  const isAvailable = product.isAvailable !== false;
  const availabilityMessage = product.availabilityMessage || "This listing is not currently available for purchase.";
  const availableQuantity = product.maxPurchaseQuantity;
  const formattedPrice = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(product.price);

  useEffect(() => {
    if (!user || !product.id) return;
    supabase
      .from("wishlists")
      .select("productIds")
      .eq("userId", user.id)
      .maybeSingle()
      .then(({ data }) => {
        const ids: string[] = data?.productIds ?? [];
        setIsWishlisted(ids.includes(product.id));
      });
  }, [user, product.id]);

  const handleToggleWishlist = async () => {
    if (!user) {
      navigate("/login");
      return;
    }
    setWishlistLoading(true);
    try {
      const { data: wl } = await supabase
        .from("wishlists")
        .select("productIds")
        .eq("userId", user.id)
        .maybeSingle();
      const existing: string[] = wl?.productIds ?? [];
      const alreadyIn = existing.includes(product.id);
      const newIds = alreadyIn
        ? existing.filter((id) => id !== product.id)
        : [...existing, product.id];

      if (wl) {
        await supabase
          .from("wishlists")
          .update({ productIds: newIds })
          .eq("userId", user.id);
      } else {
        await supabase
          .from("wishlists")
          .insert({ userId: user.id, productIds: newIds });
      }

      setIsWishlisted(!alreadyIn);
      toast({
        title: alreadyIn ? "Removed from wishlist" : "Added to wishlist",
        description: alreadyIn
          ? `${title} removed from your wishlist.`
          : `${title} saved to your wishlist.`,
      });
    } catch (err) {
      toast({
        title: "Wishlist error",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setWishlistLoading(false);
    }
  };

  const handleBuyNow = () => {
    if (!isAvailable) {
      toast({ title: "Listing unavailable", description: availabilityMessage, variant: "destructive" });
      return;
    }
    addToCart(product);
    navigate("/cart");
  };

  const handleAddToCart = () => {
    if (!isAvailable) {
      toast({ title: "Listing unavailable", description: availabilityMessage, variant: "destructive" });
      return;
    }
    addToCart(product);
    toast({
      title: "Added to basket",
      description: `${title} has been added to your basket.`,
    });
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/product/${product.id}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title,
          text: `Check out this product on Loadify Market: ${title}`,
          url: shareUrl,
        });
        return;
      }

      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Link copied",
        description: "Product link copied to clipboard.",
      });
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      toast({
        title: "Share failed",
        description: "Unable to share this product right now.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#64748B]">
          <Link to="/catalog" className="transition-colors hover:text-[#0A234F]">Catalog</Link>
          <span className="text-[#CBD3DD]">/</span>
          <span>{category}</span>
          {hasDistinctSubcategory && (
            <>
              <span className="text-[#CBD3DD]">/</span>
              <span>{subcategory}</span>
            </>
          )}
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-wide ${conditionColor[condition] || "bg-[#F4F6F8] text-[#526171] border-[#DCE3EA]"}`}>
          {condition}
        </span>
      </div>

      <div className="space-y-3">
        <h1 className="font-display text-2xl font-bold leading-[1.15] text-[#0A234F] sm:text-[2rem]">
          {title}
        </h1>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-display text-3xl font-extrabold tracking-[-0.03em] text-[#0A234F] sm:text-4xl">
              {formattedPrice}
            </p>
            <p className="mt-1 text-xs text-[#6F7B8A]">Secure checkout on Loadify Market</p>
          </div>

          <div className="flex items-center gap-2 text-xs font-medium text-[#5B6777]">
            <span className={`h-2 w-2 rounded-full ${isAvailable ? "bg-emerald-500" : "bg-slate-400"}`} aria-hidden="true" />
            <span>
              {isAvailable
                ? availableQuantity != null
                  ? `${availableQuantity} available`
                  : "Available"
                : "Unavailable"}
            </span>
          </div>
        </div>
      </div>

      {location && (
        <div className="flex items-center gap-2 text-sm text-[#687587]">
          <MapPin className="h-4 w-4 text-[#8B6B26]" />
          <span>{location}</span>
        </div>
      )}

      <div className="grid gap-2 border-y border-[#E3E7EC] py-4 sm:grid-cols-3">
        <div className="flex items-center gap-2 text-xs font-medium text-[#667384]">
          <ShieldCheck className="h-4 w-4 text-[#8B6B26]" />
          Dispute support
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-[#667384]">
          <Truck className="h-4 w-4 text-[#8B6B26]" />
          Seller-fulfilled delivery
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-[#667384]">
          <ShieldCheck className="h-4 w-4 text-[#8B6B26]" />
          Seller terms apply
        </div>
      </div>

      <div className="rounded-2xl border border-[#E1E6EC] bg-[#F8F9FB] p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0A234F] text-white">
            <Store className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#6C7A8B]">Sold & fulfilled by</p>
            <p className="mt-0.5 font-display text-sm font-bold text-[#0A234F]">{product.seller}</p>
            <p className="mt-1 text-xs leading-relaxed text-[#6F7B8A]">
              The seller supplies and fulfils this listing. Loadify provides the marketplace and secure checkout experience.
            </p>
          </div>
        </div>
      </div>

      {!isOwner && !isAvailable && (
        <div className="rounded-xl border border-[#D9C99C] bg-[#FCF9F1] px-4 py-3 text-sm font-semibold text-[#0A234F]" role="status">
          {availabilityMessage}
        </div>
      )}

      {isOwner ? (
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link to={`/seller/products/${product.id}/edit`} className="flex-1">
            <Button
              size="lg"
              className="w-full bg-[#0A234F] text-base font-bold text-white shadow-[0_10px_24px_rgba(10,35,79,0.12)] hover:bg-[#12386F]"
            >
              <Settings className="mr-2 h-5 w-5" /> Manage This Listing
            </Button>
          </Link>
          <Link to="/seller/products" className="shrink-0">
            <Button size="lg" variant="outline" className="w-full text-base text-[#0A234F]">
              All My Listings
            </Button>
          </Link>
          <Button
            size="lg"
            variant="outline"
            className="shrink-0 text-[#0A234F]"
            onClick={handleShare}
            aria-label="Share listing"
          >
            <Share2 className="h-5 w-5" />
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <Button
            size="lg"
            className="w-full bg-[#0A234F] text-base font-bold text-white shadow-[0_12px_26px_rgba(10,35,79,0.14)] hover:bg-[#12386F] disabled:opacity-50"
            onClick={handleAddToCart}
            disabled={!isAvailable}
          >
            <ShoppingCart className="mr-2 h-5 w-5" />
            Add to basket
          </Button>

          <div className="grid grid-cols-[1fr_auto_auto] gap-2">
            <Button
              size="lg"
              variant="outline"
              className="border-[#D7DEE7] font-semibold text-[#0A234F] hover:bg-[#F5F7FA]"
              onClick={handleBuyNow}
              disabled={!isAvailable}
            >
              Buy now <ArrowRight className="ml-2 h-4 w-4 text-[#8B6B26]" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={handleToggleWishlist}
              disabled={wishlistLoading}
              aria-label={isWishlisted ? "Remove from wishlist" : "Save product"}
              className={isWishlisted ? "text-rose-500 border-rose-300 hover:bg-rose-50" : "border-[#D7DEE7] text-[#0A234F] hover:bg-[#F5F7FA]"}
            >
              <Heart className={`h-5 w-5 ${isWishlisted ? "fill-rose-500" : ""}`} />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={handleShare}
              aria-label="Share product"
              className="border-[#D7DEE7] text-[#0A234F] hover:bg-[#F5F7FA]"
            >
              <Share2 className="h-5 w-5" />
            </Button>
          </div>

          {onMessageSeller && (
            <Button
              size="lg"
              variant="outline"
              className="w-full border-[#D7DEE7] text-base font-semibold text-[#0A234F] hover:bg-[#F5F7FA]"
              onClick={onMessageSeller}
              disabled={contactActionLoading !== null}
              aria-busy={contactActionLoading === "message"}
            >
              {contactActionLoading === "message" ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Opening…
                </>
              ) : (
                <>
                  <MessageSquare className="mr-2 h-5 w-5" />
                  Message seller
                </>
              )}
            </Button>
          )}
        </div>
      )}

      <PaymentMethodBadges size="sm" />

      <details className="group rounded-xl border border-[#E1E6EC] bg-[#FEFEFD] px-4 py-3">
        <summary className="cursor-pointer list-none text-xs font-semibold text-[#667384] hover:text-[#0A234F]">
          More sharing options
        </summary>
        <div className="mt-3 flex flex-wrap gap-2 border-t border-[#EEF1F4] pt-3">
          {supportsNativeShare && onNativeShare && (
            <Button size="sm" variant="outline" onClick={onNativeShare}>Share</Button>
          )}
          <Button size="sm" variant="outline" onClick={onShareFacebook}>Facebook</Button>
          {onShareMessenger && (
            <Button size="sm" variant="outline" onClick={onShareMessenger}>Messenger</Button>
          )}
          <Button size="sm" variant="outline" onClick={onShareWhatsApp}>WhatsApp</Button>
          {onShareInstagram && (
            <Button size="sm" variant="outline" onClick={onShareInstagram}>Instagram</Button>
          )}
          {onShareTikTok && (
            <Button size="sm" variant="outline" onClick={onShareTikTok}>TikTok</Button>
          )}
          <Button size="sm" variant="outline" onClick={onCopyLink}>Copy link</Button>
        </div>
      </details>
    </div>
  );
};

export default ProductInfo;
