# BigBuy Canonical Read Projection — 2026-09-01

## Status

**PURE DATA PREPARATION ONLY — NO PROVIDER ADAPTER REGISTRATION — NO CAPABILITY PROMOTION**

## Purpose

Prepare the provider-to-Loadify mapping layer for BigBuy catalogue, variation, stock and wholesale-price data without calling BigBuy, activating BigBuy, or changing the canonical provider registry.

The projection consumes only data that has already passed the existing conservative BigBuy response parsers. It produces provider-neutral Supplier Adapter DTOs that can later be reused by a verified read adapter after authorised sandbox evidence exists.

## Authoritative currency evidence

BigBuy's official Academy documentation states that the BigBuy system works in euros and that another storefront currency requires a separately configured conversion factor. BigBuy's official API user guide documents the catalogue `wholesalePrice` field but does not attach a separate currency field to that product response.

Evidence reviewed 2026-09-01:

- `https://www.bigbuy.eu/academy/en/conversion-factor-functionality/`
- `https://www.bigbuy.eu/public/doc/Guia_API_BigBuy_EN.pdf`

Therefore this preparation represents raw BigBuy wholesale prices as **EUR**. It does not convert them to GBP and does not infer an account-specific conversion rule.

## Projection rules

`bigBuyReadProjection.ts` maps already-parsed provider data into:

- `SupplierCatalogItemRef[]`;
- `SupplierStockSnapshot[]`;
- `SupplierPriceSnapshot[]`.

### Product / variation identity

For an active BigBuy product:

- if it has variations, its sellable refs are the variation SKUs;
- if it has no variations, its sellable ref is the product SKU.

The projection fails closed when:

- product IDs are duplicated;
- variation IDs are duplicated;
- a product and/or variation reuse the same external SKU/ref;
- a variation references a product that does not exist.

It does not invent mappings to make inconsistent provider data fit the Loadify model.

### Stock

For every sellable ref:

- provider stock buckets are summed with the existing safe stock helper;
- total > 0 => `in_stock`;
- total = 0 => `out_of_stock`;
- missing stock row => `unknown`.

Missing stock is deliberately **not** interpreted as zero and is never interpreted as available.

A stock row whose provider ID does not match the expected product/variation ID fails closed.

### Price

Raw BigBuy `wholesalePrice` is projected to EUR minor units only when it can be represented exactly to cent precision.

Sub-cent supplier cost is rejected rather than silently rounded. Currency conversion, FX spread, VAT, selling price, margin and checkout economics remain outside this projection and stay governed by Loadify's existing financial/economics controls.

### Inactive products

Products whose documented `active` value is `0` are excluded from the projected catalogue, stock and prices. Exclusion does not delete or mutate any Loadify record because this function is pure and non-persistent.

## Safety boundary

The projection records that it performs no:

- provider network call;
- provider capability promotion;
- marketplace publication;
- provider write;
- customer PII processing;
- financial mutation.

This change does **not** modify `supplierProviderRegistry.ts`. BigBuy remains:

- `codeState = scaffolded_unverified`;
- `verifiedCapabilities = []`;
- `hostedActivation = off`;
- represented by `InactiveSupplierAdapterV1` in the provider factory.

## Why this is not runtime verification

Correctly mapping a mocked/documented payload proves only Loadify's internal interpretation logic. It does not prove:

- that Loadify has an authorised BigBuy credential;
- that the sandbox account exposes the expected catalogue;
- that controlled product/variation identifiers exist;
- that live/sandbox field semantics match the prepared contract;
- that any BigBuy capability should be promoted.

The existing controlled sandbox probe remains the evidence gate for that transition.

## Next gate

After this projection is validated:

1. keep BigBuy inactive in the canonical provider registry;
2. obtain authorised sandbox credentials and controlled identifiers through the official BigBuy route;
3. execute the existing controlled read-only sandbox verification;
4. review that evidence capability-by-capability;
5. only after successful evidence review, consider wiring a BigBuy read-only adapter to this projection and promoting the specific verified read capabilities.
