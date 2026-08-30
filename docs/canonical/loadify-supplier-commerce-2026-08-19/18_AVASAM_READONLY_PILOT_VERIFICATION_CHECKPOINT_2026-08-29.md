# Avasam Read-Only Pilot Verification Checkpoint — 2026-08-29

## Scope

This checkpoint records the first verified read-only Avasam Seller API pilot for Loadify Market.

It does **not** activate Supplier Commerce, marketplace listing, order submission, PII access, invoice access, payment settings, hosted provider capabilities, hosted pilot controls, or any commercial workflow.

## Controlled pilot identity

- Provider: `avasam`
- Supplier-specific terms reference: `GB010107`
- Pilot SKU: `S0671779793`
- Territory: `GB`
- Product was intentionally sourced in Avasam after the account owner reviewed and accepted the supplier-specific terms.
- Product remains outside any Loadify commercial activation gate.

## Live Avasam authentication contract — verified

The account-scoped Seller API contract was verified through controlled Netlify Deploy Preview probes:

1. `POST /api/auth/request-token` with `consumer_key` + `secret_key` succeeds.
2. The response contains a valid `access_token` + `expires_at`.
3. `Authorization: Bearer <access_token>` is rejected.
4. `Token: <access_token>` is rejected.
5. **`Authorization: <access_token>` without the `Bearer` prefix is accepted.**
6. Unauthenticated negative controls are rejected.

`AvasamClient` owns this provider header internally. Callers cannot inject or override provider authentication headers.

## Live sourced-SKU evidence — PR #615

Diagnostic PR #615 was created only to collect live read-only provider evidence and was closed without merge.

Final diagnostic HEAD:

`f64838d33ad051e2b9a9ee7ce6b5ff4c2340449e`

Netlify Deploy Preview: **SUCCESS**.

Verified with real Avasam calls:

- `GetSellerProductList` returns an authenticated array containing exact SKU `S0671779793` with numeric `Price`.
- `SellerStockList` returns an authenticated array containing exact SKU `S0671779793` with integer `Stock`.
- unauthenticated negative controls are rejected.
- the normal TypeScript + Vite build succeeds after the explicit diagnostic.

No order endpoint was called.

### Important lifecycle rule

A live external provider probe must **not** run automatically from npm `prebuild` in normal product branches.

The Netlify Agent independently repaired the same diagnostic branch concept by moving the probe from `prebuild` to an explicit `audit:avasam:sourced-sku` command. The canonical product branch #608 does not contain a live-provider `prebuild` hook.

## Inventory endpoint discrepancy

Avasam documents `GetInventoryListWithFilter` as returning a direct:

```json
{
  "data": [],
  "total": 0
}
```

shape.

The live endpoint accepts the verified raw Authorization transport and contains the sourced pilot SKU, but its observed wrapper does **not** match the documented direct `data[]` envelope.

Therefore:

- the strict Inventory parser remains fail-closed;
- it is not relaxed based on guesswork;
- Inventory is not required for the current price/stock pilot because the separately documented `GetSellerProductList` and `SellerStockList` contracts are live-verified.

## Read-only adapter implementation

`AvasamAdapterV1` now advertises only:

- `catalog`
- `stock`
- `price`

Adapter version:

`1.1.0-read-only-pilot`

The implementation is deliberately restricted to:

- territory `GB`;
- exact SKU `S0671779793`;
- Seller Product List for catalog identity + seller price;
- Seller Stock List for stock;
- token caching only in server memory;
- one token refresh on provider-side auth rejection;
- no read idempotency header;
- provider-neutral GBP minor-unit price snapshots;
- non-negative integer stock snapshots.

Any other SKU or territory fails closed with `CAPABILITY_UNAVAILABLE`.

## Write/commercial capabilities remain unavailable

The adapter still does **not** advertise or implement:

- supplier identity
- variants
- shipping
- order submission
- acknowledgement
- tracking
- cancellation
- returns
- reimbursement

Supplier `GB010107` policy also keeps listing and order submission blocked by unresolved commercial controls, including:

- automated pricing-rule verification;
- margin-floor verification;
- conflicting dispatch SLA wording;
- conflicting delivery SLA wording;
- remote/restricted postcode policy;
- non-faulty-return economics.

Orders permission remains OFF. PII remains OFF.

## Quality evidence — PR #617

Diagnostic PR #617 validated the read-only adapter implementation with provider fetches mocked and was closed without merge.

Final diagnostic HEAD:

`56124c3b381bb3a59e84c7004fe1b4b0a3a40b60`

Netlify Deploy Preview: **SUCCESS**.

PASS:

- `avasam-adapter.test.ts`
- `avasam-authenticated-transport.test.ts`
- `avasam-branch-guard.test.ts`
- `avasam-contracts.test.ts`
- `avasam-token-manager.test.ts`
- `avasam-supplier-policy.test.ts`
- full ESLint
- TypeScript typecheck
- TypeScript + Vite production build
- Netlify packaging / Deploy Preview

The branch guard explicitly permits only `catalog`, `stock`, `price` and keeps write/commercial capabilities absent.

## Current PR #608 state at this checkpoint

- PR: #608 — `Phase O: verify Avasam Seller API authentication contract`
- branch: `feat/avasam-verified-api-integration-20260829`
- HEAD before this checkpoint commit: `263ed73ee0ce1affc42f800e439d3e662b3f347b`
- OPEN
- DRAFT
- NOT MERGED
- MERGEABLE
- exact-head Netlify Deploy Preview: **SUCCESS**
- base `main`: `f830c5bb2f31b10338ade8d0524bb3cf15ab53df`

## Hosted-state rule

Code-level read capability verification is **not** hosted Supplier Commerce activation.

Do not create/enable hosted adapter registrations, provider capability rows, pilot programmes, supplier offers, cohort membership, simulator PASS evidence, or Supplier Commerce controls merely because the read-only client is now verified.

Hosted readiness must be re-read and all prerequisite gates must be satisfied independently before any hosted write.

## Next gate

1. Re-read hosted Supplier Commerce readiness in Supabase.
2. Confirm whether supplier foundation / offer / pilot cohort / adapter registration / provider capability / simulator prerequisites remain absent.
3. Keep every hosted control OFF unless the canonical readiness chain is complete.
4. Reconcile the remaining supplier-commercial policy blockers before any listing gate.
5. Orders and PII remain out of scope.
