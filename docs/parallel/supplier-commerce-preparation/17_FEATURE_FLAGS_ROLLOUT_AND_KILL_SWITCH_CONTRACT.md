# FEATURE FLAGS, ROLLOUT AND KILL SWITCH CONTRACT

Status: PREPARATION ONLY. Defines control-plane behavior and safety responsibilities, not implementation details or final table names.

## 1. Core rule

Supplier Commerce must be controllable server-side.

A UI toggle alone is not a rollout control.

The platform must be able to stop new risky actions without destroying historical truth or leaving in-flight orders invisible.

## 2. Control scopes

Future controls may need scope by:

- entire Supplier Commerce subsystem;
- provider/source;
- supplier;
- supplier offer;
- product/category;
- territory;
- operation/capability;
- cohort/pilot;
- operator role;
- mobile/web consumer where technically necessary but without diverging business rules.

Final scopes must be justified by business/runtime needs.

## 3. Server enforcement

Critical flags/kill switches must be evaluated at canonical server boundaries for actions such as:

- supplier import/sync;
- publish/sellability;
- checkout eligibility;
- reservation;
- supplier order submission;
- tracking ingestion;
- return/recovery actions;
- provider-specific operations.

Client UI may reflect state but cannot be the only enforcement.

## 4. Deterministic behavior

For each flag/control define:

- default state;
- scope;
- authority to change;
- server behavior when disabled;
- treatment of in-flight work;
- observability/audit;
- rollback/recovery implications.

Unknown configuration must fail safely rather than silently enabling high-risk behavior.

## 5. Global Supplier Commerce kill switch

A global kill switch should be capable of stopping new Supplier Commerce actions while preserving:

- existing customer orders;
- payment history;
- supplier submissions already made;
- tracking/history;
- returns/refunds;
- reconciliation records;
- audit evidence.

The exact allowed operations during kill state must be defined so recovery/customer support can continue.

## 6. Supplier kill switch

When one supplier is paused/suspended:

- new offer selection should stop according to policy;
- new supplier order submission should stop;
- affected in-flight orders must be surfaced;
- tracking/reconciliation may need to continue;
- historical data remains immutable/auditable;
- alternate supplier fallback may occur only through an explicit orchestrated decision.

## 7. Provider/source kill switch

A connector/provider can fail independently of a supplier.

Disabling a provider should not automatically rewrite source facts or delete existing supplier/product records.

The system must distinguish:

- stop new sync/import;
- stop new supplier order calls;
- preserve last known evidence with freshness state;
- allow controlled retry/recovery;
- alert operators to stale dependent offers.

## 8. Offer/product sellability switch

Product/offer controls should be able to stop new checkout while preserving:

- product identity;
- source evidence;
- prior orders;
- customer support context;
- supplier history.

Unpublishing/removing from sellability is not deletion of commercial history.

## 9. Pilot rollout

Controlled pilot should use explicit cohort/scope controls.

Example preparation model:

- one approved supplier;
- Great Britain scope unless Gate B changes it;
- small low-risk product set;
- explicit operator cohort;
- limited order volume/value;
- rollback/kill-switch available;
- enhanced observability.

Exact pilot numbers are not fixed here.

## 10. Progressive rollout

Potential stages:

OFF
→ INTERNAL/OPERATOR ONLY
→ SIMULATOR
→ CONTROLLED PILOT
→ LIMITED PRODUCTION
→ CONTROLLED SCALE
→ GENERAL AVAILABILITY.

These are conceptual stages, not mandatory enum values.

Promotion requires evidence from the prior stage; elapsed time alone is not sufficient.

## 11. In-flight behavior

A kill switch must not create undefined state.

For each operation classify whether an in-flight action should:

- complete;
- stop before external side effect;
- move to hold/manual review;
- retry later;
- compensate/reconcile.

Special attention:

- payment already captured;
- supplier submission already sent;
- acknowledgement response lost;
- shipment already dispatched;
- refund already issued;
- supplier recovery pending.

## 12. Audit

Control changes should preserve:

- actor/system;
- previous state;
- new state;
- scope;
- reason;
- timestamp;
- incident/change reference where relevant.

Do not allow silent control changes for material commerce behavior.

## 13. Authorization

Only appropriate trusted server/admin authority may change material rollout controls.

Final authorization must inherit the post-Checkpoint-A active-account/admin contract.

Do not design Supplier Commerce authorization against stale pre-freeze helpers.

## 14. Observability

Dashboards/alerts should expose:

- current control state;
- affected suppliers/offers/orders;
- attempts blocked by control;
- stale data caused by disabled sync;
- recovery backlog;
- incident linkage.

A kill switch that hides impact is incomplete.

## 15. Recovery

Re-enabling must not blindly replay every failed action.

Recovery should identify:

- operations safe to retry;
- operations requiring idempotency lookup;
- external side effects that may already have happened;
- stale stock/price/compliance that must refresh first;
- orders requiring manual review.

## 16. E2E acceptance

Future E2E must prove:

1. UI bypass cannot defeat server-side disable state;
2. supplier kill switch blocks new submissions while retaining tracking for existing shipments;
3. global kill switch does not erase/lose in-flight orders;
4. provider sync disable causes correct stale-state behavior rather than false freshness;
5. re-enable does not duplicate supplier orders;
6. rollout scope limits pilot exposure;
7. unauthorized users cannot alter material controls;
8. control changes are auditable;
9. disabled commerce still permits necessary refund/recovery/support paths according to policy;
10. rollback can be demonstrated rather than merely described.

## 17. Gate rule

Final control names, storage, admin UI and state-machine integration are designed only after Foundation Freeze and Gate B.

Invariant:

CONTROL PLANE MUST BE SERVER-ENFORCED, AUDITABLE, FAIL-SAFE AND HISTORY-PRESERVING.