# Direct Supplier Hosted Schema Reconciliation — 2026-09-01

## Purpose

Record the read-only hosted Supabase evidence for the Direct Supplier staging/replay/review boundary so future continuation does not repeat the old assumption that hosted migration state is unknown.

This document is evidence only. It does **not** activate Direct Supplier, execute Phase F, onboard or approve a supplier, mutate Supplier Foundation, create import batches/items, publish marketplace listings, disclose customer PII, mutate payments/refunds, relax RLS, or apply/repair migrations.

## Repository baseline

- Repository: `LoadifyMarketLTD/loadifymarket.co.uk`
- Canonical `main` inspected: `907049aaab607879eb71813c7e50b5899d964a7b`
- Supabase project ref used by the application: `fwdfpmfvgygvqciecesx`
- Hosted project state observed during reconciliation: `ACTIVE_HEALTHY`
- Inspection mode: read-only catalog/history/advisor queries only

## Migration reconciliation

Hosted migration history contains the Direct Supplier durable staging/replay/review migrations already present in the repository, including:

- `20260830233801_direct_supplier_durable_staging_replay_quarantine.sql`
- `20260831002829_direct_supplier_atomic_signed_feed_commit.sql`
- `20260831093332_direct_supplier_admin_staging_review_rpc.sql`

Therefore the old continuation state "hosted migration execution unknown" is superseded for this boundary.

**Result:** `HOSTED MIGRATION RECONCILIATION: PASS`

No migration was applied, repaired, reverted, or marked during this inspection.

## Durable private tables

The hosted database contains all four expected private Direct Supplier tables:

- `private.direct_supplier_replay_claims`
- `private.direct_supplier_ingestion_batches`
- `private.direct_supplier_staging_records`
- `private.direct_supplier_quarantine_records`

Observed security state for each table:

- RLS enabled;
- no direct grants to `PUBLIC`, `anon`, `authenticated`, or `service_role`;
- no table policies are required for current access because direct access is revoked and server-only SECURITY DEFINER RPCs form the boundary.

The Supabase security advisor reports `rls_enabled_no_policy` as informational for these private tables. In this design that is consistent with the intended fail-closed access model and is not evidence of public/client access.

**Result:** `PRIVATE TABLE ACCESS BOUNDARY: PASS`

## Hosted data cleanliness

Read-only row counts observed during reconciliation:

| Table | Rows |
| --- | ---: |
| `private.direct_supplier_replay_claims` | 0 |
| `private.direct_supplier_ingestion_batches` | 0 |
| `private.direct_supplier_staging_records` | 0 |
| `private.direct_supplier_quarantine_records` | 0 |

No synthetic/test Direct Supplier staging data was present in these durable hosted tables at inspection time.

**Result:** `HOSTED DIRECT SUPPLIER DURABLE DATA: CLEAN / EMPTY`

## Server-only RPC boundary

### Atomic signed-feed commit

`public.server_commit_direct_supplier_signed_feed_v1(...)` is present hosted with:

- `SECURITY DEFINER`;
- empty `search_path` hardening;
- EXECUTE available to `service_role`;
- no EXECUTE for `anon` or `authenticated`.

The atomic RPC owns the replay-claim + staging persistence boundary.

### Retired split entry points

The older split functions remain available to their database owner for internal composition but are not executable by `service_role`:

- `public.server_direct_supplier_claim_event_v1(...)`
- `public.server_persist_direct_supplier_feed_v1(...)`

This matches migration `20260831002829`, which deliberately retires separate service-role execution so callers cannot claim replay state independently of the atomic staging commit.

### Admin staging review

`public.server_get_direct_supplier_staging_review_v1(text,text)` is present hosted with:

- `SECURITY DEFINER`;
- empty `search_path` hardening;
- EXECUTE available to `service_role`;
- no EXECUTE for `anon` or `authenticated`;
- read-only staging/quarantine review semantics;
- fail-closed response fields for commercial activation, capability promotion, marketplace listing, canonical import creation and canonical identity mutation.

**Result:** `SERVER RPC ACCESS BOUNDARY: PASS`

## Runtime contract reconciliation

Current `main` uses the same hosted RPC names:

- signed-feed pipeline calls `server_commit_direct_supplier_signed_feed_v1`;
- staging review calls `server_get_direct_supplier_staging_review_v1`;
- no runtime fallback to separately executable claim/persist RPCs is required.

Phase F execution remains additionally fail-closed in code:

- admin authentication is required;
- `DIRECT_SUPPLIER_PHASE_F_EXECUTION_ENABLED` must equal literal `true` or execution returns `execution_disabled`;
- explicit confirmation token `EXECUTE_PHASE_F_IMPORT` is required;
- request credential material is rejected;
- every mapping must include a `supplierCatalogItemId` and a real `canonicalProductId`;
- execution revalidates `canonicalProductId` as UUID and refuses missing mappings;
- non-approved Supplier Foundation states do not receive canonical import-batch permission;
- the executor only permits `create_import_batch` and `record_import_item` capture actions;
- normalized facts, asset-rights review, compliance, marketplace publication, commercial activation, provider writes, supplier orders, customer PII disclosure and financial mutations remain outside this execution bridge.

**Result:** `HOSTED/RUNTIME CONTRACT RECONCILIATION: PASS`

## Advisor observations

Security and performance advisors were read during reconciliation.

For this Direct Supplier boundary:

- no public/client direct table grant was found;
- the expected private-table no-policy notices are informational under the revoked-access design;
- Direct Supplier indexes may appear unused while the feature is inactive and all four durable tables are empty.

The advisors also report unrelated pre-existing warnings elsewhere in the wider Loadify schema. Those are not reclassified or remediated by this evidence document and must not be conflated with Direct Supplier readiness.

## Final classification

### Direct Supplier platform engineering

`PASS`

The durable hosted staging/replay/review boundary exists and matches current repository contracts.

### Hosted business execution

`BLOCKED BY REAL-WORLD EVIDENCE / ACTIVATION GATES`

Before any hosted Phase F execution is considered, Loadify still requires an authentic UK/EU supplier that is onboarded and approved through Supplier Foundation, real canonical mappings, explicit admin-controlled execution, and all existing governance gates.

`DIRECT_SUPPLIER_PHASE_F_EXECUTION_ENABLED` must remain OFF until those requirements are deliberately satisfied and a separate controlled execution decision is made.

### Provider capability promotion

`NOT PERFORMED`

No documentation, migration presence, empty hosted tables, or code readiness is sufficient to promote Direct Supplier capabilities as provider-verified.

## Non-negotiable safety conclusion

This reconciliation authorises **no hosted mutation**. It only closes the stale hosted-schema uncertainty from the previous checkpoint and allows unrelated Multi-Provider Supplier Commerce platform engineering to continue without pretending that supplier/runtime evidence exists.