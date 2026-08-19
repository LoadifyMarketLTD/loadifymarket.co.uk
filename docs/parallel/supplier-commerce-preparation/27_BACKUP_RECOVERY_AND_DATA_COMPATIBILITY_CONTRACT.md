# BACKUP, RECOVERY AND DATA COMPATIBILITY CONTRACT

Status: PREPARATION ONLY. No backup/restore configuration or production change is authorised by this document.

## Purpose

Ensure Supplier Commerce can be recovered without silently corrupting canonical order, finance, supplier, fulfilment or privacy state.

## Core rule

BACKUP EXISTS ≠ RECOVERY IS PROVEN.

Recovery is PASS only when restored data can be reconciled with external systems and current canonical contracts.

## Recovery domains

Supplier Commerce recovery planning must consider:
- canonical products/offers;
- supplier registry/capabilities;
- imports/provenance/compliance evidence;
- stock/price snapshots and freshness;
- reservations;
- customer orders;
- fulfilment legs;
- supplier submissions/acknowledgements;
- payments/refunds;
- financial truth events;
- shipments/tracking;
- returns/recoveries;
- incidents/audit;
- secrets/config references;
- feature flags/kill-switch state.

## External truth problem

A database restore cannot roll Stripe, suppliers, carriers or other providers back in time.

After restore/recovery, Loadify must reconcile external truth for affected periods:
- payment provider;
- supplier order status;
- supplier refund/reimbursement;
- carrier/tracking;
- provider event/webhook position where available.

Never assume restored DB state is authoritative over irreversible external side effects.

## Recovery point / recovery time

Before production rollout define target RPO/RTO by domain, not as one vague platform number.

Financial/order state may require stricter objectives than discovery analytics.

## Data compatibility

Every migration/schema/API change must consider rollback compatibility.

A deployment rollback is unsafe if the old application cannot correctly interpret data already written by the new version.

For each material migration define:
- forward compatibility;
- backward compatibility;
- data written during mixed-version window;
- rollback behavior;
- irreversible transformations;
- reconciliation steps.

## Expand/contract preference

Where practical, use staged compatible evolution:
1. additive/expand;
2. dual-read/write or compatibility layer if needed;
3. migrate/backfill with evidence;
4. switch canonical readers;
5. prove stability;
6. contract/remove old path.

Do not delete/rename critical fields in a single step merely because code compiles.

## Restore reconciliation marker

After any restore into a production-like environment, affected external-facing entities should be identifiable for reconciliation.

Examples:
- payments created after restore point;
- supplier orders submitted after restore point;
- refunds/recoveries after restore point;
- tracking events after restore point.

## Idempotent re-ingestion

Recovery may require replaying provider events. Event ingestion and financial posting must be duplicate-safe so replay converges rather than duplicates effects.

## Privacy/deletion interaction

Restores may resurrect data that was deleted/anonymised after the backup was taken.

Recovery procedure must preserve a deletion/tombstone/reconciliation mechanism sufficient to reapply required privacy deletions without corrupting legal financial history.

## Secrets

Backups should not create uncontrolled copies of provider credentials. Secret-management recovery is separate from ordinary business-table restore and must preserve rotation/revocation state.

## Disaster simulation

Before broad production scale, test at least:
- application rollback after new writes;
- database restore to a recent point;
- provider event replay after restore;
- payment/supplier-order reconciliation across restore point;
- deleted/anonymised user state reconciliation;
- stale feature-flag/kill-switch state;
- incident/audit continuity.

## Corruption / partial data

Recovery procedure must detect missing relationships and impossible states rather than silently accepting them.

Examples:
- payment completed but customer order absent;
- supplier order accepted but fulfilment leg absent;
- refund succeeded but financial event absent;
- supplier recovery recorded without linked refund;
- delivered tracking with missing shipment leg.

These become reconciliation exceptions with owner/action.

## Migration backup gate

Before any high-risk Supplier Commerce migration in production, define:
- backup/recovery readiness;
- pre-state evidence;
- post-state verification;
- rollback/forward-fix choice;
- external side-effect implications.

A backup does not justify unsafe migration design.

## PASS criteria

Backup/recovery architecture is PASS only when:
- RPO/RTO expectations are explicit;
- restore procedure is documented/tested;
- external systems are reconciled after restore;
- replay is idempotent;
- schema rollback/data compatibility is proven;
- privacy deletions are not silently undone;
- secrets are handled separately/safely;
- impossible restored states become visible exceptions;
- recovery evidence exists, not merely backup existence.
