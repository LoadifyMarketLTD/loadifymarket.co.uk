# Avasam Verified API Integration Checkpoint — 2026-08-29

## Branch / base

- Repository: `LoadifyMarketLTD/loadifymarket.co.uk`
- Branch: `feat/avasam-verified-api-integration-20260829`
- Base: `main@f830c5bb2f31b10338ade8d0524bb3cf15ab53df`
- Pull request: `#608`
- Last code-only HEAD before this checkpoint update: `25ebb3809e65e5c24619c85189c00b9b51c01dff`
- Status: OPEN / DRAFT / NOT MERGED

## Provider evidence supplied from live Avasam Help Centre

Seller API documentation supplied by the account owner on 2026-08-29 confirms:

### Authentication

- `POST https://app.avasam.com/api/auth/request-token`
- JSON request body fields: `consumer_key`, `secret_key`
- response fields: `access_token`, `expires_at`
- retain the token for repeated calls until it expires, then request a new token
- authentication calls are documented as not counting against the API rate limit

### Read-only catalogue / inventory contracts

- `POST /apiseeker/Products/GetSellerProductList`
  - body: `Page`, `Limit`
  - response includes SKU, seller cost price, title, barcode, VAT, category, description, RRP, dimensions, weight, images, variations and category ID

- `POST /apiseeker/ProductModule/GetInventoryListWithFilter`
  - supports pagination and filtering
  - response envelope: `data` + `total`
  - rows include SKU, price, RRP, stock, VAT, price including VAT, mapping/listing fields and provider identifiers

- `POST /apiseeker/Products/SellerStockList`
  - body: `limit`, `page`
  - response rows: `SKU`, `Stock`

### Webhook contract evidence

Avasam API Keys UI supports Verification Token, Stock Update Endpoint and Price Update Endpoint.

The documented stock update envelope contains `requestId`, `on`, `token`, and `data[]` with `sku`, `quantity`, `updatedOn`.

Stock notifications must be acknowledged via `/api-seller/Product/AcknowledgeStockUpdate`.

JWT verification semantics remain a separate gate before exposing a webhook endpoint.

### Order contracts are documented but deliberately disabled

Avasam documentation includes `CreateSellerOrder` and `AddNewOrder`, but the Loadify Avasam API account currently keeps Orders permission OFF. No order capability is activated by PR #608.

## Important Seller API vs Supplier API distinction

The Seller API documentation links the word `Login` from its endpoint tips to `https://help.avasam.com/login`.

That link currently redirects to the **Supplier API** documentation, not to a Seller API authentication section. The Supplier API uses provider-side fields such as `SessionToken` / `AuthorizationToken` in request bodies for supplier flows.

Those Supplier API fields are **not** treated as evidence for Seller API token transport. They belong to a different relationship/API surface and must not be copied into Loadify's seller-account integration.

Third-party Patchworks documentation independently identifies Avasam authentication as OAuth 2 client credentials and identifies `access_token` as the response token field. It does not, however, expose enough Avasam-specific request configuration to prove the exact HTTP transport/header syntax used for subsequent Seller API calls.

Therefore the exact Seller API token transport remains intentionally unverified.

## Current implementation in PR #608

Implemented:

1. exact request-token contract using Consumer Key + Secret Key server-side only;
2. strict successful token response validation;
3. in-memory access token lifecycle until `expires_at`, refresh after expiry and explicit invalidation;
4. exact verified endpoint constants for catalogue, inventory, stock and stock-update acknowledgement;
5. typed request builders and strict parsers for GetSellerProductList, GetInventoryListWithFilter, SellerStockList and the stock webhook envelope structure;
6. branch guards keep `AvasamAdapterV1.capabilities = []`;
7. old guessed `Authorization: Bearer` behavior removed from the verified branch;
8. caller-supplied guessed provider auth headers such as `Authorization` or `Authkey` are rejected before network access.

## Remaining blocker

The supplied Seller API page repeatedly states that subsequent calls require a valid token, but does not explicitly identify the exact HTTP token transport/header syntax for GetSellerProductList, GetInventoryListWithFilter or SellerStockList.

Therefore:

- no provider read capability is advertised yet;
- no live catalogue/stock/price request is made yet;
- no Bearer/Authkey/SessionToken/header syntax is guessed;
- Supplier Commerce controls remain OFF;
- Orders remain OFF.

## Quality-gate evidence

GitHub Actions continue to fail before runner allocation (`runner_id=0`, empty `steps=[]`). This is infrastructure evidence, not a code-test failure.

### Exact #608 normal preview

Code-only HEAD `25ebb3809e65e5c24619c85189c00b9b51c01dff`:

- Netlify Deploy Preview: **SUCCESS**
- preview: `https://deploy-preview-608--loadifymarketcouk.netlify.app`

### Diagnostic #609 — PR #608 code gates

Diagnostic branch started from exact #608 code-only HEAD.

First diagnostic with `prebuild = npm test && npm run lint`:

- HEAD `18e9349d54dd56c9d254ade1930d21c0fb5f5154`
- Netlify: **FAILURE**

The diagnostic was narrowed to the four Avasam suites plus full ESLint, followed by the normal repository build (`tsc -b && vite build`):

- HEAD `433aaa816eb591347a03055bff958393373ee918`
- Netlify: **SUCCESS**
- `avasam-adapter.test.ts`: PASS
- `avasam-branch-guard.test.ts`: PASS
- `avasam-contracts.test.ts`: PASS
- `avasam-token-manager.test.ts`: PASS
- ESLint: PASS
- TypeScript `tsc -b`: PASS
- Vite production build: PASS
- Netlify packaging/deploy preview: PASS

PR #609 was CLOSED / NOT MERGED after evidence capture.

### Diagnostic #610 — exact main full-suite baseline

Exact `main@f830c5bb2f31b10338ade8d0524bb3cf15ab53df` plus only `prebuild = npm test && npm run lint`:

- diagnostic HEAD `e5573323be6720ae883ee9695f4643f716234a63`
- Netlify: **FAILURE**
- PR #610 CLOSED / NOT MERGED

This proves the aggregate full-suite prebuild gate is also failing on exact main, independently of PR #608. Without Netlify build logs this does not prove the exact failing test set is identical; therefore do not claim that. The available evidence does establish that all PR-specific Avasam suites and the full lint/type/build path pass, while the repository-wide full-suite gate already fails on main.

## Next gate

1. verify exact Seller API token transport from provider evidence or a controlled account-scoped read-only probe;
2. wire token transport inside the trusted Avasam client boundary;
3. run controlled read-only calls only;
4. validate actual response shapes against strict parsers;
5. only then advertise `catalog`, `stock` and `price` capabilities;
6. keep order submission disabled until a separate order-permission and controlled-order gate.
