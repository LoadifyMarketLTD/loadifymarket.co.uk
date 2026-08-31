# Direct Supplier Phase E identity evidence — 2026-08-31

## Purpose

This canonical record documents the Direct Supplier Phase E identity-evidence contract merged through PR #668 and the closure of issue #667.

The gate resolves how Direct Supplier staging evidence may prepare the existing provider-neutral Phase E `upsert_supplier_catalog_item` payload without storing raw provider payloads, confusing commercial observations with product identity, or introducing a new catalog engine.

## Implementation provenance

- PR `#668` — `Define Direct Supplier Phase E identity evidence hash`
- validated head: `feda805c2aa4fc913c2fd943318ff23463659d33`
- merge commit: `54a12df07fe1209d165d1aefe136bc3199a925ae`
- issue `#667` — CLOSED / completed
- Netlify Deploy Preview on the validated head: SUCCESS
- review threads at merge: none

## Identity hash semantics

Direct Supplier defines the explicit semantics identifier:

`direct_supplier_normalized_identity_evidence_v1`

For Direct Supplier only, the existing Phase E field named `rawIdentityHash` receives a deterministic SHA-256 digest over a canonical normalized identity-evidence projection. The historical field name does **not** mean that raw provider payload bytes are persisted or hashed by this implementation.

### Included in the identity projection

- Supplier key;
- external product reference;
- external variant reference;
- working label proposal;
- identifier evidence: type, namespace, raw value and normalized value;
- attribute evidence: key and value.

Identifier and attribute collections are canonically ordered before hashing.

### Explicitly excluded

The following do not participate in the Phase E identity hash:

- price;
- stock quantity;
- currency;
- warehouse country;
- source timestamps;
- source references;
- source-record digest;
- asset/image URLs;
- raw provider payload bytes.

Therefore routine price, stock, warehouse, transport, timestamp or asset changes do not masquerade as a product identity change.

## Relationship to staging digest

`sourceRecordDigest` remains the Direct Supplier staging/provenance digest over the normalized staging candidate core.

It is not silently reused as `rawIdentityHash`.

The Phase E identity hash is computed independently from the narrower identity-evidence projection described above. This distinction closes the provenance ambiguity identified in issue #667.

## Catalog capture planner

The implementation adds a pure planner that prepares existing Phase E action payloads:

`upsert_supplier_catalog_item`

The plan is generated only when the previously merged Supplier Foundation binding reports `identityCaptureAllowed=true` and provides a valid supplier ID.

Each planned item carries:

- the existing Supplier Foundation `supplierId`;
- external product and variant references;
- Direct Supplier evidence `sourceRef`;
- source observed time;
- the independently computed identity-evidence digest in `rawIdentityHash`;
- explicit hash semantics metadata;
- `mutationPerformed=false`.

## Fail-closed boundaries

The planner:

- rejects review/foundation supplier-key mismatches;
- rejects malformed or inconsistent Supplier Foundation authority;
- blocks when the supplier is missing;
- blocks when identity capture is denied, including banned state;
- validates the staging source-record digest as SHA-256 provenance;
- requires the existing review package and foundation binding to retain all commercial/mutation flags as false.

## No write path introduced

PR #668 does not call `server_mutate_supplier_catalog_v1`.

It does not create or mutate:

- Supplier Foundation records;
- supplier catalog items;
- canonical products;
- canonical identifiers;
- supplier offers;
- dedup decisions;
- Supplier Import batches/items;
- verified facts;
- stock or price state;
- marketplace listings.

Execution remains an explicit active-admin action through the existing provider-neutral Phase E mutation surface.

## Current hosted truth

At this gate, hosted Supplier Foundation contains no real supplier record for Direct Supplier onboarding. Therefore no Direct Supplier Phase E mutation is currently executable from an authentic binding.

The correct runtime state remains fail-closed rather than fabricating supplier identity.

## Explicit non-scope

This gate does not add:

- public supplier ingestion;
- supplier approval or commercial activation;
- capability verification/promotion;
- canonical product auto-creation;
- automatic catalog mutations;
- import batch creation;
- offer approval;
- price/stock activation;
- marketplace listing;
- supplier order submission;
- acknowledgement/tracking/cancellation/returns/reimbursement;
- Orders/PII handling;
- Auth changes;
- checkout/Stripe changes;
- UI redesign;
- GitHub Actions.

## Provider state after this gate

Direct Supplier remains:

- code state: `scaffolded_unverified`;
- verified capabilities: `[]`;
- runtime capabilities: `[]`;
- hosted activation: `off`;
- commercial approval: `false`;
- marketplace listing: disabled;
- Phase E identity mutation: not performed;
- real Supplier Foundation binding: absent until authentic supplier onboarding exists.

A deterministic Phase E preparation contract is not commercial capability verification.