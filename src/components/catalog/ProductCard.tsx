import { MapPin, Package, Star, Settings } from "lucide-react";
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
  New: "bg-success/10 text-success border-success/40",
  "Like New": "bg-violet-500/10 text-violet-700 border-violet-200",
  Mixed: "bg-primary/10 text-primary border-primary/40",
  Unchecked: "bg-purple-500/10 text-purple-700 border-purple-200",
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
      className={`group rounded-xl border hover:-translate-y-1 transition-all duration-300 overflow-hidden cursor-pointer ${light ? "bg-white border-slate-200 shadow-[0_8px_24px_rgba(15,35,70,0.06)] hover:border-[#1F5BD8]/35 hover:shadow-[0_16px_34px_rgba(15,35,70,0.12)]" : "bg-card border-border hover:border-primary/40 hover:shadow-[0_0_22px_rgba(212,175,55,0.14),0_12px_28px_rgba(0,0,0,0.12)]"}`}
      onClick={handleCardClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleCardClick(e); } }}
    >
      <div className={`relative aspect-[4/3] overflow-hidden ${light ? "bg-slate-100" : "bg-muted"}`}>
        <NativeImg
          src={productThumbnail(product.image)}
          alt={product.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
          fallback={
            <div className="w-full h-full flex items-center justify-center">
              <ProductImagePlaceholder theme="light" />
            </div>
          }
        />
        <div className={`absolute top-3 right-3 text-xs font-medium px-2 py-1 rounded-full border ${conditionColor[product.condition] || ""}`}>
          {product.condition}
        </div>
        {isOwner && (
          <div className="absolute top-3 left-3">
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-primary/90 text-primary-foreground">
              Your Listing
            </span>
          </div>
        )}
      </div>

      <div className="p-4 space-y-3">
        <span className={`text-xs font-semibold ${light ? "text-[#1F5BD8]" : "text-primary"}`}>{product.category}</span>

        <h3 className={`font-display text-sm font-semibold line-clamp-2 leading-snug min-h-[2.5rem] ${light ? "text-[#0A234F]" : "text-foreground"}`}>
          {product.title}
        </h3>

        <div className="flex items-end justify-between gap-3">
          <span className={`text-xl font-extrabold tracking-tight ${light ? "text-[#0A234F]" : "text-foreground"}`}>
            £{product.price.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          {hasAuthoritativeStock && product.maxPurchaseQuantity! > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-1 whitespace-nowrap">
              <Package className="h-3 w-3" />
              {product.maxPurchaseQuantity} available
            </span>
          )}
        </div>

        {product.location && (
          <div className={`flex items-center gap-1.5 text-xs ${light ? "text-slate-500" : "text-muted-foreground"}`}>
            <MapPin className="h-3.5 w-3.5" />
            <span className="truncate">{product.location}</span>
          </div>
        )}

        <div className={`flex items-center justify-between gap-3 pt-2 border-t ${light ? "border-slate-200" : "border-border"}`}>
          <div className="flex min-w-0 items-center gap-1.5">
            <span className={`truncate text-xs font-medium ${light ? "text-[#0A234F]" : "text-foreground"}`}>{product.seller}</span>
            {product.sellerVerified ? (
              <span
                className="inline-flex shrink-0 items-center gap-0.5 text-[10px] font-semibold text-success bg-success/10 border border-emerald-500/30 rounded-full px-1.5 py-0.5"
                title="Verified Seller"
                aria-label="Verified Seller"
              >
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span>Verified</span>
              </span>
            ) : (
              <span
                className="inline-flex shrink-0 items-center gap-0.5 text-[10px] font-semibold text-primary bg-primary/10 border border-primary/40 rounded-full px-1.5 py-0.5"
                title="Unverified seller"
                aria-label="Unverified seller"
              >
                <span>Seller</span>
              </span>
            )}
          </div>
          {hasRating ? (
            <div className="flex shrink-0 items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-[#F5A300] text-[#F5A300]" />
              <span className={`text-xs font-semibold ${light ? "text-[#0A234F]" : "text-foreground"}`}>{product.rating.toFixed(1)}</span>
              {(product.reviewCount ?? 0) > 0 && (
                <span className={`text-[11px] ${light ? "text-slate-400" : "text-muted-foreground"}`}>({product.reviewCount})</span>
              )}
            </div>
          ) : (
            <span className={`shrink-0 text-[11px] ${light ? "text-slate-400" : "text-muted-foreground"}`}>No reviews</span>
          )}
        </div>

        {isOwner ? (
          <Link to={`/seller/products/${product.id}/edit`}>
            <Button variant="outline" className="w-full text-sm" size="sm">
              <Settings className="mr-1.5 h-3.5 w-3.5" /> Manage Listing
            </Button>
          </Link>
        ) : (
          <Link to={`/product/${product.id}`} state={linkState ?? undefined}>
            <Button className={`w-full font-bold transition-all duration-250 text-sm ${light ? "bg-[#F5A300] text-[#0A234F] hover:bg-[#E59600] hover:shadow-[0_8px_18px_rgba(245,163,0,0.22)]" : "bg-primary hover:bg-primary-hover text-black hover:shadow-[0_0_18px_rgba(212,175,55,0.28)] hover:opacity-90"}`} size="sm">
              View product
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
};

export default ProductCard;
