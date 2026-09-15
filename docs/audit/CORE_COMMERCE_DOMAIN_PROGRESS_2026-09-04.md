# Core commerce domain progress — 2026-09-04

Current-main source audit has confirmed:

- Seller order status mutation is server-owned, seller/admin authenticated, ownership-gated and payment-backed.
- Seller-driven `delivered` is intentionally service-only at the server boundary.
- Seller Orders UI on current main is out of sync with that server contract for physical shipped orders and must be recovered from the historical audit delta.
- Buyer return/dispute browser writes are protected by RLS/system-field guards in repository source; hosted runtime parity remains an E2E gate.
- Checkout remains single-seller, server-price/stock/lifecycle validated, but Stripe test-mode vertical runtime proof remains open.

Next recovery action: rebuild the Seller Orders service-vs-physical shipped action on a fresh current-main branch and validate it before integration.
