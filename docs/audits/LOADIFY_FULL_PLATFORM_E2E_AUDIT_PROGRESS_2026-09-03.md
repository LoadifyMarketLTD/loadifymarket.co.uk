# Loadify Market — Full Platform E2E Audit Progress

Date: 2026-09-03
Branch: `audit/full-platform-e2e-20260903`
Baseline main: `630da7ad550c579bbd91f46b16bfc540e235f2d6`

## Audit discipline
No source-only finding is promoted to runtime E2E PASS. Historical audit documents are treated as leads only and must be revalidated against current code/runtime.

## Current verified source findings

### Routing and authority surface
Current `src/App.tsx` exposes the corporate presentation, marketplace, authentication, Buyer, Seller, Admin, mobile, checkout, tracking and legal route families. Protected Buyer/Seller/Admin routes are wrapped by their current role/auth guards. Checkout and seller onboarding/product routes additionally use email-verification gates where defined. Current source also fail-closes a signed-in user whose authoritative `public.users` profile is missing or inactive.

### Authentication
Current source contains real Google authentication/registration implementation (`GoogleRoleRegistrationButton`, `register-social-intent`, `signInWithIdToken`, and Google OAuth handling in Login). Therefore historical documentation saying Google signup is only a Coming Soon toast is stale and must not be used as current truth.

Runtime Google E2E remains NOT YET RECONFIRMED in this audit.

### Trade Account defect — CONFIRMED
`src/pages/pixel-perfect/TradeAccount.tsx` still contains a page-local footer that conflicts with its light background and canonical brand data:
- white/white-opacity footer text on a white footer surface;
- placeholder phone `+44 (0) 20 0000 0000`;
- generic Facebook/Instagram/LinkedIn/TikTok root URLs rather than Loadify's established accounts.

This is a current production-source defect, not merely historical documentation.

The same Trade Account page also labels its postcode lookup as a source stub. Its current behavior does not perform an address lookup; after a non-empty postcode it instructs the user to enter the address manually. This must not be represented as a working postcode lookup.

### Checkout / payment creation — SOURCE BOUNDARY CONFIRMED
Current `netlify/functions/create-checkout.ts` re-reads authoritative Buyer and Seller account state under service-role execution before payment creation. It rejects inactive Buyer/Seller accounts, mismatched buyer IDs, unavailable listings, invalid quantity/stock, invalid seller lifecycle/Stripe Connect state, incomplete seller commercial identity, invalid shipping methods/rates and unsupported mixed-seller carts.

Client-provided item price/title/seller identity and shipping amount are not trusted as payment authority. Product price/seller state and shipping price are re-read from the database. Tax treatment is resolved server-side before Stripe Checkout creation.

Checkout uses a reservation token, records a pending `payment_sessions` snapshot, expires the just-created Stripe Checkout Session if persistence fails, and releases reservations on failure paths. This is strong source evidence, but runtime checkout/payment PASS is still NOT DECLARED because no Stripe test-mode transaction was executed in this audit.

### Stripe webhook / order lifecycle — SOURCE IDEMPOTENCY CONFIRMED
Current `stripe-webhook.ts` verifies Stripe signatures against configured webhook secrets before processing. Stripe events are claimed in `stripe_events` by event ID, duplicate processed/skipped events short-circuit, processing leases can be reclaimed after staleness, and failed events can be retried. This provides an explicit webhook idempotency boundary at source level.

The webhook handles checkout completion/expiry, payment-intent success/failure/cancel, refunds, disputes, Connect account updates, transfers and payouts. Payment/order mutation runtime remains NOT EXECUTED in this audit.

### Payment-session read isolation — SOURCE CONFIRMED
Current RLS source for `payment_sessions` restricts SELECT to the owning `userId` or admin. `OrderSuccessPage` looks up a session by `stripeSessionId`, but source RLS prevents ordinary users from reading another user's payment session solely by knowing a session ID. Hosted-policy parity is not reconfirmed because hosted Supabase read access is currently blocked.

### Admin surface — SOURCE GUARD CONFIRMED
Current Admin routes are wrapped by `RequireAdmin`, and the repository contains current cross-platform auth-security tests covering guard files. This is source/test-presence evidence only; Admin runtime workflows and server mutations remain unexecuted in this continuation.

### SMS
The repository explicitly documents SMS as inactive and contains an SMS sending stub. This is acceptable only if the product does not claim live SMS delivery. SMS is NOT ACTIVE / NOT E2E PASS.

### Facebook Pixel
`index.html` contains only an intentionally inactive Facebook Pixel placeholder/TODO. This is not an application defect unless analytics requirements explicitly require Facebook Pixel activation; do not count it as active telemetry.

### Playwright coverage gap
Current `playwright.config.ts` defines only Desktop Chrome (`chromium`). A dedicated mobile Playwright project is absent, so mobile parity cannot receive an automated browser E2E PASS from the present Playwright configuration alone.

### Supabase hosted verification blocker
The connected Supabase action currently rejects even the attempted read-only hosted query with a permissions error. Hosted database/RLS/feature-flag state is therefore NOT RECONFIRMED in this continuation. Existing migration/source evidence remains source evidence only; no hosted PASS is declared.

## Repairs already carried forward
The continuation branch carries the prior audit artifacts including the source migration that restores `feature_flags.rfqSystem=false`. That migration remains NOT APPLIED to hosted Production in this audit.

## Next audit lanes
Continue current-source review and runtime/test evidence for marketplace catalogue/product/cart behavior, Buyer workspace, Seller workspace, Admin operations, messaging/notifications, Netlify functions, remaining payment/order lifecycle, mobile/Capacitor, SEO/legal/accessibility, supplier-commerce fail-closed boundaries, and final release gates.
