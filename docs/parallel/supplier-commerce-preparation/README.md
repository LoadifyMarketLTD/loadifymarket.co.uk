# LOADIFY SUPPLIER COMMERCE — PARALLEL PREPARATION LANE

Status: PREPARATION ONLY / NO RUNTIME IMPLEMENTATION / NO MIGRATIONS / NO PRODUCTION CHANGES

This branch exists to prepare Supplier Commerce while the active agent finishes Checkpoint A.

It is intentionally based on the controlling contract branch `canonical-contract/supplier-commerce-20260819` so every preparation artifact inherits the full 2210-line Canonical Execution Contract plus the 19 August 2026 product-direction clarification.

## Hard boundary

Until Checkpoint A PASS → Foundation Baseline Freeze → Gate B PASS:

- no Supplier Commerce migration;
- no production DB write;
- no production Stripe change;
- no supplier credential/integration activation;
- no new runtime lifecycle;
- no final table names assumed;
- no provider-specific commerce-core code;
- no merge into active Checkpoint A branches;
- no modification of agent PRs #513/#514/#515/#517 from this lane.

## What this lane IS allowed to prepare

1. Gate B business-decision pack.
2. Target architecture and boundaries.
3. Current-runtime integration map.
4. Discovery / sourcing / supplier capability taxonomy.
5. Operator-driven product import contract.
6. No-Loadify-warehouse Supplier-Fulfilled model.
7. Canonical Product / Supplier Offer responsibility split.
8. AI Product Builder / Facts Lock responsibilities.
9. Landed cost / stock / price / order / payment / tracking / return / recovery contracts at responsibility level.
10. Vertical-slice implementation backlog for Phases C→Q.
11. E2E scenario catalogue and failure paths.
12. Reconciliation protocol for rebasing onto the post-Checkpoint-A baseline.

## Current product intent

Loadify supports three commercial surfaces without creating parallel platform truths:

- Marketplace Seller;
- Loadify-operated product sourcing/catalogue control;
- Loadify Supplier-Fulfilled commerce.

The target Supplier-Fulfilled model does NOT require a Loadify-owned physical warehouse. Approved supplier/fulfilment providers may hold stock and ship directly to the customer while Loadify controls the canonical customer-facing commerce experience according to Gate B.

External ecosystems may serve different roles:

DISCOVERY SOURCE
≠ CATALOG SOURCE
≠ SUPPLIER
≠ FULFILMENT PROVIDER.

TikTok, Amazon, Alibaba, AliExpress, wholesalers and manufacturers are examples only. Their actual capabilities, rights and policies must be verified from current official sources before provider-specific implementation.

## Read order

1. `01_GATE_B_DECISION_PACK.md`
2. `02_TARGET_ARCHITECTURE.md`
3. `03_CURRENT_RUNTIME_INTEGRATION_MAP.md`
4. `04_VERTICAL_SLICE_BACKLOG.md`
5. `05_RECONCILIATION_PROTOCOL.md`

This lane may become implementation work only after the canonical sequence authorises it.