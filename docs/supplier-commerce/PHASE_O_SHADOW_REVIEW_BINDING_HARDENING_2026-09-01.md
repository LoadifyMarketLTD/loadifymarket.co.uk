# Phase O Shadow Review Binding Hardening — 2026-09-01

## Baseline

Current main at workstream start:

`fb880a2dcfd20281f9ae76192497519bac58d576`

The Phase O autonomy guard is already fail-closed because no durable Shadow review reader is bound at runtime. This hardening closes a future semantic bypass before persistence is introduced.

## Problem closed

A generic Shadow Mode review must never be accepted as Phase O supplier-order evidence merely because it has positive metrics.

Phase O activation evidence must be bound to all of the following:

- the exact controlled pilot;
- the exact provider;
- the `order_submission` capability;
- a durable server-derived Shadow review source;
- an explicitly persistence-bound record;
- valid operator-relative metrics;
- a passed review whose timestamp is not in the future.

This prevents unrelated Shadow evidence, including shipment-stall Shadow evaluation, from satisfying the supplier-order activation gate.

## Runtime behaviour

No durable Shadow review reader is introduced by this change.

Therefore:

- `shadowReview` remains `null` in the Phase O runtime wrapper;
- `shadowReviewPersistenceBound` remains `false`;
- real Phase O activation remains blocked;
- no provider mutation is enabled;
- no customer PII disclosure is enabled;
- no payment/refund mutation is enabled.

The runtime now exposes the exact binding tuple required from a future durable reader so the persistence layer cannot silently broaden scope.

## Versioning

Phase O autonomy-readiness interface/policy advances to v2 because the Shadow evidence contract becomes stricter and explicitly scoped.

## Persistence follow-up

A future persistence implementation must be server-derived and append-only. It must not accept a caller-supplied `passed=true` review as authoritative evidence. Hosted schema changes are deliberately out of scope for this hardening PR and must receive their own migration validation and hosted reconciliation.
