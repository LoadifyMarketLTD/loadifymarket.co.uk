# Avasam Verified API Integration Checkpoint — 2026-08-29

## Branch / base

- Repository: `LoadifyMarketLTD/loadifymarket.co.uk`
- Branch: `feat/avasam-verified-api-integration-20260829`
- Base: `main@f830c5bb2f31b10338ade8d0524bb3cf15ab53df`
- Pull request: `#608`
- Latest working HEAD before this checkpoint-only update: `81f933e7f70b325ddff1a7cdd7820e594be16a49`
- Status: OPEN / DRAFT / NOT MERGED

## Provider evidence supplied from live Avasam Help Centre

Seller API documentation supplied by the account owner on 2026-08-29 confirms:

### Authentication

- `POST https://app.avasam.com/api/auth/request-token`
- JSON request body fields: `consumer_key`, `secret_key`
- response fields: `access_token`, `expires_at`
- `access_token` is described as essential for Seller API calls to the account
- retain the token for repeated calls until it expires, then request a new token
- authentication calls are documented as not counting against the API rate limit

The documentation does not explicitly state the HTTP transport/header syntax for sending `access_token` to the subsequent Seller API endpoints.

### Read-only catalogue / inventory contracts

- `POST /apiseeker/Products/GetSellerProductList`
  - body: `Page`, `Limit`
  - response includes SKU, seller cost price, title, barcode, VAT, category, description, RRP, dimensions, weight, images, variations and category ID

- `POST /apiseeker/ProductModule/GetInventoryListWithFilter`
  - supports pagination and filtering, including SKU/title filtering through `Supplier`
  - response envelope: `data` + `total`
  - rows include SKU, price, RRP, stock, VAT, price including VAT, mapping/listing fields and provider identifiers
  - Avasam documents two distinct inventory views:
    - omit `Variation` and `Showchild` => single products + variation parents;
    - set both to string `"true"` => variation child SKUs only

- `POST /apiseeker/Products/SellerStockList`
  - body: `limit`, `page`
  - response rows: `SKU`, `Stock`
  - stock is documented as Integer

### Webhook contract evidence

Avasam API Keys UI supports Verification Token, Stock Update Endpoint and Price Update Endpoint.

The documented stock update envelope contains `requestId`, `on`, `token`, and `data[]` with `sku`, `quantity`, `updatedOn`. Quantity is documented as int and timestamps as DateTime.

Stock notifications must be acknowledged via `/api-seller/Product/AcknowledgeStockUpdate`.

JWT verification semantics remain a separate gate before exposing a webhook endpoint.

### Order contracts are documented but deliberately disabled

Avasam documentation includes `CreateSellerOrder` and `AddNewOrder`, but the Loadify Avasam API account currently keeps Orders permission OFF. No order capability is activated by PR #608.

`CreateSellerOrder` documents an `Authkey` order field, while inventory/order response models also expose `authkey` as a supplier unique code. This is not accepted as evidence that Seller API `access_token` should be transported as `Authkey`.

## Seller-management / seller-group evidence

Additional Avasam supplier-account documentation supplied on 2026-08-29 confirms that Avasam seller groups can:

- apply price discounts;
- restrict which supplier products are visible to a seller;
- be activated/deactivated;
- assign sellers to a restricted product group.

It also documents seller account settings such as VAT status, surcharges, invoice cadence, credit limits and payment terms.

Implication for the token-transport probe: a valid authenticated response can legitimately contain zero matching rows for the chosen SKU if the account/product visibility configuration excludes that SKU. Therefore **SKU presence is recorded as evidence but is not required to prove token transport**. The authentication proof requires a valid documented inventory envelope, not a particular commercial product result.

These seller-management features are not implemented or activated by PR #608; they are evidence for later Supplier Commerce commercial-policy mapping.

## Important Seller API vs Supplier API distinction

The Seller API documentation links the word `Login` from its endpoint tips to `https://help.avasam.com/login`.

That link currently redirects to the **Supplier API** documentation, not to a Seller API authentication section. The Supplier API uses provider-side fields such as `SessionToken` / `AuthorizationToken` in request bodies for supplier flows.

Those Supplier API fields are **not** treated as evidence for Seller API token transport. They belong to a different relationship/API surface and must not be copied into Loadify's seller-account integration.

Third-party Patchworks documentation independently identifies Avasam authentication as OAuth 2 client credentials and identifies `access_token` as the response token field. It does not expose enough Avasam-specific request configuration to prove the exact HTTP transport/header syntax used for subsequent Seller API calls.

Therefore exact Seller API token transport still requires direct provider evidence or an account-scoped empirical read-only proof.

## Current implementation in PR #608

Implemented:

1. exact request-token contract using Consumer Key + Secret Key server-side only;
2. strict successful token response validation;
3. in-memory access token lifecycle until `expires_at`, refresh after expiry and explicit invalidation;
4. exact verified endpoint constants for catalogue, inventory, stock and stock-update acknowledgement;
5. typed request builders and strict parsers for GetSellerProductList, GetInventoryListWithFilter, SellerStockList and the stock webhook envelope structure;
6. explicit inventory scope contract:
   - `parents_and_singles` => omit `Variation` + `Showchild`;
   - `variation_children` => send both as `"true"`;
7. documented integer stock/quantity fields are validated as integers;
8. documented webhook DateTime fields must be parseable timestamps;
9. branch guards keep `AvasamAdapterV1.capabilities = []`;
10. old guessed automatic `Authorization: Bearer` behavior removed from the production client boundary;
11. caller-supplied guessed provider auth headers such as `Authorization` or `Authkey` are rejected before network access;
12. a dedicated controlled live-probe script exists at `scripts/audit/avasam-readonly-token-transport-probe.mjs`;
13. its safety/causality tests exist at `scripts/audit/avasam-readonly-token-transport-probe.test.mjs`.

## Controlled live token-transport probe contract

The probe is **diagnostic only**. It does not activate a capability and does not change hosted Supplier Commerce state.

Required environment variables:

- `AVASAM_CONSUMER_KEY`
- `AVASAM_SECRET_KEY`
- `AVASAM_PROBE_SKU`

Execution sequence:

1. request a real Avasam `access_token` through the verified `request-token` endpoint;
2. POST one SKU-scoped, `limit: 1`, read-only `GetInventoryListWithFilter` request **without** provider authentication as a negative control;
3. POST the exact same read-only request with diagnostic OAuth-standard hypothesis `Authorization: Bearer <access_token>`;
4. treat Bearer as empirically proven only if:
   - the negative control is rejected / does not return the documented inventory envelope; and
   - the Bearer request succeeds and returns the documented `{ data: [], total: number }` envelope;
5. otherwise fail closed and do not promote Bearer into `AvasamClient`.

The probe deliberately does **not** require the selected SKU to be present because Avasam seller-group/product restrictions can legitimately hide products. `skuMatched` is captured only as additional evidence.

The probe never logs:

- Consumer Key;
- Secret Key;
- access token;
- token expiry payload;
- returned product rows;
- prices;
- stock values;
- supplier identifiers.

It logs only the gate name, endpoint, requested SKU, response status/shape, result count/total and whether the SKU matched.

## Quality-gate evidence

GitHub Actions continue to fail before runner allocation (`runner_id=0`, empty `steps=[]`). This is infrastructure evidence, not a code-test failure.

### Diagnostic #609 — initial PR #608 gates

- narrowed diagnostic HEAD `433aaa816eb591347a03055bff958393373ee918`: Netlify SUCCESS
- four Avasam suites PASS
- ESLint PASS
- TypeScript `tsc -b` PASS
- Vite production build PASS
- Netlify packaging/deploy preview PASS
- CLOSED / NOT MERGED

### Diagnostic #610 — exact main full-suite baseline

Exact `main@f830c5bb2f31b10338ade8d0524bb3cf15ab53df` plus only `prebuild = npm test && npm run lint`:

- diagnostic HEAD `e5573323be6720ae883ee9695f4643f716234a63`
- Netlify FAILURE
- CLOSED / NOT MERGED

This proves only that the aggregate repository-wide test gate is already not green on exact main independently of #608; it does not prove the exact failing tests are identical.

### Diagnostic #611 — hardened contract revalidation

- exact hardened #608 code-only HEAD `d13eeaaefb0a179aac7ba0398d8955076bf332c0`
- diagnostic HEAD `202fc173982413a398f08cfdcfbc5947092304e4`
- Netlify SUCCESS
- four Avasam suites + ESLint + TypeScript + Vite build + Netlify PASS
- CLOSED / NOT MERGED

### Diagnostic #612 — live-probe safety contract

Exact #608 working HEAD `81f933e7f70b325ddff1a7cdd7820e594be16a49` plus only a targeted diagnostic prebuild:

- diagnostic HEAD `8b31344b1f52be69b05121f2b537dcb497f702b7`
- Netlify Deploy Preview: **SUCCESS**
- existing four Avasam suites: PASS
- `avasam-readonly-token-transport-probe.test.mjs`: PASS
- full ESLint: PASS
- TypeScript `tsc -b`: PASS
- Vite production build: PASS
- Netlify packaging/deploy preview: PASS
- the real Avasam network probe was **not** executed in #612; `fetch` was mocked
- no real credential was present
- PR #612 CLOSED / NOT MERGED

## Current blocker / next gate

Code-side preparation for a safe empirical token-transport test is complete.

The remaining gate is to provide the real Avasam Consumer Key and Secret Key to a **temporary, server-side build-only Deploy Preview context**, never to GitHub or chat, then run the diagnostic read-only probe.

Until that empirical gate passes:

- PR #608 remains DRAFT / NOT MERGED;
- no live Avasam capability is advertised;
- `AvasamAdapterV1.capabilities = []`;
- no catalogue/stock/price synchronization is activated;
- Supplier Commerce hosted controls remain OFF;
- Orders remain OFF.

After a Bearer proof succeeds:

1. implement verified Bearer token transport inside the trusted `AvasamClient` boundary;
2. keep callers unable to inject provider-auth headers;
3. run controlled real product/inventory/stock reads and validate actual provider shapes;
4. only then advertise read-only `catalog`, `stock` and `price` capabilities;
5. keep `order_submission` disabled until a separate permission + controlled-order gate.
