# Branch classification — audit/full-platform-e2e-20260903

Compared against current main on 2026-09-04.

Overall classification: **MIXED HISTORICAL RECOVERY SOURCE — DO NOT MERGE WHOLESALE**.

Confirmed examples:
- `netlify/functions/seller-order-status.ts`: already identical to current main — ALREADY IN MAIN.
- `netlify/functions/create-shipment.ts`: historical branch is older than current Royal Mail/Evri policy — SUPERSEDED BY MAIN.
- `netlify/functions/confirm-delivery.ts` + Buyer Orders escrow copy/state: valid delta was recovered separately and integrated through the P0 recovery.
- `src/pages/pixel-perfect/seller/SellerOrders.tsx`: still contains one valid service-vs-physical shipped-order UI distinction absent from main — VALID RECOVERY DELTA.
- historical audit docs/checkpoints: EVIDENCE / CHECKPOINT ONLY.

The remaining changed files (`send-message`, `update-shipment-status`, mobile smoke, Playwright config, RFQ flag migration) require their own domain comparisons before this branch can be considered stale/delete-safe.
