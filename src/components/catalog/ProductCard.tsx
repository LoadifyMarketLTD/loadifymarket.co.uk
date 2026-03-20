import { MapPin, Package, Star, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export interface Product {
  id: string;
  title: string;
  image: string;
  price: number;
  originalPrice?: number;
  category: string;
  subcategory: string;
  condition: "New" | "Like New" | "Mixed" | "Unchecked" | "Damaged Packaging";
  location: string;
  seller: string;
  sellerVerified: boolean;
  unitCount: number;
  rating: number;
  reviewCount?: number;
  views: number;
  listed: string;
}

const conditionColor: Record<string, string> = {
  New: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  "Like New": "bg-blue-500/10 text-blue-700 border-blue-200",
  Mixed: "bg-amber-500/10 text-amber-700 border-amber-200",
  Unchecked: "bg-purple-500/10 text-purple-700 border-purple-200",
  "Damaged Packaging": "bg-red-500/10 text-red-700 border-red-200",
};

const ProductCard = ({ product }: { product: Product }) => {
  const discount = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  return (
    <div className="group bg-card rounded-xl border border-border hover:border-primary/30 hover:shadow-elevated transition-all duration-300 overflow-hidden">
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <img
          src={product.image}
          alt={product.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        {discount > 0 && (
          <Badge className="absolute top-3 left-3 bg-destructive text-destructive-foreground text-xs font-bold">
            -{discount}%
          </Badge>
        )}
        <div className={`absolute top-3 right-3 text-xs font-medium px-2 py-1 rounded-full border ${conditionColor[product.condition] || ""}`}>
          {product.condition}
        </div>
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

        <div className="flex items-center gap-2">
          <span className="font-display text-lg font-bold text-foreground">
            £{product.price.toLocaleString()}
          </span>
          {product.originalPrice && (
            <span className="text-sm text-muted-foreground line-through">
              £{product.originalPrice.toLocaleString()}
            </span>
          )}
        </div>

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

        <Link to={`/product/${product.id}`}>
          <Button className="w-full bg-gradient-hero text-primary-foreground hover:opacity-90 transition-opacity text-sm" size="sm">
            View Details
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default ProductCard;
