# BigBuy Controlled Read Session — 2026-09-01

## Status

**SANDBOX EXECUTION PREPARATION ONLY — NOT PROVIDER VERIFICATION — NO CAPABILITY PROMOTION**

## Purpose

Connect the already prepared BigBuy sandbox-only GET transport, conservative response parsers and canonical read projection into one deliberately narrow execution boundary for a controlled sandbox evidence run.

This is not a catalogue importer and is not a runtime BigBuy adapter. It exists so a future authorised sandbox probe can exercise the same typed Loadify interpretation path without opening Production, order writes or marketplace publication.

## Controlled scope

A session requires exactly:

- one positive parent taxonomy id;
- one controlled product id + SKU;
- one controlled variation id + SKU;
- a correlation id owned by the `BigBuyClient` request boundary;
- an observation timestamp, or a server-generated current timestamp.

The complete controlled scope and timestamp are validated before the first provider request. Invalid caller input returns `PERMANENT_REJECTION` with zero network calls.

Product and variation SKUs must be distinct.

## Transport boundary

The session requires the concrete `BigBuyClient`, which is already sandbox-only and GET-only.

A successful session performs exactly four sequential reads:

1. products by controlled parent taxonomy;
2. variations by the same parent taxonomy;
3. product stock by the same parent taxonomy;
4. variation stock by the same parent taxonomy.

The session stops immediately on transport or parser failure. It does not continue gathering provider data after a failed gate.

A `BigBuyClient` configured for Production is rejected before network access by the underlying transport gate.

## Identity and binding rules

The provider responses may contain other catalogue rows, but only the explicitly controlled identities are eligible for projection.

For the controlled product and variation:

- the requested id must occur exactly once;
- the requested SKU must occur exactly once;
- the id and SKU must resolve to the same provider row;
- the controlled variation must point to the controlled product id.

Ambiguous, missing or inconsistent identity is `MALFORMED_RESPONSE` and stops the session.

The same id/SKU consistency rule applies when a controlled stock row exists.

## Missing stock

A missing controlled stock row is allowed to remain missing and is passed to the canonical projection as no stock evidence.

The canonical result is therefore `availability = unknown` rather than inventing:

- quantity zero;
- in-stock availability;
- an out-of-stock claim.

## Projection

Only the controlled product, controlled variation and their matching stock evidence are handed to `projectBigBuyReadModel`.

For a controlled product with the controlled variation, the sellable canonical ref is the variation SKU. Raw documented BigBuy wholesale prices remain represented in EUR minor units under the already integrated read-projection rules.

Unrelated provider rows returned by the taxonomy endpoints are not projected.

## Safety truth emitted by the session

The successful result explicitly records:

- environment = sandbox;
- request count = 4;
- method = GET;
- Production allowed = false;
- provider writes performed = false;
- customer PII processed = false;
- capability promotion performed = false.

The underlying projection additionally records no marketplace publication and no financial mutation.

## Provider state remains unchanged

This gate does not modify `supplierProviderRegistry.ts`.

BigBuy remains:

- `codeState = scaffolded_unverified`;
- `verifiedCapabilities = []`;
- `hostedActivation = off`;
- represented by `InactiveSupplierAdapterV1` in the provider factory.

## What this does not prove

Unit tests and clean Netlify execution prove Loadify's internal control logic only. They do not prove:

- that Loadify has an authorised BigBuy sandbox credential;
- that the controlled taxonomy/product/variation exists in the actual account;
- that the sandbox currently returns the documented shapes;
- that catalogue, variants, stock or price should be promoted as verified capabilities;
- that Production access should be enabled.

## External evidence gate

The existing manual `scripts/audit/bigbuy-sandbox-readonly-probe.mjs` remains the external evidence gate until authorised credentials and controlled identifiers are available.

A real provider evidence run must remain sandbox-only, preserve credential secrecy, avoid full-payload logging and be reviewed capability-by-capability before any registry change is considered.

## Explicit non-effects

This preparation performs no provider call during implementation and introduces no:

- Production transport;
- order CHECK or CREATE transport;
- cancellation, return, tracking or reimbursement mutation;
- customer name/address/phone/email disclosure;
- provider adapter registration;
- capability promotion;
- marketplace publication;
- Supplier Foundation or Supabase mutation;
- Stripe/payment/refund/payout mutation.
