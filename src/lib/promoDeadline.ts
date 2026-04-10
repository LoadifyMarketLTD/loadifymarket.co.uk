/**
 * Shared promo deadline constant.
 *
 * 0% commission promotion ends 31 December 2026 23:59:59 GMT (= 23:59:59 UTC).
 * Used by HeroSection.tsx and CountdownBanner.tsx for the live countdown, and
 * must match ZERO_COMMISSION_PROMO_END_UTC in netlify/functions/stripe-webhook.ts.
 */
export const PROMO_END_UTC = new Date("2026-12-31T23:59:59Z").getTime();
