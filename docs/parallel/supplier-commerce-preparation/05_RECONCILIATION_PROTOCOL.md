# POST-CHECKPOINT-A RECONCILIATION PROTOCOL

Purpose: ensure this parallel preparation lane can be safely connected to the agent's completed foundation later without blind merge or stale assumptions.

## Trigger

This protocol begins only after:

CHECKPOINT A = ATOMIC PASS
→ FOUNDATION BASELINE FREEZE.

Until then, this branch remains preparation-only.

## Step 1 — Capture frozen foundation

Record from the completed foundation:

- exact `main` SHA;
- migration head;
- effective schema contract;
- effective RLS/security helpers;
- canonical server write boundaries;
- auth/active-account contract;
- current order/payment/shipment/return contracts;
- mobile/web contract;
- open PRs;
- known/deferred risks;
- production deployment evidence.

## Step 2 — Compare preparation branch to frozen main

Do NOT blindly merge.

Compare:

FROZEN MAIN
↔ PARALLEL PREPARATION BRANCH.

Classify every preparation assumption as:

- STILL VALID;
- NEEDS UPDATE;
- SUPERSEDED;
- CONFLICTS WITH FOUNDATION;
- REQUIRES GATE B DECISION.

## Step 3 — Re-audit integration surfaces

Refetch and inspect at minimum:

- products/catalogue;
- seller listing model;
- checkout;
- orders/order_items;
- Stripe/payment flows;
- shipping/shipment functions;
- invoice;
- returns/refunds;
- seller balances/payouts;
- admin/super-admin;
- auth helpers;
- RLS/grants;
- mobile consumers;
- notification/event flows.

Do not carry forward a baseline observation merely because it was true at `b3cc07d...`.

## Step 4 — Execute Gate B

Use `01_GATE_B_DECISION_PACK.md` as a decision checklist, not as pre-decided answers.

Close the business/legal/financial responsibilities required by the canonical contract.

If a decision changes an earlier preparation assumption, update preparation docs before schema design.

## Step 5 — Responsibility-to-schema design

Only after Gate B PASS:

BUSINESS RESPONSIBILITY
→ CANONICAL ENTITY/BOUNDARY
→ DATA OWNERSHIP
→ AUTHORIZATION
→ API CONTRACT
→ SCHEMA DESIGN
→ MIGRATION PLAN.

Conceptual names in preparation docs are not mandatory table names.

## Step 6 — Convert backlog into implementation slices

Take `04_VERTICAL_SLICE_BACKLOG.md` and resolve each slice against:

- frozen runtime;
- Gate B contract;
- current official external rules;
- current provider capabilities.

Then execute vertically.

## Step 7 — Branch hygiene

Preferred integration pattern:

1. update/recreate implementation branch from frozen/new `main`;
2. cherry-pick or recreate only validated preparation artifacts/decisions;
3. avoid carrying stale code because this lane intentionally contains no Supplier Commerce runtime code;
4. implement first authorised vertical slice;
5. Branch Guard exact diff;
6. E2E evidence;
7. merge only when gate criteria are met.

## Step 8 — Conflict rule

If the completed foundation conflicts with this preparation lane:

FOUNDATION RUNTIME + CANONICAL CONTRACT + GATE B
win over preparation assumptions.

Do not bend the finished foundation merely to preserve a preparation document.

## Step 9 — External source refresh

Immediately before provider/legal/tax implementation, re-verify current official sources for:

- Stripe / Stripe Connect;
- UK VAT/customs;
- UK GDPR/privacy/retention;
- product/category regulations;
- supplier APIs;
- carrier APIs;
- marketplace/provider policies;
- content/image usage rights.

Provider policies and APIs may have changed while Checkpoint A was being completed.

## Step 10 — Integration PASS

Preparation reconciliation is PASS only when:

- no stale foundation assumption remains unreviewed;
- Gate B is PASS;
- no Supplier Commerce migration was created prematurely;
- no parallel order/payment/financial truth is introduced;
- no Loadify-warehouse assumption was introduced;
- provider-specific logic remains behind adapters/connectors;
- operator sourcing/import remains inside canonical review/compliance/economics pipeline;
- implementation can begin from the new canonical baseline.