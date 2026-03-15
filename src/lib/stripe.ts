import { loadStripe } from '@stripe/stripe-js';

/**
 * Lazy-initialised Stripe.js promise.
 *
 * `loadStripe` is called once at module load time and the resulting Promise is
 * memoised — subsequent calls re-use the same instance.  Used by any component
 * that needs the Stripe.js SDK (e.g. <Elements>, confirmCardPayment, etc.).
 *
 * The checkout redirect flow (/.netlify/functions/create-checkout → window.location.href)
 * does NOT require this promise, but it is exported here so that components using
 * Stripe Elements or manual payment confirmation can import it consistently from
 * a single location.
 *
 * Environment variable: VITE_STRIPE_PUBLISHABLE_KEY  (pk_live_... or pk_test_...)
 * Must be set in Netlify → Site configuration → Environment variables.
 */

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;

if (!publishableKey) {
  console.warn(
    '[Stripe] VITE_STRIPE_PUBLISHABLE_KEY is not set. ' +
    'Stripe.js will not be initialised. ' +
    'Set the variable in Netlify → Site configuration → Environment variables.'
  );
}

/**
 * Resolves to a `Stripe` instance when `VITE_STRIPE_PUBLISHABLE_KEY` is set,
 * or `null` when the variable is absent (e.g. local dev without .env).
 */
export const stripePromise = publishableKey ? loadStripe(publishableKey) : Promise.resolve(null);
