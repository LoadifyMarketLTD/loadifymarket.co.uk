import { MapPin, Package, Star, Eye, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useAuthStore } from "@/store";

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
  sellerVerified: boolean;
  unitCount: number;
  rating: number;
  reviewCount?: number;
  views: number;
  listed: string;
  /** Seller's user ID — used for owner-awareness CTAs */
  sellerId?: string;
}

const conditionColor: Record<string, string> = {
  New: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  "Like New": "bg-violet-500/10 text-violet-700 border-violet-200",
  Mixed: "bg-amber-500/10 text-amber-700 border-amber-200",
  Unchecked: "bg-purple-500/10 text-purple-700 border-purple-200",
};

const ProductCard = ({ product, linkState }: { product: Product; linkState?: Record<string, unknown> }) => {
  const { user } = useAuthStore();
  const isOwner = !!user && !!product.sellerId && user.id === product.sellerId;

  return (
    <div className="group bg-card rounded-xl border border-border hover:border-primary/30 hover:shadow-elevated transition-all duration-300 overflow-hidden">
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <img
          src={product.image}
          alt={product.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
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
            {product.sellerVerified && (
              <span className="w-3.5 h-3.5 rounded-full bg-primary flex items-center justify-center">
                <svg className="w-2 h-2 text-primary-foreground" fill="currentColor" viewBox="0 0 12 12">
                  <path d="M10 3L4.5 8.5 2 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
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
            <Button className="w-full bg-gradient-hero text-primary-foreground hover:opacity-90 transition-opacity text-sm" size="sm">
              View Details
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
};

export default ProductCard;
