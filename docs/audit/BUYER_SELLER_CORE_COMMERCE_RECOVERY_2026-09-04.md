# Buyer/Seller core-commerce recovery — 2026-09-04

Current `main` is authoritative. During the full-platform E2E comparison, the historical `audit/full-platform-e2e-20260903` branch was found to contain one still-valid Seller Orders delta that is not present on current `main`.

## Valid recovery delta

Current `main` Seller Orders allows a seller-facing `Mark as Delivered` action for every shipped order. The server boundary `seller-order-status` correctly allows seller-driven `delivered` only for service listings; physical product delivery must be driven by shipment/tracking state and buyer confirmation.

The historical audit branch already separated these paths by loading `products.listingContext`: service orders expose `Mark Job as Completed`, while physical shipped orders expose `Manage Shipment` and route to `/seller/shipments`.

This is classified as **VALID RECOVERY DELTA**. It must be rebuilt from current `main`; the historical branch itself must not be merged wholesale.

## Already in main / superseded

The server-side `seller-order-status.ts` implementation is already identical between current `main` and the historical audit branch, including ownership checks, payment-backed transition guard, and service-only seller `delivered` transition. No server file should be recovered from the stale branch for this defect.

## Safety

No database migration, Stripe mutation, production secret change, supplier activation, Auth change, or historical branch wholesale merge is part of this recovery.
