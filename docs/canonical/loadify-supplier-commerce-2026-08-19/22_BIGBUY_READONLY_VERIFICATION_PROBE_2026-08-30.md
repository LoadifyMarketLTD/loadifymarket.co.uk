# BigBuy Read-Only Verification Probe — 2026-08-30

## Purpose

Prepare the first executable, credential-gated BigBuy verification step without claiming that BigBuy is connected or that any provider capability is verified.

This work does **not** activate Supplier Commerce, create a BigBuy adapter, import or list a product, synchronize hosted stock/price state, submit an order, disclose customer PII, or make a payment-related change.

## Existing foundation

PR #635 already established a fail-closed read-only BigBuy boundary based on the official BigBuy API guide:

- Bearer API-key authentication;
- sandbox host `https://api.sandbox.bigbuy.eu`;
- production host `https://api.bigbuy.eu`;
- GET-only server transport;
- fixed provider hosts;
- caller auth override rejection;
- strict documented parsers for products, variations and stock-by-handling-days;
- `verifiedCapabilities=[]`;
- hosted activation OFF;
- runtime BigBuy adapter remains the zero-capability inactive scaffold.

The official guide re-check on 2026-08-30 also confirms that BigBuy order processing is a separate write/PII domain: order payloads contain recipient/shipping information and the documented flow instructs integrations to use the order `check` endpoint before the `create` flow. This probe intentionally remains outside that domain.

## New explicit audit command

Script:

`scripts/audit/bigbuy-readonly-catalog-probe.mjs`

Command:

`npm run audit:bigbuy:readonly`

This command is **manual only**. It is not attached to `prebuild`, Netlify build, application runtime, cron, webhook processing or Supplier Commerce execution.

## Required environment

The probe requires:

- `BIGBUY_API_KEY`
- `BIGBUY_AUDIT_PARENT_TAXONOMY`
- `BIGBUY_AUDIT_PRODUCT_SKU`

Optional:

- `BIGBUY_AUDIT_VARIATION_SKU`
- `BIGBUY_API_ENVIRONMENT=sandbox|production`

Sandbox is the default.

Production is rejected unless this exact explicit confirmation is present:

`BIGBUY_PROBE_PRODUCTION_CONFIRMATION=ALLOW_BIGBUY_PRODUCTION_READ_ONLY_PROBE`

This is only an execution safety acknowledgement; it does not authorize any write or commercial activation.

## Probe behaviour

For the controlled product SKU, the probe performs only GET requests to:

- `/rest/catalog/products.json`
- `/rest/catalog/productsstockbyhandlingdays.json`

When a controlled variation SKU is supplied, it also performs GET requests to:

- `/rest/catalog/productsvariations.json`
- `/rest/catalog/productsvariationsstockbyhandlingdays.json`

Every contract uses:

1. an unauthenticated negative-control GET;
2. a Bearer-authenticated GET using the configured BigBuy API key;
3. strict response-shape validation aligned to the existing BigBuy contracts;
4. exact controlled-SKU presence validation.

A capability is **not** treated as proven merely because the authenticated HTTP request returns 2xx. The documented response shape and controlled SKU must also be present, while the unauthenticated control must fail.

## Secret/data minimisation

The probe does not print:

- the BigBuy API key;
- full catalogue rows;
- wholesale prices;
- stock quantities;
- provider response bodies.

Successful CLI output contains only a sanitized evidence summary with provider/environment/taxonomy, the explicitly controlled SKU identifiers and boolean verification results.

No customer data or order data is used by the probe.

## Regression tests

Test:

`scripts/audit/bigbuy-readonly-catalog-probe.test.mjs`

The mocked test suite verifies:

- sandbox host selection;
- GET-only execution;
- Bearer header ownership;
- unauthenticated negative controls;
- strict product and stock shape validation;
- optional variation + variation-stock validation;
- required credentials/scope before any network call;
- production refusal without the explicit confirmation phrase;
- no API-key or commercial-value logging.

## Truth boundary before live execution

At creation of this checkpoint:

- **BigBuy authentication with Loadify credentials: NOT EXECUTED**;
- **BigBuy product response shape with Loadify credentials: NOT EXECUTED**;
- **BigBuy variation response shape: NOT EXECUTED**;
- **BigBuy stock response shape: NOT EXECUTED**;
- **verifiedCapabilities remain `[]`**;
- **BigBuyAdapterV1 does not exist as an active provider adapter**;
- **hosted activation remains OFF**.

The existence of this probe must never be used as evidence that BigBuy is connected.

## Promotion criteria after live sandbox evidence

A later implementation PR may promote read capabilities only after an authorized sandbox run proves them independently:

- products + controlled SKU + numeric wholesale price -> candidate evidence for `catalog` and `price`;
- product stock contract + controlled SKU -> candidate evidence for `stock`;
- variation contract + controlled variation SKU -> candidate evidence for `variants`;
- variation stock may strengthen variant-level stock mapping evidence.

Even after a successful probe, promotion requires a separate reviewed `BigBuyAdapterV1` implementation and tests. The provider registry must not be changed merely by executing the audit.

Shipping, order submission, acknowledgement, tracking, cancellation, returns and reimbursement remain separate later gates.

## Safety state

Unchanged:

- BigBuy verified capabilities: `[]`;
- BigBuy hosted activation: OFF;
- no BigBuy order call;
- no BigBuy PII disclosure;
- no automatic product import/listing;
- no hosted stock/price write;
- no checkout/Stripe/payment change;
- no Web Mobile / Android / Auth / Seller Workspace / Super Admin change;
- no GitHub Actions.

## Next step

1. validate the probe itself locally with mocked tests, lint/typecheck/build and Netlify preview;
2. obtain an authorized BigBuy sandbox API key and select a controlled taxonomy/product SKU (and variation SKU if applicable);
3. run `npm run audit:bigbuy:readonly` manually in sandbox;
4. record the exact sanitized PASS/FAIL evidence;
5. only then decide whether a separate `BigBuyAdapterV1` read-only implementation can promote `catalog`, `price`, `stock` and/or `variants`.
