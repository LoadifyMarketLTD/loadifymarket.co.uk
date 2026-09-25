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
