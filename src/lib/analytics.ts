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
