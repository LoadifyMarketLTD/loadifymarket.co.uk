import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  ArrowRight, Package, MapPin, Clock, Eye, Tag,
  Truck, ShieldCheck, ShoppingCart, Heart, Settings
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
}

const conditionColor: Record<string, string> = {
  New: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  "Like New": "bg-violet-500/10 text-violet-700 border-violet-200",
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
  const { user } = useAuthStore();
  const isOwner = !!user && !!product.sellerId && user.id === product.sellerId;
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  // Check if this product is already in the user's wishlist
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
          Buyer Protection
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
      {isOwner ? (
        <div className="flex flex-col sm:flex-row gap-3">
          <Link to={`/seller/products/${product.id}/edit`} className="flex-1">
            <Button
              size="lg"
              className="w-full bg-gradient-accent text-accent-foreground font-semibold text-base hover:opacity-90 transition-opacity"
            >
              <Settings className="mr-2 h-5 w-5" /> Manage This Listing
            </Button>
          </Link>
          <Link to="/pp/seller/products" className="shrink-0">
            <Button size="lg" variant="outline" className="w-full text-base">
              All My Listings
            </Button>
          </Link>
        </div>
      ) : (
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
          <Button
            size="lg"
            variant="outline"
            className={`shrink-0 ${isWishlisted ? "text-rose-500 border-rose-300 hover:bg-rose-50" : ""}`}
            onClick={handleToggleWishlist}
            disabled={wishlistLoading}
            aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
          >
            <Heart className={`h-5 w-5 ${isWishlisted ? "fill-rose-500" : ""}`} />
          </Button>
        </div>
      )}

      {/* Accepted payment methods */}
      <PaymentMethodBadges size="sm" />
    </div>
  );
};

export default ProductInfo;
