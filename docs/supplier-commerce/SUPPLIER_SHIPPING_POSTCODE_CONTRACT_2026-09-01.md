# Supplier Shipping Postcode Contract — 2026-09-01

## Status

**CORE CONTRACT PREPARATION ONLY — NO PROVIDER ACTIVATION**

## Purpose

Allow the provider-neutral Supplier Adapter V1 shipping-quote boundary to carry an optional destination postcode for providers whose pre-order shipping contracts require postcode-level routing.

This closes the interface mismatch identified while preparing BigBuy: the BigBuy shipping quote contract requires destination country plus postcode, while the previous generic `quoteShipping` request exposed only destination country.

## Change

`SupplierShippingQuoteRequest` now contains:

- `externalOfferRef`;
- `quantity`;
- `destinationCountry`;
- optional `destinationPostcode`.

`SupplierAdapterV1.quoteShipping` now consumes this named request type.

## Compatibility

The postcode field is additive and optional, so the Supplier Adapter interface remains version 1.

Existing providers that do not require postcode continue to work with the previous country-only shape. Existing Avasam and inactive adapter implementations remain structurally compatible and retain their current fail-closed behaviour.

A provider that requires postcode must reject a quote request when postcode is absent. It must not invent a postcode, broaden the destination or silently return a less-specific shipping promise.

## Privacy boundary

The shipping quote request deliberately does not contain:

- customer name;
- street address;
- phone number;
- email address.

Postcode is introduced only as routing/quote data. This change does not grant a provider permission to process customer PII and does not change the separate order-submission PII gate.

## BigBuy effect

This change makes the common interface capable of carrying the postcode required by the already prepared BigBuy shipping contract, but it does **not** wire BigBuy into runtime shipping.

BigBuy remains:

- `codeState = scaffolded_unverified`;
- `verifiedCapabilities = []`;
- `hostedActivation = off`;
- represented by `InactiveSupplierAdapterV1` in the provider registry.

The BigBuy-specific request builder continues to fail closed when postcode is absent.

## Explicit non-effects

This change performs no:

- BigBuy or other provider network call;
- credential access or mutation;
- provider capability promotion;
- supplier activation;
- order submission;
- customer PII disclosure;
- marketplace publication;
- Supabase migration or hosted DB mutation;
- Stripe/payment/refund/payout mutation.

## Next gate

After validation of this additive core contract, BigBuy read-only adapter preparation may continue independently. Shipping remains unavailable until BigBuy runtime evidence and a real adapter are separately verified and registered.
