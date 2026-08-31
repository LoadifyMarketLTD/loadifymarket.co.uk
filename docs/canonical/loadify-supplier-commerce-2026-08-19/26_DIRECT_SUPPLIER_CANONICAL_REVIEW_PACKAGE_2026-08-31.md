# Direct Supplier canonical review package — 2026-08-31

## Status

Implementation merged in PR #661.

This gate prepares durable Direct Supplier staging records for the existing canonical supplier review process without performing any canonical database mutation.

## Boundary

The implementation is intentionally read-only.

It does **not**:

- create a supplier foundation record;
- create `private.supplier_import_batches`;
- create or mutate canonical products;
- create supplier offers;
- mark identifiers verified;
- approve asset rights;
- promote provider capabilities;
- activate commercial trading;
- create marketplace listings;
- process Orders/PII;
- alter Auth, checkout, Stripe, UI or Web Mobile.

The existing admin-gated Supplier Commerce Phase E/F database functions remain authoritative for actual canonical import and review.

## Contract

`prepareDirectSupplierCanonicalReviewPackage(...)` converts already-admitted staging candidates into deterministic review evidence.

For each staged candidate the package carries:

- supplier key and deterministic staging source reference;
- external product and variant references;
- a working-label proposal from supplier title data;
- observed GTIN evidence when present;
- observed internal supplier SKU evidence when present;
- source attributes with `reviewStatus = pending`;
- supplier image references with `rightsStatus = unknown` and explicit review requirement;
- price, stock and warehouse data only as `review_only` commercial observations.

Price and stock are deliberately kept outside canonical identity evidence because the canonical Supplier Commerce identity layer defers supplier economics to later phases.

## Fail-closed properties

The package builder rejects:

- supplier-key mismatches;
- source timestamp mismatches;
- source transport mismatches;
- malformed SHA-256 staging evidence digests;
- candidates that are no longer `staged_candidate` / non-listable.

Quarantined source records remain quarantined and are never converted into review items.

All package-level mutation/activation flags remain hard false:

- `canonicalImportBatchCreationPerformed = false`
- `canonicalIdentityMutationPerformed = false`
- `commercialActivationPerformed = false`
- `capabilityPromotionPerformed = false`
- `marketplaceListingPerformed = false`

## Validation

PR #661 passed the Netlify Deploy Preview after TypeScript/build validation on final head `8f070a7fbea5c58481aaa59fcbf67d9ae05ffd40`.

The implementation was statically audited against the real Direct Supplier transport union and corrected before merge (`csv`, not an invented transport token).

The Vitest file is present as executable regression coverage, but no claim is made here that Vitest was executed in the assistant runtime because that runtime does not provide the repository checkout/npm toolchain.

## Current provider state

This gate does not change Direct Supplier commercial state:

- no real Direct Supplier foundation supplier has been created by this gate;
- no real Direct Supplier feed is promoted into canonical commerce automatically;
- verified provider capabilities remain unchanged;
- hosted activation remains off until provider-specific evidence and the existing governance gates are satisfied.

## Next safe step

A real Direct Supplier can proceed only after an authentic onboarding manifest and feed are available. At that point the flow remains:

signed feed verification → atomic durable staging → canonical review package → active-admin canonical import/review → identity/compliance/rights decisions → later commercial gates.
