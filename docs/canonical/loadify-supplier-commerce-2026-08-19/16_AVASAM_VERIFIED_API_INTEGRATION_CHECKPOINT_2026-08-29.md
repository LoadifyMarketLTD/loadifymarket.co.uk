# Avasam Verified API Integration Checkpoint — 2026-08-29

## Canonical state

- Repository: `LoadifyMarketLTD/loadifymarket.co.uk`
- Branch: `feat/avasam-verified-api-integration-20260829`
- PR: `#608`
- Base: `main@f830c5bb2f31b10338ade8d0524bb3cf15ab53df`
- Clean implementation HEAD before this checkpoint update: `b8c995bb2b998f8ad18e6797216e9529af6309fe`
- PR state: OPEN / DRAFT / MERGEABLE / NOT MERGED
- `main` remained unchanged during all Avasam diagnostics.

## Hard safety state

- Supplier Commerce hosted controls remain OFF.
- `AvasamAdapterV1.capabilities = []` remains unchanged.
- Orders permission remains OFF.
- PII view remains OFF.
- Invoice remains OFF.
- Our suppliers remains OFF.
- Listing Manager and Payment Settings remain OFF.
- No order endpoint was called.
- No Avasam credential or access token was committed to GitHub or exposed in logs.
- No Workspace, Super Admin, footer, or other visual changes are part of this work.

## Verified provider documentation

The supplied official Avasam Seller API documentation confirms:

### Authentication

- `POST https://app.avasam.com/api/auth/request-token`
- JSON body: `consumer_key`, `secret_key`
- response: `access_token`, `expires_at`
- retain `access_token` until expiry, then request a new token

The public article does not state the exact HTTP header syntax used to send `access_token` to subsequent Seller API calls.

### Read-only endpoints

- `POST /apiseeker/Products/GetSellerProductList`
- `POST /apiseeker/ProductModule/GetInventoryListWithFilter`
- `POST /apiseeker/Products/SellerStockList`

For `GetInventoryListWithFilter`, Avasam documents:

- `Supplier` as a SKU/title search field;
- omitting `Variation` + `Showchild` for single products and variation parents;
- sending both as string `"true"` for variation child SKUs;
- the endpoint as returning **sourced products**.

The supplied seller-group documentation also confirms that seller-group product restrictions can hide products from a seller.

## Live account-scoped evidence — completed

Real controlled Deploy Preview probes were executed with the Avasam Consumer Key + Secret Key stored as Netlify secrets in the Deploy Preview context.

### 1. Token exchange — PASS

A real call to `/api/auth/request-token` succeeded.

Verified live:

- Consumer Key + Secret Key are accepted;
- response contains a non-empty `access_token`;
- response contains a parseable `expires_at`.

### 2. Seller API token transport — RESOLVED

Controlled read-only probes tested multiple transport hypotheses while unauthenticated requests were used as negative controls.

Results:

- `Authorization: Bearer <access_token>` -> REJECTED
- `Token: <access_token>` -> REJECTED
- `Authorization: <access_token>` -> **PASS**

The raw Authorization form was accepted by:

- `SellerStockList` with a valid documented stock response;
- `GetInventoryListWithFilter` at HTTP level.

Therefore the verified Avasam Seller API transport for this account is:

```text
Authorization: <access_token>
```

There is **no `Bearer ` prefix**.

### 3. Pilot SKU visibility — NOT PRESENT IN INVENTORY

Pilot SKU: `S0671779793`.

The exact SKU was searched recursively in the authenticated Inventory response under both documented inventory scopes:

1. single products + variation parents (omit `Variation` / `Showchild`) -> SKU NOT PRESENT;
2. variation children (`Variation="true"`, `Showchild="true"`) -> SKU NOT PRESENT.

This is no longer an authentication problem. The API accepts the authenticated requests.

Because Avasam describes this endpoint as returning sourced products, and because seller-group restrictions can affect visibility, the next gate is account/product visibility or sourcing for `S0671779793`. Do not claim which specific configuration is responsible until it is verified in the Avasam account.

## Implementation now in PR #608

### `AvasamClient`

Implemented and locked:

- verified request-token contract;
- server-memory token lifecycle through `expires_at`;
- new authenticated request boundary that internally sends:

```text
Authorization: <access_token>
```

- callers cannot supply or override provider authentication headers;
- empty tokens fail closed before network access;
- access tokens are not echoed into provider rejection results;
- HTTPS-only trusted base URL and relative endpoint paths remain enforced.

### Read-only contracts

Still codified and fail-closed:

- catalog request/response models;
- inventory parent/single vs child scope builders;
- stock response validation;
- stock webhook envelope contract;
- acknowledgement endpoint constant.

No adapter capability is advertised yet because the exact pilot SKU cannot yet be observed through the Inventory API.

## Quality gates

### Earlier diagnostics

- #609 targeted Avasam suites + lint/type/build: PASS, CLOSED / NOT MERGED.
- #610 repository-wide full-suite baseline from exact main: FAILURE; therefore aggregate full-suite is not a #608-specific green gate.
- #611 hardened Avasam contract validation: PASS, CLOSED / NOT MERGED.
- #612 live-probe safety tests: PASS, CLOSED / NOT MERGED.

### #613 final verified-auth implementation gate

Diagnostic #613 started from exact clean #608 HEAD `b8c995bb2b998f8ad18e6797216e9529af6309fe` and added only a package prebuild gate.

Diagnostic HEAD:
`3ff03b02076870a65a4f385c6e0c69fc8211924e`

Result: **Netlify SUCCESS**.

Verified PASS:

- `avasam-adapter.test.ts`
- `avasam-branch-guard.test.ts`
- `avasam-contracts.test.ts`
- `avasam-token-manager.test.ts`
- `avasam-authenticated-transport.test.ts`
- full ESLint
- TypeScript `tsc -b`
- Vite production build
- Netlify packaging/deploy preview

#613 was CLOSED / NOT MERGED.

The clean #608 `package.json` was restored to the exact main blob `bf28760411196bfd00ff5eb2d4da4756a1bf2204`; no live-probe `prebuild` remains.

## Remaining gate — Avasam product visibility/sourcing

The authentication blocker is CLOSED.

Do **not** change the verified token transport again unless Avasam changes its live contract.

The next work item is only to establish why `S0671779793` is not visible in the authenticated sourced-product Inventory response.

Safe verification order:

1. In Avasam, verify whether `S0671779793` appears under **Search Product**.
2. Verify whether it is already present/sourced under **Inventory / My products** for this seller account.
3. Verify seller-group/product restriction state if the SKU is searchable but not visible to this seller.
4. Do not enable Orders, Invoice, PII, Our suppliers, Listing Manager, or Payment Settings.
5. Once the SKU becomes visible/sourced, rerun the exact read-only probe for `S0671779793` only.
6. Validate live SKU, price and stock response fields against the strict Loadify parsers.
7. Only after that consider advertising read-only `catalog`, `stock`, and `price` in the adapter.
8. Hosted Supplier Commerce controls, provider registrations/capabilities and pilot activation remain separate readiness gates and stay OFF until their canonical prerequisites pass.

## Netlify secrets

`AVASAM_CONSUMER_KEY` and `AVASAM_SECRET_KEY` are stored as Netlify secret values for one Deploy Preview context. Netlify's UI automatically exposes the selected secret scope group as Builds / Functions / Runtime; no production value is configured from this work.

Keep the secrets unchanged until the exact-SKU visibility probe is completed. Never paste them into chat or GitHub.
