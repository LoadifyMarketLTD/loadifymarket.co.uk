/**
 * productAdapter.ts
 *
 * Converts real Supabase product records into the simplified `Product` shape
 * used by the pixel-perfect catalog components.
 */

import type { Product as UIProduct } from "@/components/catalog/ProductCard";
import { categoryImages, DEFAULT_CATEGORY_IMAGE } from "@/data/categoryImages";

/** Shape of a product row from Supabase with optional joined category and seller data */
export interface DBProduct {
  id: string;
  title: string;
  price: number;
  priceExVat?: number | null;
  images: string[];
  condition: string;
  stockQuantity: number;
  views: number;
  rating: number;
  reviewCount: number;
  createdAt: string;
  sellerId?: string;
  type?: string;
  listingStatus?: string | null;
  listingContext?: string | null;
  stockStatus?: string | null;
  specifications?: Record<string, unknown> | null;
  category?: { name: string; slug: string } | Array<{ name: string; slug: string }> | null;
  subcategory?: { name: string; slug: string } | Array<{ name: string; slug: string }> | null;
  seller?:
    | { businessName?: string | null; isApproved?: boolean | null; rating?: number | null; userId?: string }
    | Array<{ businessName?: string | null; isApproved?: boolean | null; rating?: number | null; userId?: string }>
    | null;
}

const DB_TO_UI_CONDITION: Record<string, UIProduct["condition"]> = {
  new: "New",
  used: "Like New",
  refurbished: "Like New",
  returns_stock: "Unchecked",
  mixed: "Mixed",
  other: "Mixed",
};

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

/**
 * Public product grids should never promote a listing that checkout would
 * reject. Only apply the extra rules when the canonical DB fields are present,
 * so legacy fixtures without those fields remain backwards-compatible.
 */
export function isSellableDBProduct(dbProduct: DBProduct): boolean {
  if (dbProduct.listingStatus != null && dbProduct.listingStatus !== "active") {
    return false;
  }

  if (dbProduct.listingContext === "service") {
    return true;
  }

  if (dbProduct.listingContext === "product" || dbProduct.listingContext === "goods") {
    return Number(dbProduct.stockQuantity) > 0;
  }

  return true;
}

export function adaptProduct(dbProduct: DBProduct): UIProduct {
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
      : categoryImages[cat?.slug ?? ""] ?? DEFAULT_CATEGORY_IMAGE;

  const condition: UIProduct["condition"] =
    DB_TO_UI_CONDITION[dbProduct.condition] ?? "Mixed";

  const categoryName = cat?.name ?? "Other";
  const subcategoryName = subcat?.name ?? categoryName;

  const sellerName = seller?.businessName ?? "Loadify Seller";
  const sellerVerified = seller?.isApproved ?? false;

  const rating =
    typeof dbProduct.rating === "number" && dbProduct.rating > 0
      ? Number(dbProduct.rating)
      : typeof seller?.rating === "number" && seller.rating > 0
      ? Number(seller.rating)
      : 0;

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
    sellerId: dbProduct.sellerId,
    sellerVerified,
    unitCount: dbProduct.stockQuantity > 0 ? dbProduct.stockQuantity : 1,
    rating,
    reviewCount: dbProduct.reviewCount ?? 0,
    views: dbProduct.views ?? 0,
    listed: formatRelativeTime(dbProduct.createdAt),
  };
}

/** Convenience helper for public product grids. */
export function adaptProducts(dbProducts: DBProduct[]): UIProduct[] {
  return dbProducts.filter(isSellableDBProduct).map(adaptProduct);
}
