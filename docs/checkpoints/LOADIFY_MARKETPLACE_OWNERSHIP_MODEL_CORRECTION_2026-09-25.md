# Loadify Market — Marketplace Ownership Model Correction

**Date:** 25 September 2026  
**Status:** P0 ARCHITECTURE CLARIFICATION / REQUIRED BEFORE FURTHER SUPPLIER ECN INTEGRATION  
**Canonical business model:** Platform/intermediary marketplace

## Non-negotiable rule

Loadify Market:

- does not own inventory;
- does not operate its own warehouse;
- does not pre-purchase goods;
- does not finance supplier stock;
- does not take title to goods;
- does not become retailer/seller of record simply because a listing is sourced from a supplier;
- does not hold goods before buyer purchase.

The independent seller or supplier remains the responsible commercial party for its goods and fulfilment under the applicable marketplace contract.

Loadify provides the platform and may orchestrate:

- catalogue ingestion/governance;
- listing publication;
- buyer checkout;
- Stripe payment workflow;
- order routing;
- shipping/tracking data;
- returns/disputes;
- supplier/seller settlement records;
- compliance/evidence controls.

Platform orchestration does not equal stock ownership or seller-of-record status.

## Repository conflict found

The current repository contains two competing models.

### Correct marketplace/intermediary statements already present

Examples include:

- master plan: Loadify does not own supplier inventory;
- master plan: Loadify must not silently become retailer/reseller of record;
- public Supplier page: supplier holds stock and dispatches;
- public site/footer: Loadify does not operate a warehouse;
- ECN blueprint: Loadify does not own supplier inventory.

### Conflicting legacy supplier-commerce model

The existing supplier-commerce runtime also contains a commercial mode named:

`loadify_supplier_fulfilled`

and several buyer/legal surfaces currently state or test that:

- “Loadify Market remains your seller and merchant of record”;
- “You are buying from Loadify Market”;
- supplier-fulfilled orders are sold by Loadify Market;
- legal tests expect Loadify to be seller/merchant of record.

That model conflicts with the owner-confirmed marketplace/intermediary business model and must not be propagated into the European Commerce Network.

## Immediate architecture action

ECN supplier-source selection is fail-closed until the supplier commerce commercial/legal model is corrected.

The ECN inventory source decision must not use `loadify_supplier_fulfilled` as an authoritative cross-border commercial mode.

Seller-owned inventory/location modelling may continue because it represents stock controlled by the independent seller, not Loadify.

Supplier warehouse/location modelling may continue only as a mapping of third-party supplier stock locations. It must not imply Loadify ownership.

## Required remediation workstream

Before supplier ECN routing can continue:

1. inventory every use of `loadify_supplier_fulfilled` and `loadify_direct`;
2. separate technical fulfilment actor from legal seller-of-record;
3. define one canonical supplier marketplace commercial mode that preserves independent supplier/seller responsibility;
4. update checkout/payment metadata;
5. update orders and financial ledger semantics;
6. update buyer-facing copy;
7. update Terms / Buyer Terms / Returns / Shipping wording;
8. update email copy;
9. update refund/returns routing;
10. update tests that currently require Loadify seller/MoR language;
11. prove Stripe settlement flow does not require Loadify to own stock;
12. preserve supplier-held stock and direct supplier dispatch;
13. do not activate Romania supplier routes until this is complete.

## ECN-3 interpretation

“Unified Inventory / Multi-Warehouse” means:

> visibility and routing across **seller-owned or supplier-owned stock locations**.

It never means:

- Loadify warehouse stock;
- Loadify-purchased stock;
- Loadify inventory balance sheet;
- pre-positioned inventory owned by Loadify.

A “warehouse” in ECN is always a third-party seller/supplier fulfilment location unless a future business decision explicitly changes the company model.

## Current gate

**ECN-3C supplier integration is BLOCKED by business-model inconsistency.**

ECN-3C may continue for independent seller-owned inventory paths, but supplier paths remain fail-closed until the marketplace commercial contract is corrected.


## Remediation implemented — 25 September 2026

The first production-safety remediation slice is now implemented on the multi-country branch.

### Commercial-model control

New migration:

`supabase/migrations/20260925213500_supplier_marketplace_intermediary_control.sql`

It creates a private, fail-closed market control for supplier marketplace commerce with the following invariant fields:

- `supplier_is_seller_of_record = true`
- `loadify_owns_inventory = false`
- `loadify_prepurchases_inventory = false`
- settlement model must remain one of the reviewed marketplace settlement models
- checkout cannot be enabled unless the control is explicitly verified with evidence and reviewer identity

Both GB and RO are seeded:

- status = `blocked`
- checkout = `false`
- settlement = `unconfigured`

No historical paid order is rewritten.

### New supplier checkout/payment safety gate

`prepare-supplier-checkout.ts` and `create-supplier-payment-intent.ts` now require:

`server_supplier_marketplace_commercial_readiness_v1(...)`

If the independent-supplier commercial model is not verified, both paths fail closed with:

`SUPPLIER_MARKETPLACE_COMMERCIAL_MODEL_NOT_READY`

This means no new supplier marketplace stock reservation/payment can silently continue under the obsolete Loadify seller/MoR assumption.

Existing historical orders remain serviceable through their existing snapshots/runtime paths.

### Supplier identity is now buyer-facing truth

New service-role identity projection:

`server_supplier_marketplace_identity_v1(...)`

The supplier catalogue now publishes the approved independent supplier identity for the selected offer:

- supplier id
- supplier display name
- supplier legal name

Buyer product adaptation and JSON-LD/SEO use that supplier identity instead of presenting Loadify as the seller.

The catalogue can remain discoverable while `checkoutEligible=false` until the commercial model gate is verified.

### Buyer / admin / transactional copy corrected

Current source surfaces were corrected so they no longer claim that Loadify owns or sells supplier goods:

- Featured Products
- Checkout
- Supplier Payment panel
- Buyer Orders
- Admin Orders
- transactional order email
- product SEO / JSON-LD
- UK Terms
- UK Buyer Terms
- UK Returns Policy
- UK Shipping Policy
- Romania PRELAUNCH legal draft

The legal pages now state the marketplace model consistently:

- independent seller/supplier = seller of record for the goods;
- seller/supplier retains stock responsibility;
- Loadify = marketplace/platform operator;
- Loadify may facilitate payment/order/support workflows without taking title to the goods;
- Loadify remains responsible for its own platform acts and legal obligations.

This is architecture/product alignment, not a claim that external legal review is complete.

### Legacy technical identifier

`loadify_supplier_fulfilled` remains present in historical schemas/runtime code as a technical routing identifier.

It must no longer be interpreted as:

- Loadify-owned inventory;
- Loadify-purchased inventory;
- Loadify seller-of-record status;
- Loadify merchant-of-record status for the goods.

Do not mass-rename this identifier in already-applied migrations. Future work must separate technical fulfilment routing from the legal/commercial seller identity.

### Evidence and verification

Usage inventory:

`docs/checkpoints/evidence/supplier-commercial-mode-usage-2026-09-25.txt`

Audit captured **153 repository references** requiring historical/current classification.

Current forbidden live-source audit found no remaining affirmative buyer/admin/runtime claim that:

- Loadify is seller/merchant of record for supplier goods;
- supplier goods are sold by Loadify;
- buyer is purchasing supplier goods from Loadify.

Only negative assertions in tests remain.

Verified:

- supplier/intermediary focused suite: **35/35 PASS across 7 files**
- TypeScript: **PASS**
- targeted ESLint: **PASS**
- canonical migrations: **231/231 unique versions PASS**
- build security boundary suite: **9/9 PASS**
- production build: **PASS**
- Vite: **2,501 modules transformed**
- `git diff --check`: **PASS**

### Remaining blocker

Supplier marketplace checkout must remain BLOCKED until the settlement model is evidence-backed.

The next technical/legal boundary is to replace the future-order legacy snapshots and payment semantics with an independent-supplier seller-of-record contract. Acceptable technical candidates in the control are intentionally only placeholders until validated:

- supplier Stripe Connect settlement; or
- platform collection as disclosed agent, if payment-provider/legal evidence supports it.

Neither option is considered ready merely because it exists in the schema.


## Future-order database defense — 25 September 2026

A second defense-in-depth migration has been added:

`supabase/migrations/20260925215000_supplier_marketplace_future_order_contract.sql`

It does not modify historical orders.

For **future** `loadify_supplier_fulfilled` technical-mode inserts it requires:

- approved supplier offer;
- approved supplier identity;
- published supplier marketplace projection;
- verified market commercial control;
- supplier seller-of-record identity snapshot;
- supplier legal/display name snapshot;
- supplier as invoice issuer;
- reviewed settlement-model snapshot;
- explicit Loadify marketplace-operator snapshot;
- commercial contract version 1.

The INSERT guard explicitly rejects Loadify/XDrive as the seller identity for supplier marketplace goods.

Important: the migration deliberately does **not** guess `merchantOfRecordSnapshot` or `paymentRecipientSnapshot`. Those semantics depend on the eventually reviewed Stripe/agency settlement contract and remain blocked until evidence exists.

This prevents an accidental future switch of the market readiness flag from reviving the old Loadify-as-seller order-creation semantics.

Verification:

- future-order + intermediary/checkout/payment contract suite: **23/23 PASS across 4 files**
- TypeScript: **PASS**
- canonical migrations: **232/232 unique versions PASS**
- `git diff --check`: **PASS**
