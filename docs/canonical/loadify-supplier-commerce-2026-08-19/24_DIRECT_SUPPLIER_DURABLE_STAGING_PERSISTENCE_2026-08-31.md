# Direct Supplier durable staging persistence — 2026-08-31

## Purpose

This gate adds durable, server-only persistence for Direct Supplier feed admission without activating Direct Supplier commerce.

It is the persistence boundary immediately after `prepareDirectSupplierFeedForStaging(...)` and before the existing provider-neutral Supplier Commerce import/canonicalisation pipeline.

## Scope

Added private persistence for:

- signed webhook replay claims;
- feed ingestion batch identity/audit metadata;
- sanitized `staged_candidate` records;
- sanitized quarantine metadata.

No raw rejected provider payload is stored.

## Database boundary

Migration:

`supabase/migrations/20260830233801_direct_supplier_durable_staging_replay_quarantine.sql`

Private tables:

- `private.direct_supplier_replay_claims`
- `private.direct_supplier_ingestion_batches`
- `private.direct_supplier_staging_records`
- `private.direct_supplier_quarantine_records`

All four tables:

- are in the non-exposed `private` schema;
- have RLS enabled as defense in depth;
- revoke all direct privileges from `PUBLIC`, `anon`, `authenticated`, and `service_role`;
- are reachable only through narrowly-scoped server RPCs granted to `service_role`.

Server RPCs:

- `public.server_direct_supplier_claim_event_v1(...)`
- `public.server_persist_direct_supplier_feed_v1(...)`

Both are `SECURITY DEFINER`, use an empty `search_path`, revoke default/public execution, and grant execution only to `service_role`.

## Replay semantics

`server_direct_supplier_claim_event_v1` uses one unique `(supplier_key, event_id)` row and one atomic `INSERT ... ON CONFLICT ... DO UPDATE ... WHERE existing.expires_at <= now()` operation.

Therefore:

- the first unexpired claim succeeds;
- a duplicate unexpired event returns `false`;
- an expired event id can be reclaimed atomically;
- no process-memory replay store is used in production;
- supplier secrets and webhook payload bodies are not stored in the replay table.

The existing HMAC verifier remains authoritative and must run before the replay claim.

## Feed staging semantics

`server_persist_direct_supplier_feed_v1` receives only the already-admitted sanitized candidates and quarantine metadata.

The whole batch is transactional:

1. insert an idempotent ingestion batch keyed by supplier + non-secret batch digest;
2. persist sanitized staging candidates;
3. persist quarantine index/ref/reason metadata;
4. mark the batch `staged`;
5. return a fail-closed result asserting that no activation, capability promotion, or listing occurred.

A duplicate batch digest returns the prior staged batch instead of duplicating records.

## Fail-closed commercial boundary

The database schema enforces false values for:

- `commercial_activation_performed`
- `capability_promotion_performed`
- `marketplace_listing_performed`
- staging-record `marketplace_listing_allowed`

The TypeScript persistence adapter rejects malformed RPC responses or any response that reports a capability promotion, commercial activation, or marketplace listing.

## Relationship to existing Supplier Commerce persistence

This does **not** replace or bypass the existing provider-neutral tables such as:

- `private.supplier_foundation_suppliers`
- `private.supplier_catalog_items`
- `private.supplier_import_batches`
- `private.supplier_import_items`
- canonical product / offer / compliance / price / stock structures.

Direct Supplier staging is a pre-import landing zone. Promotion into those existing canonical structures remains a later, separately gated workflow.

## Explicitly not included

This gate does not add:

- a public ingestion endpoint;
- supplier activation or approval;
- verified/runtime capabilities;
- marketplace publication;
- canonical product creation;
- stock/price sync activation;
- supplier order submission;
- acknowledgement/tracking/cancellation/returns/reimbursement activation;
- customer PII handling;
- Auth changes;
- checkout or Stripe changes;
- Seller Workspace or Super Admin UI changes;
- GitHub Actions.

## Verification gates

Before merge:

- targeted Direct Supplier persistence tests PASS;
- existing Direct Supplier secure-ingestion/admission tests PASS;
- typecheck PASS;
- lint PASS;
- build / Netlify Deploy Preview PASS;
- migration health check PASS;
- local Supabase clean replay/advisors should be run when the local Docker stack is available;
- no `db push` to hosted is part of this PR verification.

## Provider state after this gate

Direct Supplier remains:

- code state: `scaffolded_unverified`
- verified capabilities: `[]`
- runtime capabilities: `[]`
- hosted activation: `off`
- commercial approval: false
- marketplace listing: disabled

Persistence readiness is not commercial capability verification.
