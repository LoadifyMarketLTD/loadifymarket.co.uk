/**
 * productAdapter.ts
 *
 * Converts real Supabase product records (with joined category / seller info)
 * into the simplified `Product` shape used by the pixel-perfect catalog
 * components ( @/components/catalog/ProductCard, ProductInfo, SellerCard, etc.).
 *
 * This is the bridge between the existing working Supabase backend and the
 * new pixel-perfect frontend — no mock data is used here.
 */

import type { Product as UIProduct } from "@/components/catalog/ProductCard";

/** Shape returned by Supabase when we JOIN categories + seller_profiles_public */
export interface DBProduct {
  id: string;
  title: string;
  price: number;
  /** Optional pre-VAT price stored on product (may be null) */
  priceExVat?: number | null;
  images: string[];
  condition: string; // 'new' | 'used' | 'refurbished' | 'returns_stock' | 'mixed' | 'other'
  stockQuantity: number;
  views: number;
  rating: number;
  reviewCount: number;
  createdAt: string;
  type?: string;
  specifications?: Record<string, unknown> | null;
  // Joined from categories table (PostgREST embeds as object or array)
  category?: { name: string; slug: string } | Array<{ name: string; slug: string }> | null;
  subcategory?: { name: string; slug: string } | Array<{ name: string; slug: string }> | null;
  // Joined from seller_profiles_public
  seller?:
    | { businessName?: string | null; isApproved?: boolean | null; rating?: number | null; userId?: string }
    | Array<{ businessName?: string | null; isApproved?: boolean | null; rating?: number | null; userId?: string }>
    | null;
}

// ── Condition mapping ─────────────────────────────────────────────────────────
// DB conditions → pixel-perfect display conditions
const DB_TO_UI_CONDITION: Record<string, UIProduct["condition"]> = {
  new: "New",
  used: "Like New",
  refurbished: "Like New",
  returns_stock: "Unchecked",
  mixed: "Mixed",
  other: "Mixed",
};

// ── Relative time helper ──────────────────────────────────────────────────────
export function formatRelativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
}

// ── Main adapter ──────────────────────────────────────────────────────────────
export function adaptProduct(dbProduct: DBProduct): UIProduct {
  // PostgREST returns joined rows as arrays when using !left — normalise both
  const cat = Array.isArray(dbProduct.category)
    ? dbProduct.category[0]
    : dbProduct.category;

  const subcat = Array.isArray(dbProduct.subcategory)
    ? dbProduct.subcategory[0]
    : dbProduct.subcategory;

  const seller = Array.isArray(dbProduct.seller)
    ? dbProduct.seller[0]
    : dbProduct.seller;

  const image =
    Array.isArray(dbProduct.images) && dbProduct.images.length > 0
      ? dbProduct.images[0]
      : "/placeholder-product.jpg";

  const condition: UIProduct["condition"] =
    DB_TO_UI_CONDITION[dbProduct.condition] ?? "Mixed";

  const categoryName = cat?.name ?? "Other";
  const subcategoryName = subcat?.name ?? categoryName;

  const sellerName = seller?.businessName ?? "Loadify Seller";
  const sellerVerified = seller?.isApproved ?? false;

  // Use seller rating if product rating is 0 (newly listed)
  const rating =
    typeof dbProduct.rating === "number" && dbProduct.rating > 0
      ? Number(dbProduct.rating)
      : typeof seller?.rating === "number" && seller.rating > 0
      ? Number(seller.rating)
      : 0;

  // Use specifications.location if the seller set one, otherwise leave blank
  const specLocation =
    dbProduct.specifications && typeof dbProduct.specifications === "object"
      ? (dbProduct.specifications["location"] as string | undefined) ?? ""
      : "";

  return {
    id: dbProduct.id,
    title: dbProduct.title,
    image,
    price: Number(dbProduct.price),
    originalPrice: dbProduct.priceExVat ? Number(dbProduct.priceExVat) : undefined,
    category: categoryName,
    subcategory: subcategoryName,
    condition,
    location: specLocation,
    seller: sellerName,
    sellerVerified,
    unitCount: dbProduct.stockQuantity > 0 ? dbProduct.stockQuantity : 1,
    rating,
    reviewCount: dbProduct.reviewCount ?? 0,
    views: dbProduct.views ?? 0,
    listed: formatRelativeTime(dbProduct.createdAt),
  };
}

/** Convenience helper to adapt an array of DB products */
export function adaptProducts(dbProducts: DBProduct[]): UIProduct[] {
  return dbProducts.map(adaptProduct);
}
