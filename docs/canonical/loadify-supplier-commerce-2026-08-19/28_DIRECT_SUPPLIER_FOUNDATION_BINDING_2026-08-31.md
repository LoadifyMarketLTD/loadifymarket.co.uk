# Direct Supplier → Supplier Foundation binding — 2026-08-31

## Purpose

This canonical record documents the read-only binding gate merged through PR #665. The gate connects an existing Direct Supplier staged review package to the provider-neutral Supplier Foundation state without creating, approving, activating, or mutating any supplier record.

## Implementation provenance

- PR `#665` — `Bind Direct Supplier review to Supplier Foundation state`
- validated head: `8e3045098089b047f48b39e23d6c9609922b6a27`
- merge commit: `a7dd5b01a13f88e4f8c5fc7061ccbd0da47a686b`
- Netlify Deploy Preview on the validated head: SUCCESS
- review threads at merge: none

## Runtime surface

The existing admin-only Direct Supplier staging review endpoint now returns two independent read-only artifacts:

1. the staged canonical review package; and
2. a Supplier Foundation binding result for the same `supplierKey`.

The binding helper reuses the existing provider-neutral RPC:

`public.server_supplier_foundation_decision_v1(...)`

No new migration or database write path was introduced.

## Binding semantics

The binding deliberately separates three concepts that must not be conflated:

### 1. Identity capture allowed

`identityCaptureAllowed = true` only when the Supplier Foundation record exists and is not banned.

This allows an admin to continue identity adjudication using existing canonical catalog tooling without implying commercial readiness.

### 2. Canonical import batch creation allowed

`canonicalImportBatchCreationAllowed = true` only when the Supplier Foundation lifecycle is `approved`, matching the existing Phase F guard for `create_import_batch`.

A candidate, verification, restricted, suspended, banned or missing supplier cannot create a canonical Supplier Import batch through this binding.

### 3. Supplier Foundation ready

`supplierFoundationReady = true` only when the existing Supplier Foundation decision reports the supplier eligible after its qualification, SLA and compliance gates.

Full foundation readiness is therefore stricter than identity capture and stricter than merely having a Supplier Foundation record.

## Fail-closed states

The helper maps Supplier Foundation decision results into explicit non-mutating states, including:

- `supplier_not_found`;
- lifecycle not approved;
- qualification incomplete;
- active SLA missing;
- compliance not approved;
- adapter capability missing;
- fully ready.

Malformed or unavailable upstream responses fail closed instead of fabricating eligibility.

## Canonical architecture relationship

This gate does not create a parallel supplier identity model.

The next legitimate identity workflow remains the existing Phase E canonical catalog surface, including:

- `server_mutate_supplier_catalog_v1`;
- `upsert_supplier_catalog_item`;
- canonical product identity and identifier review;
- deduplication and identity audit.

The subsequent import workflow remains the existing Phase F surface, including:

- `server_mutate_supplier_import_v1`;
- `create_import_batch`;
- import items;
- normalized facts;
- asset-rights review;
- compliance review;
- import readiness decision.

Direct Supplier staging therefore remains a pre-canonical evidence boundary. It does not bypass Phase E or Phase F governance.

## Hosted truth at this gate

At verification time, hosted Supplier Foundation contained zero supplier records. Therefore no real Direct Supplier can currently be bound to a Supplier Foundation identity.

This is an intentional fail-closed state. The implementation does not invent a `supplierId`, supplier legal identity, approval, SLA, compliance evidence or adapter capability.

## Explicit non-scope

This gate does not perform:

- Supplier Foundation creation or lifecycle changes;
- supplier approval;
- canonical product creation;
- supplier catalog item creation;
- canonical identifier verification;
- import batch creation;
- normalized fact review;
- offer creation or approval;
- stock/price activation;
- capability promotion;
- commercial activation;
- marketplace listing;
- supplier order submission;
- Orders/PII processing;
- checkout or Stripe changes;
- Auth changes;
- UI redesign;
- GitHub Actions changes.

## Provider state after this gate

Direct Supplier remains:

- code state: `scaffolded_unverified`;
- verified capabilities: `[]`;
- runtime capabilities: `[]`;
- hosted activation: `off`;
- commercial approval: `false`;
- marketplace listing: disabled;
- real Supplier Foundation binding: absent until authentic supplier onboarding exists.

Read-only foundation binding readiness is not commercial capability verification.