# Avasam Verified API Integration Checkpoint — 2026-08-29

## Branch / base

- Repository: `LoadifyMarketLTD/loadifymarket.co.uk`
- Branch: `feat/avasam-verified-api-integration-20260829`
- Base: `main@f830c5bb2f31b10338ade8d0524bb3cf15ab53df`
- Pull request: `#608`
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
- no Bearer/Authkey/header syntax is guessed;
- Supplier Commerce controls remain OFF;
- Orders remain OFF.

## CI truth

GitHub Actions continue to fail before runner allocation (`runner_id=0`, empty `steps=[]`). This is infrastructure evidence, not a code-test failure. Do not claim unit/type/lint/build PASS from those runs.

Netlify Deploy Preview remains the independent build signal and must be checked against the exact current HEAD before any readiness decision.

## Next gate

1. verify exact token transport from provider evidence or a controlled account-scoped read-only probe;
2. wire token transport inside the trusted Avasam client boundary;
3. run controlled read-only calls only;
4. validate actual response shapes against strict parsers;
5. only then advertise `catalog`, `stock` and `price` capabilities;
6. keep order submission disabled until a separate order-permission and controlled-order gate.
