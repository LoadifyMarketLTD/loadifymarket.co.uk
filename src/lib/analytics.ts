/**
 * analytics.ts — lightweight GA4 event helpers.
 *
 * Wraps window.gtag so callers do not have to check for its existence and do
 * not pull in a full analytics SDK.  All calls are no-ops when GA4 is not
 * loaded (e.g. in test environments or when VITE_GA_MEASUREMENT_ID is unset).
 *
 * Usage:
 *   import { trackEvent, trackProductView, trackCheckout, trackRegister } from '@/lib/analytics';
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

/** Generic GA4 event. */
export function trackEvent(eventName: string, params?: Record<string, unknown>): void {
  try {
    if (typeof window !== "undefined" && typeof window.gtag === "function") {
      window.gtag("event", eventName, params ?? {});
    }
  } catch (err) {
    // Never let analytics errors surface to the user.
    if (import.meta.env.DEV) {
      console.error("[analytics] trackEvent error:", err);
    }
  }
}

/** Track when a buyer begins the checkout flow. */
export function trackCheckout(items: Array<{ id: string; name: string; price: number; quantity?: number }>): void {
  trackEvent("begin_checkout", {
    currency: "GBP",
    items: items.map((item) => ({
      item_id: item.id,
      item_name: item.name,
      price: item.price,
      quantity: item.quantity ?? 1,
    })),
  });
}

/** Track a successful user registration. */
export function trackRegister(method: "email" | "google" | "apple" = "email"): void {
  trackEvent("sign_up", { method });
}

/** Track a product detail page view. */
export function trackProductView(productId: string, productName: string, price?: number): void {
  trackEvent("view_item", {
    currency: "GBP",
    items: [
      {
        item_id: productId,
        item_name: productName,
        ...(price !== undefined ? { price } : {}),
      },
    ],
  });
}

/** Track a search query. */
export function trackSearch(searchTerm: string): void {
  trackEvent("search", { search_term: searchTerm });
}

/** Track when a buyer submits an offer. */
export function trackOfferCreated(params: {
  conversationId: string;
  amountPence: number;
  listingId?: string;
}): void {
  trackEvent("offer_created", {
    conversation_id: params.conversationId,
    value: params.amountPence / 100,
    currency: "GBP",
    ...(params.listingId ? { item_id: params.listingId } : {}),
  });
}

/** Track when a seller accepts an offer. */
export function trackOfferAccepted(params: {
  offerId: string;
  amountPence: number;
  listingId?: string;
}): void {
  trackEvent("offer_accepted", {
    offer_id: params.offerId,
    value: params.amountPence / 100,
    currency: "GBP",
    ...(params.listingId ? { item_id: params.listingId } : {}),
  });
}

/** Track when a payment is confirmed (offer → order → paid). */
export function trackOfferPaid(params: {
  orderId: string;
  amountPence: number;
  listingId?: string;
}): void {
  trackEvent("purchase", {
    transaction_id: params.orderId,
    value: params.amountPence / 100,
    currency: "GBP",
    ...(params.listingId ? { items: [{ item_id: params.listingId }] } : {}),
  });
}

/** Track when a user views the home page. */
export function trackViewHome(): void {
  trackEvent("view_home");
}

/** Track when a product link is copied to clipboard. */
export function trackCopyLink(productId: string): void {
  trackEvent("copy_link", { item_id: productId });
}

/** Track when a product is shared to a social channel. */
export function trackShareProduct(
  channel: "facebook" | "whatsapp" | "messenger" | "native" | "instagram" | "tiktok",
  productId: string,
  productName?: string,
): void {
  trackEvent("share", {
    method: channel,
    item_id: productId,
    ...(productName ? { item_name: productName } : {}),
  });
}

/** Track when a seller begins creating a new listing. */
export function trackStartListing(): void {
  trackEvent("start_listing");
}

/** Track when a seller publishes a listing. */
export function trackPublishListing(productId: string, productName?: string): void {
  trackEvent("publish_listing", {
    item_id: productId,
    ...(productName ? { item_name: productName } : {}),
  });
}

/** Track when a buyer adds a product to cart. */
export function trackAddToCart(productId: string, productName: string, price: number): void {
  trackEvent("add_to_cart", {
    currency: "GBP",
    value: price,
    items: [{ item_id: productId, item_name: productName, price, quantity: 1 }],
  });
}

/** Track when a buyer messages a seller from a product page. */
export function trackMessageSeller(productId: string): void {
  trackEvent("message_seller", { item_id: productId });
}

/** Track when a buyer starts the checkout flow. */
export function trackStartCheckout(items: Array<{ id: string; name: string; price: number; quantity?: number }>): void {
  trackEvent("start_checkout", {
    currency: "GBP",
    items: items.map((item) => ({
      item_id: item.id,
      item_name: item.name,
      price: item.price,
      quantity: item.quantity ?? 1,
    })),
  });
}

/** Track a completed purchase (alias for trackOfferPaid with a simpler signature for direct checkout). */
export function trackCompletedPurchase(params: {
  orderId: string;
  value: number;
  productId?: string;
}): void {
  trackEvent("completed_purchase", {
    transaction_id: params.orderId,
    value: params.value,
    currency: "GBP",
    ...(params.productId ? { item_id: params.productId } : {}),
  });
}
