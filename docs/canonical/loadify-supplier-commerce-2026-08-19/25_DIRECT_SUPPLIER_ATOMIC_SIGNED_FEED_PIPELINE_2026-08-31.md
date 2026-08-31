# Direct Supplier atomic signed feed pipeline — 2026-08-31

## Purpose

This canonical record documents the atomic, server-only Direct Supplier signed-feed ingestion boundary implemented through PR #658.

It supersedes the previous split server-call model for new Direct Supplier feed ingestion. The earlier durable persistence layer remains the storage foundation, but the two legacy split RPCs are no longer directly executable by `service_role`.

This record is documentation-only. It does not activate a provider, publish products, enable Orders/PII, or change checkout, Stripe, Auth, Seller Workspace, Super Admin, Web Mobile, or GitHub Actions.

## Implementation provenance

Implementation PR:

- PR `#658` — `Make Direct Supplier signed feed ingestion atomic`
- validated final head: `146fef377395f49e8bb95c8ce927c37235f09187`
- merge commit: `120e71e0e4b123bfccb215da29f15d364bb54c9b`
- base before merge: `22416dd5c7d7b59f51aeabac2e54e3b808280933`

Migration:

`supabase/migrations/20260831002829_direct_supplier_atomic_signed_feed_commit.sql`

Runtime module:

`netlify/functions/_shared/directSupplierSignedFeedPipeline.ts`

Focused test module:

`netlify/functions/__tests__/direct-supplier-signed-feed-pipeline.test.ts`

## Atomic database boundary

The migration adds one server-only RPC:

`public.server_commit_direct_supplier_signed_feed_v1(...)`

The function is:

- `SECURITY DEFINER`;
- `SET search_path TO ''`;
- revoked from `PUBLIC`, `anon`, `authenticated`, and `service_role` by default;
- granted back only to `service_role`;
- responsible for replay claim plus staging/quarantine persistence in one Postgres transaction.

The wrapper calls the existing internal primitives:

- `public.server_direct_supplier_claim_event_v1(...)`
- `public.server_persist_direct_supplier_feed_v1(...)`

but direct `service_role EXECUTE` on those two split RPCs is revoked by this migration. This removes the previous service-role path that could claim an event in one transaction and then fail before persistence in another transaction.

The corresponding exported TypeScript split helpers were retired. Repository call-site audit showed no runtime call sites beyond the helper/test pair that was removed.

## Replay semantics

For a new event:

1. claim the signed event id;
2. persist the sanitized admitted batch and quarantine metadata;
3. return one fail-closed commit result;
4. commit both operations together.

If persistence raises, Postgres rolls back the replay claim as part of the same transaction.

For an already-claimed event, the atomic RPC accepts it as a valid idempotent replay only when the same `supplier_key + source_batch_digest` already has a committed batch with `ingestion_state = 'staged'`.

Therefore an orphan replay claim is not treated as success. It raises a serialization failure so the caller fails closed rather than silently acknowledging an event that was never staged.

## Signed-feed pipeline

`processDirectSupplierSignedFeed(...)` enforces this order:

1. verify HMAC-SHA256 against the exact raw request body before JSON parsing;
2. validate the signed envelope contract;
3. allow only feed event types currently permitted for this gate:
   - `catalog.updated`
   - `stock.updated`
   - `price.updated`
4. bind signed envelope `supplierKey` to the onboarding manifest;
5. bind feed payload `supplierKey` to the signed envelope;
6. run `prepareDirectSupplierFeedForStaging(...)`;
7. compute the non-secret, PII-free staging batch digest;
8. invoke exactly one atomic Supabase RPC.

Order and fulfilment event types remain blocked. This gate does not enable order acknowledgement, shipping, cancellation, returns, reimbursement, or customer PII handling.

## Fail-closed commercial boundary

All successful and replay responses must preserve:

- `commercialActivationPerformed = false`
- `capabilityPromotionPerformed = false`
- `marketplaceListingPerformed = false`
- `interfaceVersion = 1`

Persisted staging candidates remain `staged_candidate` records with marketplace listing disallowed.

Malformed RPC responses, fail-open flags, persistence-count mismatches, HMAC failures, unsupported event types, supplier mismatches, invalid feed payloads, and admission failures are rejected.

## Exact-head verification evidence

Final application validation on head `146fef377395f49e8bb95c8ce927c37235f09187`:

- Direct Supplier targeted files: 4/4 PASS;
- targeted tests: 23/23 PASS;
- TypeScript typecheck: PASS;
- ESLint: PASS;
- Netlify Deploy Preview for PR #658: SUCCESS.

Final isolated SQL validation used disposable Supabase Postgres image `17.6.1.165` and applied:

1. `20260830233801_direct_supplier_durable_staging_replay_quarantine.sql`
2. `20260831002829_direct_supplier_atomic_signed_feed_commit.sql`

Observed results:

- first atomic commit: `eventClaimed=true`, `replayed=false`, `persisted=true`;
- valid replay: `eventClaimed=false`, `replayed=true`, `persisted=false`, with the original staged batch returned;
- orphan replay claim: rejected fail-closed;
- forced persistence failure: replay claim rolled back;
- rollback claim count: `0`;
- rollback batch count: `0`;
- atomic RPC EXECUTE for `service_role`: `true`;
- legacy split claim RPC EXECUTE for `service_role`: `false`;
- legacy split persistence RPC EXECUTE for `service_role`: `false`;
- atomic RPC EXECUTE for `anon`: `false`;
- atomic RPC EXECUTE for `authenticated`: `false`.

Hosted dry-run after final validation listed exactly one pending migration:

`20260831002829_direct_supplier_atomic_signed_feed_commit.sql`

No hosted write was performed as part of PR #658 verification.

## Hosted migration state

The previous durable persistence migration `20260830233801_direct_supplier_durable_staging_replay_quarantine` is applied in the Loadify hosted project and is present in `supabase_migrations.schema_migrations`.

The atomic migration `20260831002829_direct_supplier_atomic_signed_feed_commit` remains pending at the time of this record.

The available Supabase connector migration action accepts a migration name but does not expose a caller-supplied migration version. Applying it through that path would generate a different hosted migration version and recreate migration-history drift. Therefore production application must preserve the CLI-generated version `20260831002829`; no manual migration-history repair or fabricated version is permitted.

## Provider state after this gate

Direct Supplier remains:

- code state: `scaffolded_unverified`;
- verified capabilities: `[]`;
- runtime capabilities: `[]`;
- hosted activation: `off`;
- commercial approval: `false`;
- marketplace listing: disabled;
- no real supplier manifest imported;
- no real provider secret configured by this gate;
- no public ingestion endpoint.

Atomic ingestion readiness is infrastructure readiness only. It is not provider capability verification or commercial activation.

## Remaining next gates

1. apply migration `20260831002829` to hosted with the exact CLI version preserved;
2. verify hosted RPC ACLs and replay semantics read-only after application;
3. obtain a real Direct Supplier onboarding manifest and authorized secret through a secure channel;
4. run one controlled signed catalog/stock/price feed through the server-only admission boundary;
5. only after evidence, connect staged candidates to the existing provider-neutral canonical import pipeline;
6. keep Orders/PII, marketplace listing, capability promotion and commercial activation off until separately proven and approved.

## Separate known platform blockers

Fresh-db reproducibility before the first tracked 2026-08-10 migration remains a separate migration-governance issue and is not caused by this Direct Supplier change.

Hosted SECURITY DEFINER advisor findings identified during the previous persistence gate are also tracked separately and are not broadened by this atomic Direct Supplier RPC.