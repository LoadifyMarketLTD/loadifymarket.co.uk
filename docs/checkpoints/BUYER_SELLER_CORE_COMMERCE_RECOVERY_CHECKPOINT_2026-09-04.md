# Buyer/Seller Core Commerce Recovery Checkpoint — 2026-09-04

Source of truth: current `main`.

Recovered defect: Seller Orders UI exposed a generic seller-side `Mark as Delivered` action for physical shipped orders even though the server boundary only allows seller-driven delivery for service listings. Physical orders must transition through shipment management/tracking instead.

Recovery rule: port only the still-valid UI distinction from the historical full-platform audit branch. Do not merge the historical branch wholesale.

Expected implementation: load product `listingContext`; for shipped service orders expose `Mark Job as Completed`; for shipped physical product orders expose `Manage Shipment` linking to `/seller/shipments`.

No migration, payment mutation, Auth change, supplier activation, or production secret change.
