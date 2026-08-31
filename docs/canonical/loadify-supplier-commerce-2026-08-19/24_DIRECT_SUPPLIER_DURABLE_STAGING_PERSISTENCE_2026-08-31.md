# Direct Supplier durable staging persistence — 2026-08-31

## Purpose

This canonical record documents the durable, server-only persistence boundary for Direct Supplier feed admission implemented and merged through PR #654.

It sits immediately after `prepareDirectSupplierFeedForStaging(...)` and before the existing provider-neutral Supplier Commerce import/canonicalisation pipeline.

This record is documentation-only. It does not add or change runtime behavior.

## Implementation provenance

Implementation PR:

- PR `#654` — `Add Direct Supplier durable staging and replay persistence`
- validated implementation head: `f2063ce0d2ca36b550ddd3209e7c99ad6b062d73`
- merge commit: `e89acc8b5dde29b059c44a8d6cb00b535f982c14`

Migration:

`supabase/migrations/20260830233801_direct_supplier_durable_staging_replay_quarantine.sql`

## Scope

The implementation adds private persistence for:

- signed webhook replay claims;
- feed ingestion batch identity/audit metadata;
- sanitized `staged_candidate` records;
- sanitized quarantine metadata.

No raw rejected provider payload is stored.

## Database boundary

Private tables:

- `private.direct_supplier_replay_claims`
- `private.direct_supplier_ingestion_batches`
- `private.direct_supplier_staging_records`
- `private.direct_supplier_quarantine_records`

All four tables:

- live in the non-exposed `private` schema;
- have RLS enabled as defense in depth;
- revoke all direct privileges from `PUBLIC`, `anon`, `authenticated`, and `service_role`;
- are reachable only through narrowly scoped server RPCs granted to `service_role`.

Server RPCs:

- `public.server_direct_supplier_claim_event_v1(...)`
- `public.server_persist_direct_supplier_feed_v1(...)`

Both are `SECURITY DEFINER`, use an empty `search_path`, revoke default/public execution, and grant execution only to `service_role`.

## Replay semantics and retention

`server_direct_supplier_claim_event_v1` uses one unique `(supplier_key, event_id)` row and an atomic `INSERT ... ON CONFLICT ... DO UPDATE ... WHERE existing.expires_at <= now()` claim operation.

The function also performs bounded opportunistic cleanup before claiming:

- at most 256 expired replay rows are selected per invocation;
- cleanup uses the `expires_at` index;
- rows are selected with `FOR UPDATE SKIP LOCKED`;
- no cron, public endpoint, or new client privilege surface is required.

Therefore:

- the first unexpired claim succeeds;
- a duplicate unexpired event returns `false`;
- an expired event id can be reclaimed atomically;
- expired rows are progressively purged instead of accumulating for the lifetime of the integration;
- no process-memory replay store is used in production;
- supplier secrets and webhook payload bodies are not stored in the replay table.

The existing HMAC verifier remains authoritative and must run before the replay claim.

## Feed staging semantics

`server_persist_direct_supplier_feed_v1` receives only already-admitted sanitized candidates and quarantine metadata.

The batch operation is transactional:

1. insert an idempotent ingestion batch keyed by supplier plus non-secret batch digest;
2. persist sanitized staging candidates;
3. persist quarantine index/ref/reason metadata;
4. mark the batch `staged`;
5. return a fail-closed result asserting that no activation, capability promotion, or marketplace listing occurred.

A duplicate batch digest returns the prior staged batch instead of duplicating records.

## Fail-closed commercial boundary

The database schema enforces false values for:

- `commercial_activation_performed`
- `capability_promotion_performed`
- `marketplace_listing_performed`
- staging-record `marketplace_listing_allowed`

The TypeScript persistence adapter rejects malformed RPC responses or any response that reports capability promotion, commercial activation, or marketplace listing.

## Relationship to existing Supplier Commerce persistence

This persistence boundary does **not** replace or bypass the existing provider-neutral Supplier Commerce structures, including:

- `private.supplier_foundation_suppliers`
- `private.supplier_catalog_items`
- `private.supplier_import_batches`
- `private.supplier_import_items`
- canonical product / offer / compliance / price / stock structures.

Direct Supplier staging is a pre-import landing zone. Promotion into canonical structures remains a later, separately gated workflow.

## Verification evidence

Application/runtime validation completed before merge:

- targeted Direct Supplier persistence tests: PASS;
- existing Direct Supplier secure-ingestion/admission tests: PASS;
- 22/22 targeted tests: PASS;
- lint: PASS;
- production build: PASS;
- Netlify Deploy Preview on final implementation head `f2063ce0...`: SUCCESS;
- migration health gate: PASS, with 159 canonical migration versions and latest version `20260830233801`.

Isolated SQL validation completed against disposable Supabase Postgres image `17.6.1.165`:

- migration applied through `COMMIT`: PASS;
- first replay claim: `true`;
- duplicate replay claim: `false`;
- bounded cleanup smoke test: `300 -> 44 -> 0` expired rows across two claims;
- all four private tables existed;
- direct table `SELECT` remained false for `service_role`, `anon`, and `authenticated`;
- replay RPC `EXECUTE` was true for `service_role` and false for `anon`;
- staging RPC returned `status=staged` while preserving commercial activation, capability promotion, and marketplace listing as false.

Hosted migration dry-run:

- `supabase db push --dry-run` listed exactly one pending migration:
  `20260830233801_direct_supplier_durable_staging_replay_quarantine.sql`.
- no hosted database write was performed as part of PR #654 verification.

## Known historical bootstrap blocker

A full clean `supabase db reset` from an empty local database remains blocked by historical migration provenance that predates this Direct Supplier migration.

The canonical tracked migration history begins at `20260810120700_reconcile_core_rls_policies_20260810.sql`, which expects `public.buyer_profiles` to already exist. The legacy root SQL contains the earlier `buyer_profiles` DDL, but that legacy file is outside `supabase/migrations/` and therefore is not replayed by the Supabase CLI migration chain.

This is a pre-existing fresh-database reproducibility/baseline problem. It is not caused by migration `20260830233801` and must be remediated in a separate migration-governance/baseline change. The isolated validation above was used specifically to prove the new migration independently without masking or rewriting historical schema provenance.

## Explicit non-scope

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
- Web Mobile changes;
- GitHub Actions.

## Provider state after this gate

Direct Supplier remains:

- code state: `scaffolded_unverified`
- verified capabilities: `[]`
- runtime capabilities: `[]`
- hosted activation: `off`
- commercial approval: false
- marketplace listing: disabled

Persistence readiness is not commercial capability verification.
