/**
 * productAdapter.ts
 *
 * Converts real Supabase product records into the simplified `Product` shape
 * used by the pixel-perfect catalog components.
 */

import type { Product as UIProduct } from "@/components/catalog/ProductCard";
import { categoryImages, DEFAULT_CATEGORY_IMAGE } from "@/data/categoryImages";

export interface PublicSellerCardData {
  businessName?: string | null;
  isApproved?: boolean | null;
  rating?: number | null;
  userId?: string;
  businessAddress?: {
    city?: string | null;
    country?: string | null;
  } | null;
}

/** Shape of a product row from Supabase with optional joined category and seller data */
export interface DBProduct {
  id: string;
  title: string;
  description?: string | null;
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
  isActive?: boolean | null;
  isApproved?: boolean | null;
  listingStatus?: string | null;
  listingContext?: string | null;
  stockStatus?: string | null;
  specifications?: Record<string, unknown> | null;
  category?: { name: string; slug: string } | Array<{ name: string; slug: string }> | null;
  subcategory?: { name: string; slug: string } | Array<{ name: string; slug: string }> | null;
  seller?: PublicSellerCardData | PublicSellerCardData[] | null;
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

function tidyLocationPart(value?: string | null): string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return "";
  if (trimmed === trimmed.toUpperCase()) {
    return trimmed
      .toLowerCase()
      .replace(/(^|[\s-])([a-z])/g, (_, prefix: string, letter: string) => `${prefix}${letter.toUpperCase()}`);
  }
  return trimmed;
}

function sellerLocation(seller?: PublicSellerCardData | null): string {
  const city = tidyLocationPart(seller?.businessAddress?.city);
  const country = tidyLocationPart(seller?.businessAddress?.country);
  return [city, country].filter(Boolean).join(", ");
}

function shortDescription(dbProduct: DBProduct): string {
  const candidate = dbProduct.specifications?.["shortDescription"];
  if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
  return dbProduct.description?.replace(/\s+/g, " ").trim() ?? "";
}

/**
 * Returns the canonical availability state used by public listing surfaces.
 * Undefined legacy fixture fields are treated as unknown rather than blocked;
 * production rows include the canonical listing fields.
 */
export function getDBProductAvailability(dbProduct: DBProduct): {
  isAvailable: boolean;
  message?: string;
} {
  if (dbProduct.isActive === false) {
    return { isAvailable: false, message: "This listing is no longer active." };
  }
  if (dbProduct.isApproved === false) {
    return { isAvailable: false, message: "This listing is not currently available for purchase." };
  }
  if (dbProduct.listingStatus === "reserved") {
    return { isAvailable: false, message: "Reserved — awaiting payment." };
  }
  if (dbProduct.listingStatus === "sold") {
    return { isAvailable: false, message: "This item has been sold." };
  }
  if (dbProduct.listingStatus != null && dbProduct.listingStatus !== "active") {
    return { isAvailable: false, message: "This listing is not currently available for purchase." };
  }

  if (dbProduct.listingContext === "service") {
    return { isAvailable: true };
  }

  if (dbProduct.listingContext === "product" || dbProduct.listingContext === "goods") {
    if (Number(dbProduct.stockQuantity) <= 0) {
      return { isAvailable: false, message: "Out of stock." };
    }
  }

  return { isAvailable: true };
}

/** Public product grids should never promote a listing checkout would reject. */
export function isSellableDBProduct(dbProduct: DBProduct): boolean {
  return getDBProductAvailability(dbProduct).isAvailable;
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
  const location = specLocation.trim() || sellerLocation(seller);

  const availability = getDBProductAvailability(dbProduct);
  const maxPurchaseQuantity =
    dbProduct.listingContext === "product" || dbProduct.listingContext === "goods"
      ? Math.max(0, Math.floor(Number(dbProduct.stockQuantity) || 0))
      : undefined;

  return {
    id: dbProduct.id,
    title: dbProduct.title,
    description: shortDescription(dbProduct),
    image,
    price: Number(dbProduct.price),
    originalPrice: dbProduct.priceExVat ? Number(dbProduct.priceExVat) : undefined,
    category: categoryName,
    subcategory: subcategoryName,
    condition,
    location,
    seller: sellerName,
    sellerId: dbProduct.sellerId,
    sellerVerified,
    unitCount: dbProduct.stockQuantity > 0 ? dbProduct.stockQuantity : 1,
    rating,
    reviewCount: dbProduct.reviewCount ?? 0,
    views: dbProduct.views ?? 0,
    listed: formatRelativeTime(dbProduct.createdAt),
    listingContext: dbProduct.listingContext ?? undefined,
    isAvailable: availability.isAvailable,
    availabilityMessage: availability.message,
    maxPurchaseQuantity,
  };
}

/** Convenience helper for public product grids. */
export function adaptProducts(dbProducts: DBProduct[]): UIProduct[] {
  return dbProducts.filter(isSellableDBProduct).map(adaptProduct);
}
