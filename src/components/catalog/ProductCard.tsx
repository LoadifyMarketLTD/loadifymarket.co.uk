import { MapPin, Package, Star, Eye, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store";
import { productThumbnail } from "@/lib/imageOptimization";
import NativeImg from "@/components/NativeImg";
import ProductImagePlaceholder from "@/components/ProductImagePlaceholder";

export interface Product {
  id: string;
  title: string;
  description?: string;
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
  listingContext?: string;
  /** Canonical tax evidence refreshed from the product record before checkout. */
  vatRate?: number | null;
  taxTreatmentStatus?: string | null;
  taxTreatmentSource?: string | null;
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

function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(price) ? price : 0);
}

const ProductCard = ({ product, linkState, theme = "light" }: { product: Product; linkState?: Record<string, unknown>; theme?: "default" | "light" }) => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const isOwner = !!user && !!product.sellerId && user.id === product.sellerId;
  const light = theme === "light";
  const hasReviews = (product.reviewCount ?? 0) > 0 && product.rating > 0;
  const availabilityLabel = product.listingContext === "service"
    ? "Service available"
    : `${product.unitCount} available`;

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
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-primary/90 text-primary-foreground">Your listing</span>
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
          <span>{product.category}</span>
          <span>•</span>
          <span>{product.subcategory}</span>
        </div>

        <h3 className={`font-semibold line-clamp-2 min-h-[3rem] mb-2 ${light ? "text-slate-950" : "text-foreground"}`}>{product.title}</h3>

        <div className="flex items-baseline gap-2 mb-3">
          <span className={`text-xl font-bold ${light ? "text-[#1F5BD8]" : "text-primary"}`}>{formatPrice(product.price)}</span>
          {product.originalPrice && product.originalPrice > product.price && (
            <span className="text-sm text-muted-foreground line-through">{formatPrice(product.originalPrice)}</span>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
          <span className="flex items-center gap-1"><Package className="w-3.5 h-3.5" />{availabilityLabel}</span>
          <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{product.location}</span>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div className="min-w-0">
            <div className={`text-sm font-medium truncate ${light ? "text-slate-900" : "text-foreground"}`}>{product.seller}</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {product.sellerVerified && <span>Verified</span>}
              {hasReviews && <span className="flex items-center gap-1"><Star className="w-3 h-3 fill-current" />{product.rating.toFixed(1)}</span>}
              <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{product.views}</span>
            </div>
          </div>
          {isOwner ? (
            <Button size="sm" variant="outline" asChild>
              <Link to={`/seller/products/${product.id}/edit`}><Settings className="w-4 h-4 mr-1" />Manage</Link>
            </Button>
          ) : (
            <Button size="sm" asChild>
              <Link to={`/product/${product.id}`} state={linkState}>View</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
