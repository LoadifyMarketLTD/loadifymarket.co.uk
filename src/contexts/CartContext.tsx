import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import type { ReactNode } from "react";
import type { Product } from "@/components/catalog/ProductCard";
import { safeLocalStorage } from "@/lib/safeStorage";
import { isCapacitorNative } from "@/lib/capacitorUtils";
import { supabase } from "@/lib/supabase";

export interface CartItem { product: Product; quantity: number; }
interface CartContextType {
  cartItems: CartItem[]; addToCart: (product: Product, quantity?: number) => void; removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, delta: number) => void; clearCart: () => void; cartCount: number; subtotal: number;
  priceChangedBanner: boolean; dismissPriceBanner: () => void; refreshCartPrices: () => Promise<void>;
}
const CartContext = createContext<CartContextType | undefined>(undefined);
const CART_STORAGE_KEY = "loadify_cart";
function parseCart(raw: string | null): CartItem[] { if (!raw) return []; try { return JSON.parse(raw) as CartItem[]; } catch { return []; } }
function loadCartSync(): CartItem[] { return isCapacitorNative() ? [] : parseCart(safeLocalStorage.getItem(CART_STORAGE_KEY)); }
function clampQuantity(product: Product, quantity: number): number { const positive = Math.max(0, quantity); if (product.maxPurchaseQuantity == null) return positive; return Math.min(positive, Math.max(0, product.maxPurchaseQuantity)); }

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>(loadCartSync);
  const [priceChangedBanner, setPriceChangedBanner] = useState(false);
  const storageReadyRef = useRef(!isCapacitorNative());
  const cartItemsRef = useRef(cartItems);
  cartItemsRef.current = cartItems;

  useEffect(() => { if (!isCapacitorNative()) return; let cancelled = false; import('@capacitor/preferences').then(({ Preferences }) => Preferences.get({ key: CART_STORAGE_KEY })).then(({ value }) => { if (cancelled) return; const loaded = parseCart(value); if (loaded.length > 0) setCartItems(loaded); storageReadyRef.current = true; }).catch(() => { storageReadyRef.current = true; }); return () => { cancelled = true; }; }, []);
  useEffect(() => { if (!storageReadyRef.current) return; const serialised = JSON.stringify(cartItems); if (isCapacitorNative()) { import('@capacitor/preferences').then(({ Preferences }) => Preferences.set({ key: CART_STORAGE_KEY, value: serialised })).catch(() => {}); } safeLocalStorage.setItem(CART_STORAGE_KEY, serialised); }, [cartItems]);

  const addToCart = (product: Product, quantity = 1) => { if (product.isAvailable === false || quantity <= 0) return; setCartItems((prev) => { const existing = prev.find((item) => item.product.id === product.id); if (existing) return prev.map((item) => item.product.id === product.id ? { ...item, quantity: clampQuantity(product, item.quantity + quantity) } : item); const clamped = clampQuantity(product, quantity); return clamped > 0 ? [...prev, { product, quantity: clamped }] : prev; }); };
  const removeFromCart = (productId: string) => setCartItems((prev) => prev.filter((item) => item.product.id !== productId));
  const updateQuantity = (productId: string, delta: number) => setCartItems((prev) => prev.map((item) => item.product.id === productId ? { ...item, quantity: clampQuantity(item.product, item.quantity + delta) } : item).filter((item) => item.quantity > 0));
  const clearCart = () => setCartItems([]);
  const dismissPriceBanner = useCallback(() => setPriceChangedBanner(false), []);

  const refreshCartPrices = useCallback(async () => {
    const snapshot = cartItemsRef.current; if (snapshot.length === 0) return;
    const productIds = snapshot.map((i) => i.product.id);
    try {
      const { data, error } = await supabase.from("products").select("id, price, isActive, isApproved, listingStatus, listingContext, stockQuantity, vatRate, taxTreatmentStatus, taxTreatmentSource").in("id", productIds);
      if (error || !data) return;
      type DBRow = { id: string; price: number; isActive: boolean; isApproved: boolean; listingStatus: string | null; listingContext: string | null; stockQuantity: number | null; vatRate: number | null; taxTreatmentStatus: string | null; taxTreatmentSource: string | null; };
      const dbMap = new Map<string, DBRow>(data.map((row: DBRow) => [row.id, row]));
      let anyPriceChanged = false;
      const updated = snapshot.filter((item) => { const row = dbMap.get(item.product.id); if (!row?.isActive || !row.isApproved || row.listingStatus !== "active") return false; if (row.listingContext === "service") return true; return Number(row.stockQuantity ?? 0) > 0; }).map((item) => {
        const row = dbMap.get(item.product.id) as DBRow;
        const maxPurchaseQuantity = row.listingContext === "service" ? undefined : Math.max(0, Math.floor(Number(row.stockQuantity ?? 0)));
        const nextProduct: Product = { ...item.product, price: Number(row.price), vatRate: row.vatRate == null ? null : Number(row.vatRate), taxTreatmentStatus: row.taxTreatmentStatus, taxTreatmentSource: row.taxTreatmentSource, isAvailable: true, availabilityMessage: undefined, maxPurchaseQuantity };
        if (Number(row.price) !== item.product.price) anyPriceChanged = true;
        return { ...item, product: nextProduct, quantity: clampQuantity(nextProduct, item.quantity) };
      }).filter((item) => item.quantity > 0);
      setCartItems(updated); if (anyPriceChanged) setPriceChangedBanner(true);
    } catch { /* server-side checkout validation remains authoritative */ }
  }, []);

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  return <CartContext.Provider value={{ cartItems, addToCart, removeFromCart, updateQuantity, clearCart, cartCount, subtotal, priceChangedBanner, dismissPriceBanner, refreshCartPrices }}>{children}</CartContext.Provider>;
};
export const useCart = () => { const context = useContext(CartContext); if (!context) throw new Error("useCart must be used within CartProvider"); return context; };
