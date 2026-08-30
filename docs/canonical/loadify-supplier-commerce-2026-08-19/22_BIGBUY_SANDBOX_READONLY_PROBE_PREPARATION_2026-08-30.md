# BigBuy Sandbox Read-Only Probe Preparation — 2026-08-30

## Purpose

Prepare the first explicit manual BigBuy sandbox verification gate for Loadify Market Supplier Commerce without activating BigBuy, Orders, PII, marketplace listing, payment execution or hosted Supplier Commerce state.

This work follows the merged BigBuy read-only scaffold from PR #635 and checkpoint:

`20_BIGBUY_READONLY_CONTRACT_SCAFFOLD_2026-08-30.md`

Repository baseline for this branch:

`main@1484c564ee85b7a421efe6bb97ebad748590b57d`

Branch:

`test/bigbuy-sandbox-readonly-probe-20260830`

## What this probe is

New manual script:

`scripts/audit/bigbuy-sandbox-readonly-probe.mjs`

Regression coverage:

`scripts/audit/bigbuy-sandbox-readonly-probe.test.mjs`

The script is intentionally NOT attached to `prebuild`, `build`, `verify:local`, Netlify automatic execution or any GitHub Actions workflow.

It must be invoked manually with an authorized BigBuy sandbox API key and an explicitly controlled taxonomy/product/variation scope.

## Required environment

The probe requires all of the following before any network access:

- `BIGBUY_API_ENVIRONMENT=sandbox`
- `BIGBUY_API_KEY`
- `BIGBUY_PROBE_PARENT_TAXONOMY`
- `BIGBUY_PROBE_PRODUCT_ID`
- `BIGBUY_PROBE_PRODUCT_SKU`
- `BIGBUY_PROBE_VARIATION_ID`
- `BIGBUY_PROBE_VARIATION_SKU`

No credential value is committed by this change.

The probe is hard-bound to:

`https://api.sandbox.bigbuy.eu`

If `BIGBUY_API_ENVIRONMENT=production` is requested, it fails before network access.

## Read-only call allowlist

The probe can call only these catalogue endpoints, all with HTTP GET:

1. `/rest/catalog/products.json?parentTaxonomy=<controlled>`
2. `/rest/catalog/productsvariations.json?parentTaxonomy=<controlled>`
3. `/rest/catalog/productsstockbyhandlingdays.json?parentTaxonomy=<controlled>`
4. `/rest/catalog/productsvariationsstockbyhandlingdays.json?parentTaxonomy=<controlled>`

No order endpoint is present in the allowlist.

No request body is sent.

No customer PII is used.

## Authentication proof

Authentication is not accepted merely because an authenticated request succeeds.

The probe first performs an unauthenticated negative-control GET against the controlled products path.

The negative control must be rejected with HTTP 401 or 403.

Only after that rejection does the probe perform the same controlled read using:

`Authorization: Bearer <BIGBUY_API_KEY>`

If the unauthenticated request succeeds or returns an inconclusive status, the probe fails closed and does not claim Bearer authentication proof.

## Controlled response verification

The probe requires exactly one controlled product match by both product ID and SKU.

For that product it verifies the real provider response contains:

- positive integer `id`;
- non-empty `sku`;
- finite non-negative numeric `wholesalePrice`;
- `active` equal to `0` or `1`.

The probe then requires exactly one controlled variation match by both variation ID and SKU and verifies:

- positive integer variation `id`;
- non-empty variation `sku`;
- finite non-negative numeric `wholesalePrice`;
- `product` equals the explicitly controlled product ID.

Product and variation stock responses must contain the controlled ID/SKU and a `stocks` array whose buckets have non-negative integer:

- `quantity`;
- `minHandlingDays`;
- `maxHandlingDays`;
- `warehouse`;

and `maxHandlingDays >= minHandlingDays`.

Malformed or ambiguous provider data is rejected instead of coerced.

## Evidence sanitization

Successful execution returns only a sanitized structural evidence object.

It does NOT include:

- the BigBuy API key;
- the controlled product SKU;
- the controlled variation SKU;
- wholesale price values;
- stock quantities;
- complete provider payloads.

The evidence records only what is necessary to prove the gate, including:

- sandbox host;
- negative-control status;
- Bearer-authenticated success;
- controlled taxonomy and numeric product/variation IDs;
- ID/SKU match booleans;
- provider field names and value types;
- stock bucket structural validity;
- explicit safety flags confirming Orders/PII/capability promotion were not performed.

## Manual PowerShell execution pattern

Use only an authorized BigBuy sandbox credential and provider-selected controlled identifiers.

```powershell
$env:BIGBUY_API_ENVIRONMENT = "sandbox"
$env:BIGBUY_API_KEY = "<authorized-sandbox-api-key>"
$env:BIGBUY_PROBE_PARENT_TAXONOMY = "<controlled-parent-taxonomy-id>"
$env:BIGBUY_PROBE_PRODUCT_ID = "<controlled-product-id>"
$env:BIGBUY_PROBE_PRODUCT_SKU = "<controlled-product-sku>"
$env:BIGBUY_PROBE_VARIATION_ID = "<controlled-variation-id>"
$env:BIGBUY_PROBE_VARIATION_SKU = "<controlled-variation-sku>"

node .\scripts\audit\bigbuy-sandbox-readonly-probe.mjs
```

The placeholders above are not credentials or claimed BigBuy identifiers.

## Regression gate

Targeted local regression command:

```text
npm test -- scripts/audit/bigbuy-sandbox-readonly-probe.test.mjs netlify/functions/__tests__/bigbuy-readonly-contracts.test.ts
```

The new regression coverage proves:

- fixed sandbox-only execution;
- no production execution;
- explicit credential and controlled scope requirements before network access;
- unauthenticated negative control;
- Bearer authentication on authenticated reads;
- GET-only catalogue calls;
- no order endpoint use;
- sanitized evidence that excludes credentials, SKUs, wholesale prices and stock quantities.

## Current verification state

Probe implementation preparation: COMPLETE on this branch.

Real BigBuy sandbox execution: NOT EXECUTED by this checkpoint because no authorized BigBuy sandbox credential and controlled provider identifiers are present in this workstream.

Therefore current provider truth remains unchanged:

- BigBuy `codeState = scaffolded_unverified`;
- `verifiedCapabilities = []`;
- runtime SupplierAdapter capabilities `[]`;
- hosted activation OFF;
- Orders OFF;
- PII OFF;
- marketplace listing OFF.

No `catalog`, `variants`, `stock` or `price` capability may be promoted from the existence of this probe alone.

## Promotion rule after a real sandbox run

A successful real run is evidence for the exact read contracts it proves, but it still does not automatically mutate the provider registry.

After the real sandbox evidence is reviewed:

1. record the sanitized evidence and exact provider response-shape conclusions;
2. reconcile any difference between real shapes and the existing strict parsers;
3. update tests/contracts if required;
4. promote only the independently proven read capabilities;
5. keep hosted activation OFF until the normal Supplier Commerce readiness gates pass;
6. treat shipping/order/acknowledgement/tracking/cancellation/returns/reimbursement as separate future capability gates.

Orders and PII must not be enabled merely to continue discovery.
