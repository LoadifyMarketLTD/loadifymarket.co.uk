/**
 * Shared promo deadline constant.
 *
 * 0% commission promotion ends 31 August 2026 23:59:59 BST (= 22:59:59 UTC).
 * Used by HeroSection.tsx and CountdownBanner.tsx for the live countdown, and
 * must match ZERO_COMMISSION_PROMO_END_UTC in netlify/functions/stripe-webhook.ts.
 */
export const PROMO_END_UTC = new Date("2026-08-31T22:59:59Z").getTime();
