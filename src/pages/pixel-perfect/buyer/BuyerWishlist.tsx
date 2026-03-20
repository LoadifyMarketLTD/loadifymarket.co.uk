import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, ShoppingCart, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store";

interface WishlistProduct {
  id: string;
  title: string;
  price: number;
  images: string[];
  isActive: boolean;
}

const BuyerWishlist = () => {
  const { user } = useAuthStore();
  const [items, setItems] = useState<WishlistProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWishlist = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data: wishlistData, error: wishlistError } = await supabase
        .from("wishlists")
        .select("productIds")
        .eq("userId", user.id)
        .single();

      if (wishlistError && wishlistError.code !== "PGRST116") throw wishlistError;

      const productIds: string[] = wishlistData?.productIds || [];
      if (productIds.length === 0) { setItems([]); return; }

      const { data: products, error: productsError } = await supabase
        .from("products")
        .select("id, title, price, images, isActive")
        .in("id", productIds);

      if (productsError) throw productsError;
      setItems((products as WishlistProduct[]) || []);
    } catch (err) {
      console.error("Error fetching wishlist:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchWishlist(); }, [fetchWishlist]);

  const remove = async (id: string) => {
    if (!user) return;
    const newIds = items.filter((i) => i.id !== id).map((i) => i.id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    await supabase
      .from("wishlists")
      .update({ productIds: newIds, updatedAt: new Date().toISOString() })
      .eq("userId", user.id);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Wishlist</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {loading ? "Loading…" : `${items.length} item${items.length !== 1 ? "s" : ""} saved for later.`}
          </p>
        </div>
      </div>

      {loading ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <p>Loading your wishlist…</p>
          </CardContent>
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Heart className="h-12 w-12 mb-4 opacity-40" />
            <p className="text-lg font-medium">Your wishlist is empty</p>
            <p className="text-sm mt-1">Browse the catalog and save items you like.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((item) => (
            <Card key={item.id} className="group relative overflow-hidden">
              {!item.isActive && (
                <Badge className="absolute top-3 left-3 z-10 bg-destructive text-destructive-foreground text-[10px]">
                  UNAVAILABLE
                </Badge>
              )}
              <CardContent className="p-4">
                <div className="w-full h-28 rounded-lg bg-muted flex items-center justify-center mb-3 overflow-hidden">
                  {item.images?.[0] ? (
                    <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover" />
                  ) : (
                    <Heart className="h-10 w-10 text-muted-foreground opacity-30" />
                  )}
                </div>
                <p className="text-sm font-medium text-foreground line-clamp-2 leading-snug">{item.title}</p>

                <div className="flex items-center gap-2 mt-2">
                  <span className="text-base font-bold text-foreground">
                    £{(item.price ?? 0).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {!item.isActive && (
                  <Badge variant="outline" className="mt-2 text-[10px] bg-muted text-muted-foreground">Out of Stock</Badge>
                )}

                <div className="flex items-center gap-2 mt-3">
                  <Button
                    size="sm"
                    className="flex-1 text-xs"
                    disabled={!item.isActive}
                  >
                    <ShoppingCart className="h-3 w-3 mr-1" />
                    Add to Cart
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => remove(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default BuyerWishlist;
