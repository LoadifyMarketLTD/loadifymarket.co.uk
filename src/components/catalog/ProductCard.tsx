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
}

const conditionColor: Record<string, string> = {
  New: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  "Like New": "bg-violet-500/10 text-violet-700 border-violet-200",
  Mixed: "bg-amber-500/10 text-amber-700 border-amber-200",
  Unchecked: "bg-purple-500/10 text-purple-700 border-purple-200",
};

const ProductCard = ({ product, linkState }: { product: Product; linkState?: Record<string, unknown> }) => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const isOwner = !!user && !!product.sellerId && user.id === product.sellerId;

  const handleCardClick = (e: React.MouseEvent | React.KeyboardEvent) => {
    // Only navigate if the click wasn't on a button or link already.
    // Guard against Text nodes (Capacitor WebView) which lack .closest().
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
      className="group bg-card rounded-xl border border-border hover:border-yellow-400/35 hover:shadow-[0_0_22px_rgba(251,191,36,0.14),0_12px_28px_rgba(0,0,0,0.12)] hover:-translate-y-1 transition-all duration-300 overflow-hidden cursor-pointer"
      onClick={handleCardClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleCardClick(e); } }}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
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

      {/* Content */}
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-primary">{product.category}</span>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Eye className="h-3 w-3" />
            {product.views}
          </div>
        </div>

        <h3 className="font-display text-sm font-semibold text-foreground line-clamp-2 leading-snug">
          {product.title}
        </h3>


        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Package className="h-3 w-3" />
            {product.unitCount} {product.unitCount === 1 ? "lot" : "lots"}
          </div>
          <div className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {product.location}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-foreground">{product.seller}</span>
            {product.sellerVerified ? (
              <span
                className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-1.5 py-0.5"
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
                className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-500 bg-amber-500/10 border border-amber-500/30 rounded-full px-1.5 py-0.5"
                title="Unverified seller"
                aria-label="Unverified seller"
              >
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>Unverified</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-0.5">
            <Star className="h-3 w-3 fill-accent text-accent" />
            <span className="text-xs font-medium text-foreground">{product.rating}</span>
          </div>
        </div>

        {isOwner ? (
          <Link to={`/seller/products/${product.id}/edit`}>
            <Button variant="outline" className="w-full text-sm" size="sm">
              <Settings className="mr-1.5 h-3.5 w-3.5" /> Manage Listing
            </Button>
          </Link>
        ) : (
          <Link to={`/product/${product.id}`} state={linkState ?? undefined}>
            <Button className="w-full bg-[linear-gradient(135deg,#FBBF24,#D97706)] text-[#020617] font-bold hover:shadow-[0_0_18px_rgba(251,191,36,0.28)] hover:opacity-90 transition-all duration-250 text-sm" size="sm">
              View Details
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
};

export default ProductCard;
