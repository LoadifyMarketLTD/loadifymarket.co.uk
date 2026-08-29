import { MapPin, Star, Settings, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store";
import { productThumbnail } from "@/lib/imageOptimization";
import NativeImg from "@/components/NativeImg";
import ProductImagePlaceholder from "@/components/ProductImagePlaceholder";

export interface Product {
  id: string;
  title: string;
  image: string;
  price: number;
  originalPrice?: number;
  category: string;
  subcategory: string;
  condition: "New" | "Like New" | "Mixed" | "Unchecked";
  location: string;
  seller: string;
  /** Seller's user ID — used for owner-awareness CTAs */
  sellerId?: string;
  sellerVerified: boolean;
  unitCount: number;
  rating: number;
  reviewCount?: number;
  views: number;
  listed: string;
  /** Canonical purchase availability from the underlying listing state. */
  isAvailable?: boolean;
  /** User-facing reason when the listing is not currently purchasable. */
  availabilityMessage?: string;
  /** Current maximum purchasable quantity for physical listings; undefined for services. */
  maxPurchaseQuantity?: number;
}

const conditionColor: Record<string, string> = {
  New: "bg-[#F4F6F8] text-[#35516F] border-[#DCE3EA]",
  "Like New": "bg-[#F6F4F1] text-[#62584E] border-[#E5DED5]",
  Mixed: "bg-[#F4F4F5] text-[#52525B] border-[#E4E4E7]",
  Unchecked: "bg-[#F7F4F0] text-[#6B5F54] border-[#E9E1D8]",
};

const ProductCard = ({ product, linkState, theme = "light" }: { product: Product; linkState?: Record<string, unknown>; theme?: "default" | "light" }) => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const isOwner = !!user && !!product.sellerId && user.id === product.sellerId;
  const light = theme === "light";
  const hasAuthoritativeStock = typeof product.maxPurchaseQuantity === "number";
  const hasRating = typeof product.rating === "number" && product.rating > 0;

  const handleCardClick = (e: React.MouseEvent | React.KeyboardEvent) => {
    const target = e.target instanceof Element ? e.target : null;
    if (!target) return;
    if (target.closest("a") || target.closest("button")) return;
    if (isOwner) {
      navigate(`/seller/products/${product.id}/edit`);
    } else {
      navigate(`/product/${product.id}`, { state: linkState ?? undefined });
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      className={`group overflow-hidden rounded-2xl border transition-all duration-300 cursor-pointer ${
        light
          ? "bg-[#FEFEFD] border-[#E3E7EC] shadow-[0_8px_24px_rgba(10,35,79,0.045)] hover:-translate-y-0.5 hover:border-[#CBD5E1] hover:shadow-[0_16px_36px_rgba(10,35,79,0.09)]"
          : "bg-card border-border hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_14px_30px_rgba(0,0,0,0.12)]"
      }`}
      onClick={handleCardClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleCardClick(e); } }}
    >
      <div className={`relative aspect-[4/3] overflow-hidden ${light ? "bg-[#F3F5F7]" : "bg-muted"}`}>
        <NativeImg
          src={productThumbnail(product.image)}
          alt={product.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.025]"
          loading="lazy"
          fallback={
            <div className="w-full h-full flex items-center justify-center">
              <ProductImagePlaceholder theme="light" />
            </div>
          }
        />
        <div className={`absolute top-3 right-3 rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-wide backdrop-blur-sm ${conditionColor[product.condition] || ""}`}>
          {product.condition}
        </div>
        {isOwner && (
          <div className="absolute top-3 left-3">
            <span className="rounded-full border border-white/30 bg-[#0A234F]/90 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">
              Your listing
            </span>
          </div>
        )}
      </div>

      <div className="p-4.5 px-4 py-4">
        <div className="space-y-2.5">
          <span className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${light ? "text-[#64748B]" : "text-muted-foreground"}`}>
            {product.category}
          </span>

          <h3 className={`min-h-[2.75rem] line-clamp-2 font-display text-[15px] font-semibold leading-[1.45] ${light ? "text-[#0A234F]" : "text-foreground"}`}>
            {product.title}
          </h3>

          <div className="flex items-center justify-between gap-3 pt-0.5">
            <span className={`text-[22px] font-bold tracking-[-0.025em] ${light ? "text-[#0A234F]" : "text-foreground"}`}>
              £{product.price.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            {hasAuthoritativeStock && product.maxPurchaseQuantity! > 0 && (
              <span className={`inline-flex items-center gap-1.5 whitespace-nowrap text-[11px] font-medium ${light ? "text-[#5B6777]" : "text-muted-foreground"}`}>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                {product.maxPurchaseQuantity} available
              </span>
            )}
          </div>

          {product.location && (
            <div className={`flex items-center gap-1.5 text-[11px] ${light ? "text-[#7A8492]" : "text-muted-foreground"}`}>
              <MapPin className="h-3.5 w-3.5" />
              <span className="truncate">{product.location}</span>
            </div>
          )}
        </div>

        <div className={`mt-3.5 border-t pt-3 ${light ? "border-[#E8EBEF]" : "border-border"}`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-1.5">
              <span className={`truncate text-[11px] font-medium ${light ? "text-[#243B5A]" : "text-foreground"}`}>
                {product.seller}
              </span>
              {product.sellerVerified && (
                <span
                  className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${
                    light
                      ? "border-[#D7E0E9] bg-[#F5F7FA] text-[#3E5B78]"
                      : "border-primary/30 bg-primary/10 text-primary"
                  }`}
                  title="Verified seller"
                  aria-label="Verified seller"
                >
                  <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Verified
                </span>
              )}
            </div>

            {hasRating ? (
              <div className="flex shrink-0 items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-[#C99422] text-[#C99422]" />
                <span className={`text-[11px] font-semibold ${light ? "text-[#243B5A]" : "text-foreground"}`}>{product.rating.toFixed(1)}</span>
                {(product.reviewCount ?? 0) > 0 && (
                  <span className={`text-[10px] ${light ? "text-[#8B95A2]" : "text-muted-foreground"}`}>({product.reviewCount})</span>
                )}
              </div>
            ) : (
              <span className={`shrink-0 text-[10px] ${light ? "text-[#8B95A2]" : "text-muted-foreground"}`}>No reviews yet</span>
            )}
          </div>

          {isOwner ? (
            <Link to={`/seller/products/${product.id}/edit`} className="mt-3 block">
              <Button variant="outline" className="w-full text-sm" size="sm">
                <Settings className="mr-1.5 h-3.5 w-3.5" /> Manage listing
              </Button>
            </Link>
          ) : (
            <Link
              to={`/product/${product.id}`}
              state={linkState ?? undefined}
              className={`mt-3 flex items-center justify-between rounded-lg py-1.5 text-[12px] font-semibold transition-colors ${
                light
                  ? "text-[#0A234F] hover:text-[#1D57D8]"
                  : "text-foreground hover:text-primary"
              }`}
            >
              <span>View product</span>
              <ArrowUpRight className={`h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ${light ? "text-[#C99422]" : "text-primary"}`} />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
