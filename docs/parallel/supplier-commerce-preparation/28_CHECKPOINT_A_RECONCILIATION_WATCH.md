# CHECKPOINT A RECONCILIATION WATCH

Status: PREPARATION ONLY / READ-ONLY INPUT TO FUTURE REBASE

## Purpose

This document records foundation changes that may affect future Supplier Commerce integration. It does not import Checkpoint A runtime code into this lane and does not change Checkpoint A ownership.

Every observation below is provisional until Foundation Baseline Freeze. The final implementation must re-fetch main, live schema, migration history, APIs, auth boundaries, mobile behavior and production deployment evidence.

## Why this watch exists

Supplier Commerce will eventually depend on existing marketplace foundations including:

- authentication and active-account authorization;
- products/listings;
- checkout and payment-session evidence;
- orders and order items;
- shipments and shipment events;
- storage/POD;
- invoices;
- returns/refunds;
- notifications/mobile push;
- admin/control surfaces.

If Checkpoint A strengthens any of these contracts, Supplier Commerce must consume the strengthened contract rather than recreating an older one.

## Observed Checkpoint A changes as of 2026-08-19

### Push ownership / mobile session isolation

Observed work:

- merged runtime work from PR #511;
- repo-only 606 hardening remains pending production reconciliation;
- intended invariant: one physical active push token has at most one active owner;
- logout/session-loss behavior is being made fail-closed against cross-account notification leakage.

Supplier Commerce consequence:

- supplier/order notifications must never create a second push-token ownership model;
- future commerce notification events must address authenticated users through the canonical notification/push boundary;
- no supplier connector may address a raw device token directly.

### Shipment boundary

Observed work:

- previous combined PR #513 was superseded by DB-first #519 and server-consumer #520;
- intended DB boundary creates service-role-only shipment RPCs;
- direct client shipment writes are intended to close;
- paid shipping commercial terms are intended to become immutable during fulfilment;
- shipment/order/event transition is intended to be atomic/idempotent;
- POD is intended to become immutable and tied to lifecycle state.

Supplier Commerce consequence:

- future supplier fulfilment orchestration must call the canonical shipment/order transition boundary rather than writing shipment tables directly;
- supplier-provided carrier/tracking data is evidence/input, not authority to mutate paid customer commercial terms;
- one customer order may have future internal fulfilment legs, but customer-facing shipment truth must remain canonical and auditable.

### Storage policy hardening

Observed work:

- #521 identifies legacy cross-bucket authenticated write policies;
- intended repair removes generic cross-bucket fallbacks and preserves explicit bucket contracts.

Supplier Commerce consequence:

- supplier documents, provenance evidence, import evidence, POD and product imagery must never share a generic upload permission merely because the authenticated user owns a path;
- every future storage surface requires an explicit bucket/path/role contract;
- private supplier credentials and commercial evidence must not be exposed through product-image/public buckets.

### Active-account authorization

Observed work:

- #515 intends to make `public.users.isActive` part of live authorization;
- stale JWT role claims must not retain admin/seller authority;
- server-only suspension/reactivation is being prepared.

Supplier Commerce consequence:

- supplier/operator/admin capabilities must use live authorization, not cached role metadata alone;
- suspended sellers/suppliers/operators cannot continue imports, stock updates, fulfilment, payout requests or privileged control actions through stale tokens;
- adapter credentials may remain stored for audit/recovery while operational use is disabled according to the canonical account/supplier state.

### Immutable order commercial identity

Observed work:

- #522 identifies mutable historical product/profile identity reads;
- intended snapshots include buyer/seller identity, B2B/reverse-charge facts, product title/image and listing context;
- legacy unknown facts must remain unknown rather than being reconstructed from today's mutable state.

Supplier Commerce consequence:

- supplier offer, supplier identity, commercial cost basis, product identity and buyer-facing representation must be snapshotted at the correct business event;
- future supplier changes cannot rewrite historical customer orders;
- product discovery/import metadata must remain separate from immutable checkout/order evidence.

## Guardian blockers currently recorded

The following were verified and reported to the active Checkpoint A agent on PR #522. They remain external to this preparation lane but must be rechecked before Foundation Freeze is accepted.

### Migration identity collision

Draft #515 and #521 currently use different migrations with the same `608` sequence identity.

Future acceptance requirement:

- one linear migration order;
- unique migration identities;
- all stacked branches rebased/retargeted consistently;
- no stale references to superseded numbering.

### Shipment DB-to-consumer cutover

DB compatibility alone is not sufficient if the old server handler still contains the behavior the new consumer layer repairs.

Future acceptance requirement:

- controlled write freeze or equivalent fail-closed cutover;
- DB invariant installed and verified;
- consumer switched immediately;
- canonical RPC-only behavior verified before writes reopen;
- no false declaration that migration application alone equals shipment PASS.

### Commercial snapshot cutover

Nullable snapshot columns plus a later producer/webhook rollout can create post-cutover orders with incomplete immutable evidence.

Future acceptance requirement:

- explicit cutover boundary;
- complete evidence captured before new paid/order creation is allowed across the boundary;
- webhook/materialization writes immutable snapshots;
- post-cutover order cannot exist without required evidence;
- legacy unknown remains NULL rather than guessed.

## Reconciliation rules for this lane

When Checkpoint A changes a foundation contract:

1. Record the new invariant here.
2. Do not copy the draft implementation into Supplier Commerce.
3. Do not assume a draft PR will merge unchanged.
4. Wait for Checkpoint A atomic PASS and Foundation Baseline Freeze.
5. Re-fetch the final main implementation and live state.
6. Update Supplier Commerce integration seams to consume the final canonical contract.
7. Remove preparation assumptions that conflict with the frozen foundation.
8. Preserve historical evidence and migration compatibility.

## What this lane must NOT do

This document does not authorize:

- merging #515/#519/#520/#521/#522;
- renumbering their migrations;
- applying their SQL;
- modifying their runtime;
- creating Supplier Commerce schema in anticipation of their current drafts;
- treating their current PR descriptions as final source of truth.

## Freeze intake checklist

At Foundation Baseline Freeze, capture at minimum:

- exact main SHA;
- exact production deploy SHA/version;
- live migration head and ordered migration history;
- final auth/account-active helpers and policies;
- final shipment RPC/API contract;
- final POD/storage contract;
- final order/order-item immutable snapshot fields and producer rules;
- payment-session evidence contract;
- checkout/webhook order materialization contract;
- notification/push ownership contract;
- Android/web parity state;
- known deferred risks.

Only after that capture may this lane be reconciled into implementation planning.
