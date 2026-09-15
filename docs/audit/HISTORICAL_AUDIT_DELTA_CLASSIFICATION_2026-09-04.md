# Historical audit delta classification — 2026-09-04

Compared `audit/full-platform-e2e-20260903` against current `main` file-by-file.

## Confirmed classifications

### SellerOrders.tsx — VALID RECOVERY DELTA
Current main exposes a seller-side delivered action for every shipped order. Historical audit correctly loads `listingContext`: service orders may be marked complete; physical product orders route to Shipment Management. Rebuilt separately in PR #737 from current main.

### seller-order-status.ts — ALREADY IN MAIN
The server boundary is identical between main and the historical audit branch and already limits seller-driven `delivered` to service listings.

### create-shipment.ts — SUPERSEDED BY MAIN
Historical branch predates the Royal Mail/Evri policy now present in main. Do not recover this historical file.

### update-shipment-status.ts — VALID SELECTIVE RECOVERY DELTA
Historical audit contains a stronger physical-commerce boundary that fails closed when shipment order/product context cannot be verified and rejects shipment tracking for non-`product` listing contexts. Current main lacks that explicit physical-only check. Port only this integrity delta onto a fresh shipping recovery branch; preserve newer current-main behavior.

### send-message.ts — MIXED / SELECTIVE RECOVERY ONLY
Historical audit improves two boundaries: receiver must be the *other* conversation participant (preventing self-receiver misuse), and structured-message suppression parses JSON and only suppresses known internal `_t=offer|system` messages instead of suppressing every user message beginning with `{`. However current main has newer notification-preference handling that the historical branch lacks. Do not replace the whole file; selectively port only the two still-valid checks while preserving current preference logic.

### confirm-delivery.ts + BuyerOrders escrow state/copy — RECOVERED
The valid P0 financial delta was already rebuilt on current main and is now production-deployed.

### remaining files
`e2e/mobile-smoke.spec.ts`, `playwright.config.ts`, RFQ flag migration and audit docs remain to be classified in their own domains before the historical branch can be marked delete-safe.
