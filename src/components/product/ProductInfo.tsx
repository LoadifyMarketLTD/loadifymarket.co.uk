import { Button } from "@/components/ui/button";
import {
  ArrowRight, Package, MapPin, Clock, Eye, Tag,
  Truck, ShieldCheck, ShoppingCart
} from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import type { Product } from "@/components/catalog/ProductCard";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

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
}

const conditionColor: Record<string, string> = {
  New: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  "Like New": "bg-blue-500/10 text-blue-700 border-blue-200",
  Mixed: "bg-amber-500/10 text-amber-700 border-amber-200",
  Unchecked: "bg-purple-500/10 text-purple-700 border-purple-200",
};

const ProductInfo = ({
  title,
  category,
  subcategory,
  condition,
  location,
  unitCount,
  views,
  listed,
  product,
}: ProductInfoProps) => {
  const { addToCart } = useCart();
  const navigate = useNavigate();

  const handleBuyNow = () => {
    addToCart(product);
    navigate("/cart");
  };

  const handleAddToCart = () => {
    addToCart(product);
    toast({
      title: "Added to cart",
      description: `${title} has been added to your cart.`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <a href="/catalog" className="hover:text-foreground transition-colors">Catalog</a>
        <span>/</span>
        <span>{category}</span>
        <span>/</span>
        <span className="text-foreground">{subcategory}</span>
      </div>

      {/* Title & condition */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${conditionColor[condition] || ""}`}>
            {condition}
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground leading-tight">
          {title}
        </h1>
      </div>

      {/* Meta info */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Package className="h-4 w-4 text-primary" />
          {unitCount} {unitCount === 1 ? "lot" : "lots"}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 text-primary" />
          {location}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4 text-primary" />
          Listed {listed}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Eye className="h-4 w-4 text-primary" />
          {views} views
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Tag className="h-4 w-4 text-primary" />
          {category}
        </div>
      </div>

      {/* Trust badges */}
      <div className="flex flex-wrap gap-4 py-3 border-y border-border">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Dispute Support Available
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Truck className="h-4 w-4 text-primary" />
          UK-Wide Delivery
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Secure Payment
        </div>
      </div>

      {/* CTA buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          size="lg"
          className="flex-1 bg-gradient-accent text-accent-foreground font-semibold text-base hover:opacity-90 transition-opacity"
          onClick={handleBuyNow}
        >
          Buy Now <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="flex-1 text-base"
          onClick={handleAddToCart}
        >
          <ShoppingCart className="mr-2 h-5 w-5" />
          Add to Cart
        </Button>
      </div>
    </div>
  );
};

export default ProductInfo;
