# BigBuy Read-Only Contract Scaffold — 2026-08-30

## Purpose

This checkpoint prepares the Loadify Market Supplier Adapter boundary for a future BigBuy integration without claiming that BigBuy is connected, verified, commercially approved or activated.

The scaffold is based on BigBuy's official API guide reviewed on 2026-08-30. No BigBuy credentials were available to this workstream and no live or sandbox BigBuy API call was executed.

## Official contract evidence used

The official BigBuy API guide documents:

- Bearer API-key authentication using `Authorization: Bearer API_KEY`;
- production host `https://api.bigbuy.eu`;
- sandbox host `https://api.sandbox.bigbuy.eu`;
- catalogue products under `/rest/catalog/products.json`;
- product information under `/rest/catalog/productsinformation.json`;
- product variations under `/rest/catalog/productsvariations.json`;
- product stock grouped by handling days under `/rest/catalog/productsstockbyhandlingdays.json`;
- variation stock grouped by handling days under `/rest/catalog/productsvariationsstockbyhandlingdays.json`;
- order validation/creation as separate write flows that include fulfillment/customer information.

Because order flows require a separate commercial and PII disclosure gate, they are intentionally not implemented by this scaffold.

## New server-side files

### `bigBuyClient.ts`

A read-only transport boundary with the following properties:

- environment restricted to `sandbox` or `production`;
- fixed provider hosts owned by the client;
- API key owned by the client and sent only as a Bearer Authorization header;
- caller-controlled Authorization and correlation headers rejected;
- absolute URLs, protocol-relative URLs and backslash escape paths rejected;
- correlation ID required;
- missing API key fails closed before network access;
- only HTTP `GET` is permitted;
- all non-GET/write requests fail with `CAPABILITY_UNAVAILABLE` before network access;
- provider failures map into Supplier Adapter error classes;
- successful responses must be valid JSON.

Environment variables reserved for future server-side configuration:

- `BIGBUY_API_ENVIRONMENT` (`sandbox` by default, or `production`);
- `BIGBUY_API_KEY`.

No values are added by this change.

### `bigBuyContracts.ts`

Strict parsers are provided only for the documented read-only catalogue surfaces needed for the first future verification gate:

- products;
- variations;
- product/variation stock by handling days;
- parent-taxonomy query construction;
- safe stock aggregation.

The parsers fail closed on malformed IDs, SKUs, prices, stock values or handling-day ranges instead of coercing ambiguous provider data.

## Activation state

This code does **not** change the provider registry activation state.

BigBuy remains:

- code state: `scaffolded_unverified`;
- hosted activation: `OFF`;
- verified capabilities: `[]`;
- runtime Supplier Adapter capabilities: `[]`.

`createSupplierProviderAdapter('bigbuy')` still returns `InactiveSupplierAdapterV1`. The new `BigBuyClient` and contracts are not wired into Supplier Commerce execution.

## Explicitly out of scope

- BigBuy API key creation or storage;
- sandbox authentication proof;
- live provider calls;
- catalogue import into Loadify;
- product listing;
- stock/price synchronization jobs;
- shipping quote execution;
- order check/create;
- customer PII disclosure;
- payment or supplier settlement;
- tracking ingestion;
- cancellations;
- returns/reimbursements;
- hosted Supabase Supplier Commerce activation.

## Required verification before any capability can be enabled

1. Obtain an account/plan that exposes BigBuy API access and a valid API key.
2. Begin in the BigBuy sandbox environment.
3. Verify the documented Bearer authentication transport with negative controls.
4. Verify one controlled taxonomy/product/variation set using read-only calls.
5. Verify stock and wholesale-price response shapes against real sandbox/provider responses.
6. Reconcile VAT, shipping, UK import/customs and landed-cost policy before marketplace listing.
7. Only after those gates may a real `BigBuyAdapterV1` advertise any read capability.
8. Orders remain a later independent PII/commercial gate.

## Quality evidence — diagnostic PR #636

Diagnostic PR `#636 — Diagnostic: BigBuy read-only contract gates` was used only as a Netlify execution runner and was closed without merge.

Diagnostic HEAD:

`17a58072a8c81b95c434500702ae632c24666f6b`

Netlify Deploy Preview: **SUCCESS**.

The diagnostic `prebuild` executed and passed:

- `bigbuy-readonly-contracts.test.ts`;
- ESLint for `bigBuyClient.ts`, `bigBuyContracts.ts` and the targeted test;
- normal TypeScript `tsc -b`;
- normal Vite production build;
- Netlify packaging / Deploy Preview.

The targeted test verifies sandbox/production host selection, Bearer auth ownership, correlation headers, missing-key fail-closed behavior, write-method blocking, caller Authorization override blocking, URL/path escape blocking, strict products/variations/stock parsing, stock aggregation, malformed provider data rejection, and the BigBuy activation guard (`verifiedCapabilities=[]`, hosted OFF, runtime adapter capabilities `[]`).

The product PR #635 also passed its normal Netlify Deploy Preview before this evidence update. A final normal preview must pass on the checkpoint-updated product HEAD before merge.
