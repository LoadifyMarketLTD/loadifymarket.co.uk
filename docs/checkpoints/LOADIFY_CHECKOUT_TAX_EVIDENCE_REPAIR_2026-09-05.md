# Loadify checkout tax evidence repair — 2026-09-05

## Context
A real Production checkout for the historical listing `3d décor` reached the seller tax boundary after the seller explicitly confirmed a GB non-VAT self-declaration. The seller declaration is now persisted as version 1 and is bound to authoritative Stripe Connect GB location evidence, but the pre-P1 product row has no versioned product tax evidence.

## Safety boundary
The repair must not:
- change customer-facing product prices;
- invent VAT registration or a VAT number;
- weaken the current Great Britain P1 tax boundary;
- mutate seller declarations;
- change Stripe, Environment, commission, escrow, payout, refund, dispute or supplier-commerce behaviour;
- require a Production database migration.

## Implementation
`netlify/functions/_shared/marketplaceTaxEvidenceRepair.ts` decorates the published modern web Checkout and mobile PaymentIntent wrappers.

Before the canonical handlers re-read products, the decorator:
1. requires an authenticated active account;
2. validates that all requested products belong to one seller;
3. requires authoritative Stripe Connect GB location evidence;
4. requires the seller's explicit current non-VAT self-declaration;
5. repairs only active physical products that are missing/stale compared with the canonical `buildSellerNonVatProductEvidence(price)` representation;
6. persists only `priceExVat`, `vatRate`, treatment/source/version/timestamp evidence fields;
7. fails closed if the evidence write fails;
8. delegates every other validation and payment operation to the existing canonical Checkout/PaymentIntent handlers.

New and edited listings already materialise this same evidence through `create-product.ts` and `update-product.ts`. This repair exists only for historical active listings that predate the evidence columns.

## Gate
DRAFT / NOT MERGED until exact-head Netlify Deploy Preview is READY and the existing project test/build gate passes. No Production database or Environment mutation is part of this change.
