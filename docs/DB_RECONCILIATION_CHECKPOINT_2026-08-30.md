# Supabase DB Reconciliation Checkpoint — 2026-08-30

## Status

**NON-DESTRUCTIVE / RUNTIME ISOLATED / HOSTED INTROSPECTION PENDING**

Repository: `LoadifyMarketLTD/loadifymarket.co.uk`  
Baseline branch: `main`  
Baseline commit at checkpoint creation: `4a798ee8c01e3af8b004f4870feafa62eed7866c`

This checkpoint records a governance decision for database structures reported as created manually in the hosted Supabase SQL Editor. It does **not** assert that those hosted objects were independently introspected from GitHub or through the Supabase connector.

The SQL Editor execution result reported for the manual scripts was `Success. No rows returned`. That confirms only that the submitted SQL completed without returning rows; it is not, by itself, proof that the resulting schema is the canonical application contract or that every RLS/grant/dependency is correct.

## Core decision

The application runtime remains bound to the canonical contracts already represented by `main`. Manually-created parallel structures are isolated until a dedicated hosted-database inspection proves whether they should be consolidated, migrated, retained for a defined purpose, or later removed.

There is **no destructive cleanup in this checkpoint** and **no runtime repointing**.

## Reconciliation matrix

| Hosted / reported structure | Decision | Runtime rule |
| --- | --- | --- |
| `seller_profiles` | **KEEP CANONICAL** | Use only the existing canonical `seller_profiles` contract. Do not create or adopt a second seller-profile model. |
| `stripe_webhook_events` | **DO NOT USE / ISOLATED** | Runtime continues to use the canonical Stripe event/idempotency path. Do not read from or write to this parallel table. |
| `in_app_notifications` | **DO NOT USE / ISOLATED** | Runtime continues to use the canonical notification path. Do not read from or write to this parallel table. |
| `escrow_ledger` | **INACTIVE / DO NOT USE** | Preserve the existing escrow/release implementation and Stripe transfer/idempotency protections. Do not introduce a second ledger contract. |
| `disputes_and_returns` | **PENDING INSPECTION / CONSOLIDATION REVIEW** | Do not bind runtime. Inspect overlap with the existing dispute/refund model before any adoption. |
| `vendor_sync_feeds` | **PENDING INSPECTION / CANONICALIZATION REQUIRED** | Concept may be useful for supplier integrations, but it must not become a runtime contract until explicitly reconciled with the canonical supplier-commerce model. |
| `product_variants_3p` | **PENDING INSPECTION / CONSOLIDATION REVIEW** | Do not bind runtime until the current product/SKU/variant model is compared field-by-field. |

## Canonical runtime invariants

Until a future reconciliation PR explicitly changes one of these rules:

1. Seller identity/profile behavior uses the canonical `seller_profiles` contract.
2. Stripe webhook processing and idempotency stay on the canonical Stripe event path already used by the application.
3. In-app notifications stay on the canonical notification path already used by the application.
4. Disputes/refunds stay on the existing canonical dispute/refund workflow.
5. Escrow/release behavior stays on the existing canonical release flow; no parallel `escrow_ledger` is introduced into runtime.
6. Checkout preserves the existing server-side validated **single-seller checkout invariant**. This checkpoint does not introduce split checkout, multi-seller settlement, or a payment-contract rewrite.
7. Existing targeted RLS/grant hardening remains the security model. This checkpoint does not replace targeted hardening with a blanket privilege revocation.

## Runtime denylist

The following identifiers are **not approved runtime contracts** at this checkpoint:

```text
stripe_webhook_events
in_app_notifications
escrow_ledger
disputes_and_returns
vendor_sync_feeds
product_variants_3p
```

They must not be introduced into application runtime code, Edge Functions, checkout/payment flows, webhook processing, notification delivery, Seller Workspace data access, or scheduled jobs unless a later reconciliation PR:

- includes hosted Supabase introspection evidence;
- documents the canonical ownership of the data;
- proves that the proposed object does not create a competing source of truth;
- defines migration/backfill behavior where needed;
- verifies RLS, grants, service-role access and FK dependencies;
- includes the relevant application tests and rollback plan.

At checkpoint creation, a repository code search on `main` found no runtime references to the six denylisted identifiers above. This is a source-code observation only; it is not hosted-database introspection.

## Explicitly prohibited operations

Until hosted introspection is available and reviewed, do **not**:

- run `DROP TABLE`, destructive `ALTER TABLE`, destructive column/type rewrites, or data-deleting cleanup against the reported parallel structures;
- repoint runtime reads/writes from canonical tables to the parallel structures;
- introduce triggers that copy data between canonical and parallel structures;
- add compatibility views that silently make the parallel structures appear canonical;
- change checkout/payment semantics as part of database cleanup;
- replace the current escrow/release flow with `escrow_ledger`;
- run a blanket `REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public ...` or equivalent global revocation without a complete RPC inventory and explicit per-function review;
- weaken RLS, grants, authentication checks, seller isolation, Stripe protections or fail-closed behavior to make a parallel table easier to use.

## Hosted inspection gate

Before any cleanup, consolidation or adoption, inspect the actual hosted Supabase project and record evidence for every candidate structure:

### Object existence and shape

- exact table/view/function identity;
- columns, data types, defaults and nullability;
- primary keys and unique constraints;
- indexes;
- foreign keys and dependent objects;
- triggers and trigger functions;
- comments/ownership metadata where relevant.

### Data state

- row count;
- whether rows are production data, test data or empty scaffolding;
- timestamps/ranges showing whether anything is actively writing to the object;
- duplicate/conflicting records relative to the canonical model.

### Security state

- `ENABLE ROW LEVEL SECURITY` state;
- all RLS policies and their `USING` / `WITH CHECK` expressions;
- table/schema/function grants for `anon`, `authenticated`, `service_role` and any custom roles;
- function `SECURITY DEFINER` / `SECURITY INVOKER` behavior and `search_path` hardening;
- whether any webhook, Edge Function or server process has access through `service_role`.

### Runtime/dependency state

- application code references;
- Edge Function references;
- database function/trigger references;
- scheduled jobs or webhook dependencies;
- API clients or external supplier integrations using the object;
- dependency direction between canonical and parallel structures.

## Decision gate after introspection

Each isolated structure must receive one explicit final verdict:

- **KEEP CANONICAL** — it is the canonical object and remains in use;
- **CONSOLIDATE** — useful data/fields are migrated into the canonical contract, with one source of truth afterward;
- **REMOVE LATER** — confirmed unused/redundant object, removed only by a reviewed destructive migration with dependency and rollback evidence;
- **DO NOT USE** — retained temporarily or indefinitely but prohibited from runtime;
- **ADOPT BY EXPLICIT PR** — only if evidence shows it fills a genuine canonical gap and the application contract, security and migrations are deliberately updated.

No table is considered safe to drop merely because it is currently empty or appears redundant by name.

## Security note: no blanket RPC revocation

A broad command such as:

```sql
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;
```

is **not approved by this checkpoint**. Function privileges must be hardened deliberately, with an inventory of legitimate RPC callers and explicit grants/revokes per function or reviewed function class. This prevents accidental denial of service to legitimate application RPCs while preserving fail-closed security.

## Scope boundaries

This checkpoint is documentation/governance only. It intentionally makes **no** changes to:

- hosted Supabase objects;
- checkout or payment contracts;
- Stripe webhook runtime;
- escrow/release runtime;
- Seller Workspace UI or data flows;
- Web Mobile presentation;
- Android / Capacitor configuration or native code;
- Supplier Commerce or Avasam activation state.

## Exit criteria

This checkpoint can be superseded only after:

1. hosted Supabase access is available for direct introspection;
2. the inspection gate above is completed and recorded;
3. all candidate structures have an explicit final verdict;
4. any required migration is non-ambiguous, reviewed and reversible where practical;
5. runtime remains on a single canonical source of truth per domain;
6. relevant RLS/grant/security tests pass against the hosted candidate state;
7. checkout/webhook/payment/escrow behavior is regression-tested if any database contract affecting those areas changes.

Until then, the safe state is: **canonical runtime green, parallel hosted structures isolated, no destructive cleanup.**
