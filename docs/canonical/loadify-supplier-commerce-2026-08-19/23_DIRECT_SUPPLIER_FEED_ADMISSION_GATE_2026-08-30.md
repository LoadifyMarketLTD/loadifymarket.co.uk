# Direct Supplier Feed Admission Gate — 2026-08-30

## Baseline

This phase starts from:

`main@c8f315b7ea26acb1ac76d7b52f1782376eb573c1`

after:

- Avasam Gate B fail-closed policy merged through PR #650;
- BigBuy manual sandbox read-only probe preparation merged through PR #649.

BigBuy live sandbox verification is still NOT EXECUTED because this workstream has no authorized BigBuy sandbox credential or controlled provider identifiers. No BigBuy capability is promoted.

## Purpose

Advance Direct Supplier ingestion without publishing an endpoint, writing to the hosted database, activating a supplier or bypassing migration governance.

New module:

`netlify/functions/_shared/directSupplierFeedAdmission.ts`

New regression coverage:

`netlify/functions/__tests__/direct-supplier-feed-admission.test.ts`

## Admission contract

`prepareDirectSupplierFeedForStaging()` accepts only the existing Loadify-owned:

- `DirectSupplierOnboardingManifestV1`;
- `DirectSupplierFeedBatchV1`.

It first applies the existing onboarding and feed validators, then requires:

- exact supplier key match between onboarding and batch;
- exact feed transport match;
- requested `catalog`, `variants`, and `price` feed capabilities;
- requested `stock` when any feed record contains stock quantity.

These requested capabilities are onboarding intent only. They are NOT provider verification and are NOT runtime SupplierAdapter capabilities.

## Normalized staging candidates

A valid record is normalized into a non-commercial `DirectSupplierStagingCandidateV1` with:

- normalized supplier key and source metadata;
- trimmed external product/variant references;
- optional trimmed SKU/GTIN;
- normalized title, ISO currency code and warehouse country;
- amount in minor currency units;
- optional stock quantity;
- HTTPS-only images;
- bounded string attributes;
- SHA-256 source-record digest;
- `ingestionState = staged_candidate`;
- `marketplaceListingAllowed = false`.

The result explicitly records that no commercial activation, capability promotion or marketplace listing occurred.

## Quarantine gate

A record is quarantined rather than silently coerced when it has any admission-level ambiguity or unsafe metadata, including:

- duplicate external variant reference;
- undeclared warehouse country;
- invalid/non-HTTPS image URL;
- excessive image count;
- excessive/invalid attributes;
- oversized external references;
- oversized title.

When the same external variant reference appears more than once in one batch, every occurrence is quarantined. The pipeline does not choose an arbitrary winner.

A bad record does not force valid sibling records into quarantine after the batch-level contract itself has passed.

## Security and activation state

This phase does NOT:

- expose a public Netlify ingestion route;
- apply or invent a Supabase migration;
- write feed data to hosted tables;
- provision supplier secrets;
- process customer PII;
- submit supplier orders;
- publish marketplace listings;
- modify Auth, checkout, Stripe, Seller Workspace, Super Admin or Web Mobile;
- promote Direct Supplier capabilities.

Direct Supplier therefore remains:

- `codeState = scaffolded_unverified`;
- `verifiedCapabilities = []`;
- runtime adapter capabilities `[]`;
- hosted activation `OFF`.

## Hosted persistence blocker

The connected Supabase MCP surface returned no projects for this session, so hosted schema truth could not be re-queried here.

The local execution environment also does not have the Supabase CLI installed. Supabase guidance requires migration files to be created through the CLI rather than inventing a timestamped migration filename.

Therefore this phase deliberately stops before durable staging/replay schema changes.

## Next safe gates

1. Validate this admission pipeline through repository tests/lint/build and Netlify Deploy Preview.
2. Reconnect/discover the correct Supabase project and reconcile migration history before any hosted schema change.
3. Create durable private-schema replay + staging/quarantine persistence through normal Supabase migration governance.
4. Publish a server-only ingestion route only after durable atomic replay/staging storage exists.
5. Execute a controlled real Direct Supplier feed using an approved supplier onboarding manifest.
6. Only then promote the exact Direct Supplier read capabilities proved by the controlled feed.
7. Feed accepted staging candidates into the canonical supplier product import layer; marketplace listing remains a separate approval gate.
