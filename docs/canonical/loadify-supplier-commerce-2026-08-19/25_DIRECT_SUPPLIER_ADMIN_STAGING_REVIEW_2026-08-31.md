# 25 — Direct Supplier Admin Staging Review — 2026-08-31

## Status

**CLOSED / PASS**

Implementation PR: **#663 — Add admin-gated Direct Supplier staged review surface**

Merged implementation commit on `main`:

- `a9867a12251e9a9cb4b20a3647cb858177679f4e`

Hosted migration:

- `20260831093332_direct_supplier_admin_staging_review_rpc.sql`

Supabase project:

- `fwdfpmfvgygvqciecesx`

## Purpose

This gate adds a server-only, admin-gated, read-only review surface for already-staged Direct Supplier batches.

It does **not** turn staged supplier data into marketplace products automatically. It exists only to let an authenticated active admin inspect sanitized staging/quarantine output and convert it into the existing canonical review-package shape before any later canonical import decision.

## Runtime surface

The implementation adds:

- server-only RPC `public.server_get_direct_supplier_staging_review_v1(text,text)`;
- a server-side review helper that validates the RPC response and converts it into the existing canonical Direct Supplier review package;
- a GET-only admin Netlify function using the existing active-account admin authorization model.

The review RPC reads from:

- `private.direct_supplier_ingestion_batches`;
- `private.direct_supplier_staging_records`;
- `private.direct_supplier_quarantine_records`.

Direct table access remains revoked from `service_role`, `anon`, and `authenticated`. `service_role` receives EXECUTE only on the controlled review RPC.

## Authorization boundary

The Netlify admin route requires an active authenticated account with role `admin` before it calls the server-side service-role client.

The database function is `SECURITY DEFINER` with `search_path=''`, fully qualified private objects, and explicit EXECUTE ACLs:

- `service_role`: EXECUTE = true;
- `anon`: EXECUTE = false;
- `authenticated`: EXECUTE = false.

No client receives direct SELECT access to the private Direct Supplier staging/quarantine tables.

## Reviewability size invariant

PR #663 review identified a valid P2: the initial implementation allowed arbitrarily large Direct Supplier batches to be staged while the review RPC refused batches above 500 records. That could create persisted-but-unreviewable batches.

The final implementation closes that gap at both application and database layers.

### TypeScript boundary

`DIRECT_SUPPLIER_MAX_VARIANTS_PER_BATCH = 500`.

`validateDirectSupplierFeedBatch` rejects feeds with more than 500 variants and instructs the sender to split larger feeds into smaller batches. The signed-feed pipeline therefore fails before any persistence RPC is called for a 501+ variant feed.

### Database boundary

The hosted migration adds:

`direct_supplier_batch_reviewable_size_check`

with the invariant:

`accepted_count + quarantined_count <= 500`

The review RPC retains the same 500-record guard as defense-in-depth.

Isolated SQL validation demonstrated:

- 500-record batch: accepted;
- 501-record batch: rejected by CHECK constraint;
- no 501-record batch persisted.

## Read-only contract

For a valid staged batch, the review RPC returns only sanitized staging/quarantine data and explicit fail-closed flags.

The following remain false:

- `commercialActivationPerformed`;
- `capabilityPromotionPerformed`;
- `marketplaceListingPerformed`;
- `canonicalImportBatchCreationPerformed`;
- `canonicalIdentityMutationPerformed`.

The review operation does not change row counts in ingestion, staging, or quarantine tables.

## Hosted verification

After the CLI-governed hosted push, Supabase verification confirmed:

- migration `20260831093332` tracked with name `direct_supplier_admin_staging_review_rpc`;
- review RPC exists;
- `service_role` can EXECUTE the review RPC;
- `anon` cannot EXECUTE it;
- `authenticated` cannot EXECUTE it;
- `service_role` still cannot directly SELECT staging records;
- `service_role` still cannot directly SELECT quarantine records;
- `direct_supplier_batch_reviewable_size_check` exists.

Hosted Direct Supplier state remained empty after migration:

- replay claims: `0`;
- ingestion batches: `0`;
- staging records: `0`;
- quarantine records: `0`.

Hosted verification also confirmed:

- no commercial activation;
- no capability promotion;
- no marketplace listing.

## Commercial state after this gate

Direct Supplier remains:

- `codeState = scaffolded_unverified`;
- verified capabilities = `[]`;
- runtime capabilities = `[]`;
- hosted commercial activation = OFF;
- no real Direct Supplier feed onboarded;
- no supplier approved or activated;
- no marketplace listing generated;
- Orders/PII remain out of scope.

The presence of durable staging, atomic signed-feed persistence, a canonical review package, and an admin review endpoint does **not** constitute supplier capability verification or commercial activation.

## Next allowed transition

A later canonical import transition must remain explicit and admin-controlled. It must reuse the existing Supplier Commerce import governance rather than bypassing it with automatic staging-to-catalog writes.

No real supplier should be created from synthetic test fixtures. A real commercial transition requires authentic supplier onboarding evidence and an approved feed/manifest.
