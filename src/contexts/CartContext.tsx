import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import type { Product } from "@/components/catalog/ProductCard";
import { safeLocalStorage } from "@/lib/safeStorage";

export interface CartItem {
  product: Product;
  quantity: number;
}

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, delta: number) => void;
  clearCart: () => void;
  cartCount: number;
  subtotal: number;
  /** True when at least one price was updated during the last refreshCartPrices() call. */
  priceChangedBanner: boolean;
  /** Dismiss the price-changed banner. */
  dismissPriceBanner: () => void;
  /** Batch-fetch current prices/availability from DB and reconcile cart state.
   *  Removes inactive/unapproved products and updates prices to DB values.
   *  Sets priceChangedBanner=true if any price changed. */
  refreshCartPrices: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = "loadify_cart";

function loadCart(): CartItem[] {
  const stored = safeLocalStorage.getItem(CART_STORAGE_KEY);
  try {
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveCart(items: CartItem[]) {
  safeLocalStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
}

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>(loadCart);
  const [priceChangedBanner, setPriceChangedBanner] = useState(false);

  useEffect(() => {
    saveCart(cartItems);
  }, [cartItems]);

  const addToCart = (product: Product, quantity = 1) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { product, quantity }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCartItems((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) =>
          item.product.id === productId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const clearCart = () => setCartItems([]);

  const dismissPriceBanner = useCallback(() => setPriceChangedBanner(false), []);

  /**
   * Batch-fetch current product prices and availability from the DB.
   * - Removes inactive or unapproved products silently from the cart.
   * - Updates in-cart prices to the current DB value.
   * - Sets priceChangedBanner=true if any price changed so the UI can inform
   *   the user before they proceed to checkout.
   * Uses a single query for all cart items (no N+1).
   */
  const refreshCartPrices = useCallback(async () => {
    // Use the functional updater pattern to read the latest cart state
    // rather than a stale closure or a localStorage re-read.
    let snapshot: CartItem[] = [];
    setCartItems((prev) => {
      snapshot = prev;
      return prev;
    });

    if (snapshot.length === 0) return;

    const productIds = snapshot.map((i) => i.product.id);

    try {
      const { supabase } = await import("@/lib/supabase");
      const { data, error } = await supabase
        .from("products")
        .select("id, price, isActive, isApproved")
        .in("id", productIds);

      if (error || !data) return;

      type DBRow = { id: string; price: number; isActive: boolean; isApproved: boolean };
      const dbMap = new Map<string, DBRow>(data.map((row: DBRow) => [row.id, row]));

      let anyPriceChanged = false;

      const updated = snapshot
        .filter((item) => {
          const row = dbMap.get(item.product.id);
          // Remove products that are no longer active or approved
          return row?.isActive && row?.isApproved;
        })
        .map((item) => {
          const row = dbMap.get(item.product.id) as DBRow;
          if (row.price !== item.product.price) {
            anyPriceChanged = true;
            return { ...item, product: { ...item.product, price: row.price } };
          }
          return item;
        });

      setCartItems(updated);
      if (anyPriceChanged) {
        setPriceChangedBanner(true);
      }
    } catch {
      // Non-fatal: if the refresh fails, the server-side validation in
      // create-checkout.ts will still catch any price mismatches.
    }
  }, []);

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartCount,
        subtotal,
        priceChangedBanner,
        dismissPriceBanner,
        refreshCartPrices,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
};
