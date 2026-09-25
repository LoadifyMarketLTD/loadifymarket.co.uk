import type { Product } from "@/components/catalog/ProductCard";

interface SupplierCatalogItem {
  id: string;
  canonicalProductId: string;
  commercialMode: "loadify_supplier_fulfilled";
  title: string;
  description: string;
  imageUrls?: string[];
  price: number;
  currency: string;
  availability?: string;
  sellableQuantity?: number;
  fulfilmentLabel?: string;
  checkoutEligible?: boolean;
  publishedAt?: string;
}

export async function fetchSupplierCatalogItem(id: string, market: "GB" | "RO" = "GB"): Promise<Product | null> {
  const response = await fetch(`/.netlify/functions/supplier-catalog?id=${encodeURIComponent(id)}&market=${market}`);
  if (!response.ok) return null;
  const payload = await response.json() as { items?: SupplierCatalogItem[] };
  const item = payload.items?.[0];
  return item ? adaptSupplierCatalogItem(item, market) : null;
}
export async function fetchSupplierCatalog(market: "GB" | "RO" = "GB"): Promise<Product[]> {
  const response = await fetch(`/.netlify/functions/supplier-catalog?market=${market}`);
  if (!response.ok) return [];
  const payload = await response.json() as { items?: SupplierCatalogItem[] };
  return (payload.items ?? []).map((item) => adaptSupplierCatalogItem(item, market));
}

function adaptSupplierCatalogItem(item: SupplierCatalogItem, market: "GB" | "RO"): Product {
  const quantity = Math.max(0, Math.floor(Number(item.sellableQuantity ?? 0)));
  const imageUrls = (item.imageUrls ?? []).filter((value) => typeof value === "string" && value.startsWith("https://")).slice(0, 12);
  return {
    id: item.id,
    canonicalProductId: item.canonicalProductId,
    commercialMode: "loadify_supplier_fulfilled",
    title: item.title,
    description: item.description,
    image: imageUrls[0] || "",
    images: imageUrls,
    price: Number(item.price),
    currency: item.currency === "RON" ? "RON" : "GBP",
    category: "Loadify Market",
    subcategory: "",
    condition: "New",
    location: market === "RO" ? "România" : "United Kingdom",
    seller: "Loadify Market",
    sellerVerified: true,
    fulfilmentLabel: item.fulfilmentLabel || "Fulfilled by approved supplier",
    unitCount: quantity,
    rating: 0,
    reviewCount: 0,
    views: 0,
    listed: item.publishedAt || "",
    listingContext: "product",
    isAvailable: item.checkoutEligible === true && quantity > 0,
    maxPurchaseQuantity: quantity,
  };
}
