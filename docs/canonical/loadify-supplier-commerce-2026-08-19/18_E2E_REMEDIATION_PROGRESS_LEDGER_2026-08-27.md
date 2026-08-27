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

## Next execution target

**Stage 3 — Supplier Publish + Buyer Listing Projection.**

Do not proceed to provider activation or Phase O pilot while Stages 1–10 are not fully validated and PASS.
