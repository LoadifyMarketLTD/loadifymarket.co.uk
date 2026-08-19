# POST-FREEZE REBASE AND VALIDATION RUNBOOK

Status: PREPARATION ONLY / EXECUTE ONLY AFTER CHECKPOINT A ATOMIC PASS AND FOUNDATION BASELINE FREEZE

## Objective

Define the exact discipline for turning this preparation lane into implementation work without carrying stale assumptions from the pre-freeze repository.

## Trigger condition

Do not execute this runbook until all of the following are true:

- Checkpoint A is declared PASS with real evidence for every required gate;
- Foundation Baseline Freeze is captured;
- the final main SHA is known;
- production deployment corresponding to the frozen foundation is independently verified where required;
- live migration history is captured;
- unresolved P0/P1 foundation issues are either closed or explicitly documented as accepted blockers/deferrals according to the canonical contract.

If any condition is missing, remain PREPARATION ONLY.

## Stage 1 — Freeze capture

Record immutable references for:

- GitHub main SHA;
- production deploy identifier/SHA;
- migration head;
- schema snapshot;
- API/function surfaces;
- auth/RLS helper definitions;
- checkout/payment/webhook boundaries;
- order/shipment/return/refund boundaries;
- storage policies and buckets;
- mobile build/runtime contract;
- active feature flags;
- open/deferred risks.

The freeze record is evidence, not a prose summary only.

## Stage 2 — Preparation-lane inventory

Inventory every file in this lane and classify each statement as one of:

- CANONICAL INTENT — derived from the controlling Supplier Commerce contract/product direction;
- VERIFIED BASELINE — supported by the frozen foundation;
- PRE-FREEZE OBSERVATION — must be revalidated;
- PROPOSAL — architecture option awaiting Gate B;
- OWNER DECISION — cannot be resolved technically;
- DEFERRED — not needed for the first vertical slice.

No PRE-FREEZE OBSERVATION may silently become an implementation fact.

## Stage 3 — Reconcile foundation seams

Re-audit, at minimum:

### Identity and authorization

- user roles;
- active/suspended account semantics;
- admin/operator boundary;
- seller authority;
- server/service-role boundaries;
- RLS helpers;
- audit logging.

### Catalogue

- product identity;
- listing lifecycle;
- seller ownership;
- images/storage;
- shipping methods;
- reservations;
- search/indexing surfaces.

### Checkout/payment

- web checkout;
- mobile payment intent;
- payment_sessions evidence;
- Stripe metadata;
- webhook materialization;
- immutable financial amounts;
- B2B/VAT/reverse-charge snapshots.

### Order history

- order/order-item snapshots;
- invoice consumers;
- buyer/admin order views;
- tracking consumers;
- immutable commercial history.

### Fulfilment

- shipment RPCs/APIs;
- status mapping;
- events;
- POD;
- tracking;
- notification side effects;
- idempotency.

### Returns/refunds/recovery

- buyer return flow;
- payment refund source of truth;
- seller/supplier recovery boundaries;
- financial reconciliation.

## Stage 4 — Rebase strategy

The preparation branch must not be merged wholesale into main simply because it is docs-only.

Preferred process:

1. Create a fresh implementation branch from exact frozen main.
2. Bring across only the canonical documentation still valid after reconciliation.
3. Update stale baseline observations.
4. Preserve the original canonical contract unchanged.
5. Record the freeze SHA used as implementation base.
6. Run Branch Guard before any runtime write.

If a direct rebase of the preparation branch is used, compare the complete diff against frozen main and prove that no Checkpoint A implementation was accidentally overwritten or reverted.

## Stage 5 — Gate B resolution before schema

Before Supplier Commerce migrations exist, Gate B must resolve the business contract needed to decide ownership, money flow, tax responsibility, returns/refunds, supplier relationship and customer-facing obligations.

The resolved Gate B output must be written as a versioned contract and linked from implementation PRs.

No final table names, lifecycle enums or irreversible data model choices should be made before this resolution.

## Stage 6 — Implementation conversion

Convert preparation into runtime one vertical slice at a time.

Each slice must contain:

- one business capability;
- exact source-of-truth definition;
- minimal schema/API changes required;
- authorization/security boundary;
- idempotency/concurrency rules;
- failure handling;
- observability;
- rollback/data-compatibility plan;
- focused tests;
- evidence-based acceptance criteria.

Avoid broad schema-first rollout.

## Stage 7 — Pre-write verification

Immediately before each implementation write:

- fetch current main;
- fetch live migration head if DB-related;
- fetch current provider docs if external rules are involved;
- verify that no parallel PR already changes the same contract;
- verify the intended change remains necessary;
- identify the exact rollback boundary.

If mutable evidence differs from the plan, update the plan first.

## Stage 8 — Branch Guard after every change

After every change:

- inspect exact diff;
- verify only intended files changed;
- compare to canonical business contract;
- compare to frozen foundation;
- verify no UI/Workspace scope creep unless the slice explicitly authorizes UI work;
- verify no provider-specific logic leaked into core;
- verify no client-write bypass was introduced;
- verify historical facts are not rewritten;
- verify failure paths fail closed where required.

If any check fails, stop, repair/revert, then re-run Branch Guard.

## Stage 9 — Test evidence hierarchy

A PASS requires evidence from the right layer.

Examples:

- compile/type/build PASS does not prove DB migration applied;
- migration applied does not prove consumer cutover safe;
- unit test PASS does not prove production credential/provider behavior;
- deploy preview PASS does not prove production E2E;
- UI screenshot does not prove authorization;
- RLS policy existence does not prove service-role handler correctness.

Record each gate separately.

## Stage 10 — Controlled rollout

For any change where old and new components cannot safely overlap:

- define the cutover boundary;
- stop or fail-close the relevant writes;
- install backward-compatible foundation if possible;
- switch consumers;
- verify exact behavior;
- reopen writes;
- reconcile any queued/retried work.

Never accept an unsafe compatibility window simply because both versions can technically execute.

## Stage 11 — Data reconciliation

Before enforcing a new invariant:

- inspect live conflicting rows;
- preserve historical evidence;
- choose deterministic, documented reconciliation only where facts support it;
- fail migration rather than silently discarding unresolved contradictory history;
- record counts before and after;
- validate the installed invariant.

## Stage 12 — Rollback validation

Rollback must answer:

- can code roll back while schema is forward-only?
- can old consumers tolerate new nullable fields/APIs?
- can a feature flag stop new writes?
- can queued jobs be replayed?
- can supplier calls be retried without duplicate orders/charges?
- what state remains immutable even if a deployment is rolled back?

A rollback plan that only says `git revert` is insufficient.

## Completion criteria for reconciliation

The post-freeze reconciliation is complete only when:

- every preparation assumption has been classified/revalidated;
- Gate B has a resolvable decision pack;
- the implementation branch is based on exact frozen main;
- no migration identity conflict exists;
- no stale API/schema reference remains;
- source-of-truth ownership is explicit;
- the first vertical slice can be implemented without inventing business rules;
- rollback/test/observability expectations are known before code begins.
