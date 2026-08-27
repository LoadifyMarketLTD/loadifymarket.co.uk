# Supplier Commerce E2E Remediation — Progress Ledger

Date: 2026-08-27
Branch: `fix/supplier-commerce-e2e-remediation-20260827`
Plan: `17_E2E_REMEDIATION_EXECUTION_PLAN_2026-08-27.md`
Baseline main: `c8f956ddee676253316156079eece4f509c2da7e`

## Safety state

- Production Supplier Commerce controls: unchanged / OFF.
- Production Supplier Commerce DDL: not applied from this branch.
- Real supplier/provider/pilot data: not created.
- Avasam capabilities/provider calls: not activated.
- PR/merge/deploy: not performed from this remediation branch yet.

## Stage status

### Stage 1 — Canonical Product Identity Bridge

Status: **IMPLEMENTED IN BRANCH — VALIDATION PENDING**

Files:
- `supabase/676_supplier_product_identity_bridge.sql`
- `supabase/migrations/20260827102500_supplier_product_identity_bridge.sql`
- `netlify/functions/__tests__/supplier-product-identity-bridge.test.ts`

Implemented:
- immutable private public-product -> canonical-supplier-product identity link;
- service-role-only link/identity decision RPCs;
- missing FK from fulfilment-leg canonical product to `private.canonical_products`;
- final DB write-boundary guard that blocks public product A -> supplier offer B contamination;
- non-supplier legs cannot carry supplier product identity;
- replay semantics preserved after later order history; new retroactive rebinding remains blocked.

Read-only hosted preflight confirmed the referenced production tables/columns exist and the Supplier Commerce fulfilment-leg-item surface currently has no rows. No DDL was executed.

### Stage 2 — Immutable Commercial-Mode Order Truth

Status: **IMPLEMENTED IN BRANCH — VALIDATION PENDING**

Files:
- `supabase/677_order_commercial_mode_truth.sql`
- `supabase/migrations/20260827104000_order_commercial_mode_truth.sql`
- `netlify/functions/__tests__/supplier-order-commercial-mode-truth.test.ts`

Implemented:
- one `public.orders` truth retained;
- explicit immutable commercial-mode snapshot for `marketplace_seller`, `loadify_supplier_fulfilled`, `loadify_direct`;
- legal seller, merchant of record, invoice issuer, payment recipient and return-responsibility snapshots;
- future Loadify-sale orders require `sellerId IS NULL`, preventing fake marketplace seller identity;
- legacy/current marketplace orders remain compatible with `commercialModeSnapshot IS NULL` and non-null sellerId;
- order-item supplier route snapshots are kept separate from customer/public product identity;
- supplier route snapshot is bound back to the Stage 1 public-product/canonical-product bridge;
- historical paid commercial truth cannot be reconstructed after the fact.

### Stage 3 — Supplier Publish + Buyer Listing Projection

Status: **IMPLEMENTED IN BRANCH — VALIDATION PENDING**

Files:
- `supabase/678_supplier_publish_projection.sql`
- `supabase/migrations/20260827114500_supplier_publish_projection.sql`
- `netlify/functions/__tests__/supplier-publish-projection.test.ts`

Implemented:
- `public.products.sellerId` becomes nullable for Loadify-sale listings without inventing a marketplace seller;
- explicit buyer-facing product `commercialMode` and supplier publication state/version;
- existing marketplace RLS visibility preserved, plus an explicit buyer-visible `loadify_supplier_fulfilled` branch;
- supplier-managed listings are server-managed and cannot be converted into marketplace seller listings;
- one provider-neutral current projection per canonical product/variant;
- append-only publication event evidence with idempotent event keys;
- publish/refresh requires the canonical `publish` control plus current stock/price/economics readiness;
- buyer-facing unit price is projected from the approved pricing snapshot, never raw supplier price;
- new listings are bound to the Stage 1 canonical identity bridge;
- hold/unpublish remains available as a safety action even while publish/global Supplier Commerce are OFF.

No Supplier Commerce control was enabled and no Supplier Commerce production DDL was applied.

### Stage 4 — Web + Mobile Checkout Consolidation

Status: **IN PROGRESS — STAGE 4A IMPLEMENTED IN BRANCH**

Stage 4A files:
- `supabase/679_supplier_checkout_consolidation.sql`
- `supabase/migrations/20260827120500_supplier_checkout_consolidation.sql`
- `netlify/functions/_shared/supplierCheckout.ts`
- `netlify/functions/__tests__/supplier-checkout-consolidation.test.ts`

Stage 4A implemented:
- repaired the existing Supplier Commerce checkout guard so `supplierRef` is propagated into the canonical control decision, which is required by controlled-pilot scope enforcement;
- added one fail-closed checkout decision from buyer-facing `public.products` to the exact current supplier projection/offer/canonical product;
- checkout decision requires active supplier publication, exact Stage 1 identity, canonical checkout control, fresh stock/price/economics evidence and known sufficient sellable quantity;
- checkout rejects stale buyer listing pricing if the current approved pricing snapshot differs from the projected snapshot or public unit price;
- returns route/evidence IDs required by reservation/payment stages without creating a reservation, payment or supplier side effect;
- added a typed fail-closed server helper for web/mobile integration.

Still required before Stage 4 can be marked complete:
- version the payment-session commercial snapshot for `loadify_supplier_fulfilled` without weakening marketplace v1;
- materialise supplier-fulfilled paid orders into the same `public.orders` / `public.order_items` truth with Stage 2 immutable snapshots;
- integrate the decision into both `create-checkout.ts` and `create-payment-intent.ts`;
- remove marketplace seller/Stripe Connect/tax assumptions from the supplier branch while preserving them unchanged for marketplace checkout;
- coordinate the supplier branch with Stage 5 atomic reservation and shipping runtime before any payment can be created.

## Next execution target

**Stage 4B — supplier-fulfilled payment-session/order materialisation contract, then Stage 5 reservation/shipping/cancellation closure and web/mobile wiring.**

Do not proceed to provider activation or Phase O pilot while Stages 1–10 are not fully validated and PASS.
