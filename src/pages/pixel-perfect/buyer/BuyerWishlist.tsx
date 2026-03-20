import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, ShoppingCart, Trash2 } from "lucide-react";

interface WishlistItem {
  id: number;
  name: string;
  seller: string;
  price: string;
  originalPrice?: string;
  image: string;
  inStock: boolean;
  onSale: boolean;
}

const initialItems: WishlistItem[] = [
  { id: 1, name: "iPhone 15 Pro Max — 50 Units", seller: "TechWholesale UK", price: "£32,500", image: "📱", inStock: true, onSale: false },
  { id: 2, name: "Sony WH-1000XM5 — 100 Units", seller: "AudioDirect Ltd", price: "£18,900", originalPrice: "£21,000", image: "🎧", inStock: true, onSale: true },
  { id: 3, name: "Samsung 65\" QLED TV — 20 Units", seller: "ScreenPlus Trade", price: "£12,400", image: "📺", inStock: true, onSale: false },
  { id: 4, name: "Dyson V15 Detect — 30 Units", seller: "HomeGoods Direct", price: "£14,700", originalPrice: "£16,200", image: "🧹", inStock: false, onSale: true },
  { id: 5, name: "Apple AirPods Pro — 200 Units", seller: "TechWholesale UK", price: "£28,000", image: "🎵", inStock: true, onSale: false },
  { id: 6, name: "Nintendo Switch OLED — 40 Units", seller: "GameZone Wholesale", price: "£10,800", image: "🎮", inStock: true, onSale: false },
  { id: 7, name: "Nespresso Vertuo — 50 Units", seller: "KitchenPro Trade", price: "£6,250", image: "☕", inStock: false, onSale: false },
  { id: 8, name: "Canon EOS R6 II — 15 Units", seller: "PhotoPro Wholesale", price: "£22,350", originalPrice: "£24,000", image: "📷", inStock: true, onSale: true },
];

const BuyerWishlist = () => {
  const [items, setItems] = useState(initialItems);

  const remove = (id: number) => setItems((prev) => prev.filter((i) => i.id !== id));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Wishlist</h1>
          <p className="text-muted-foreground text-sm mt-1">{items.length} items saved for later.</p>
        </div>
      </div>

      {items.length === 0 ? (
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
              {item.onSale && (
                <Badge className="absolute top-3 left-3 z-10 bg-destructive text-destructive-foreground text-[10px]">
                  SALE
                </Badge>
              )}
              <CardContent className="p-4">
                <div className="w-full h-28 rounded-lg bg-muted flex items-center justify-center text-4xl mb-3">
                  {item.image}
                </div>
                <p className="text-sm font-medium text-foreground line-clamp-2 leading-snug">{item.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{item.seller}</p>

                <div className="flex items-center gap-2 mt-2">
                  <span className="text-base font-bold text-foreground">{item.price}</span>
                  {item.originalPrice && (
                    <span className="text-xs text-muted-foreground line-through">{item.originalPrice}</span>
                  )}
                </div>

                {!item.inStock && (
                  <Badge variant="outline" className="mt-2 text-[10px] bg-muted text-muted-foreground">Out of Stock</Badge>
                )}

                <div className="flex items-center gap-2 mt-3">
                  <Button
                    size="sm"
                    className="flex-1 text-xs"
                    disabled={!item.inStock}
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
