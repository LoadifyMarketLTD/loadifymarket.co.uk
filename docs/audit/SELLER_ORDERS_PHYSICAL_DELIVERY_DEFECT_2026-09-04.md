# Seller Orders physical-delivery defect — current main

Defect: the current Seller Orders UI exposes `Mark as Delivered` for any shipped order. The server boundary rejects seller-driven delivery for physical product listings and permits it only for service listings. This creates a misleading/dead action for physical commerce and bypasses the intended shipment-management UX.

Correct behavior: shipped service -> `Mark Job as Completed`; shipped physical product -> `Manage Shipment` -> `/seller/shipments`.

This exact distinction exists in the historical full-platform audit branch and is approved for selective recovery onto a fresh current-main branch.
