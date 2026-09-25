# ECN GB->GB Shadow Parity Evidence — 25 September 2026

**Status:** ACTIVE PARITY AUDIT  
**Scope:** Existing UK marketplace seller checkout vs ECN shadow route decision  
**Branch:** `feat/multicountry-uk-ro`  
**Shadow function:** `public.server_cross_border_product_decision_v1`  
**Live checkout references:** `netlify/functions/create-checkout.ts`, `netlify/functions/create-payment-intent.ts`

## Production sample

A read-only production audit was run against the current active physical UK catalogue.

Observed production population:

- active physical listings: **9**
- product market/currency GB+GBP ready: **9/9**
- seller status / Stripe status / GB selling+delivery capability ready: **9/9**
- GB shipping readiness RPC eligible: **9/9**
- approved GB market-price version present: **0/9**
- complete live GB marketplace tax evidence: **4/9**

Global GB readiness RPCs observed during the same audit:

- market compliance: eligible
- payment readiness: eligible
- legal policy boundary: eligible
- launch control: live / checkout enabled / payment enabled

## Parity finding 1 — legacy GB listing price

The live UK checkout uses the canonical `products.price` / GBP listing price.

The market-price evidence ledger currently has no approved GB price version for the 9 active physical listings.

Therefore a shadow engine that required `server_product_market_price_decision_v1(...,'GB')` without compatibility fallback would incorrectly block all 9 current UK listings.

ECN-2 already contains the correct shadow-only compatibility rule:

- route must be `GB-GB`
- origin must be the controlled legacy GB implicit-origin path
- product currency must be GBP
- `products.price` remains the compatibility price
- reason = `legacy_gb_listing_price`

This preserves UK behaviour without weakening RO or cross-border pricing evidence.

## Parity finding 2 — GB marketplace seller tax evidence

The live checkout calls `resolveMarketplaceTaxV1`.

For the current production population:

- **4/9** active physical listings have the complete product tax evidence required by the live GB checkout;
- **5/9** do not currently carry complete product-level tax evidence and therefore remain blocked by the live checkout tax resolver.

The initial ECN shadow decision treated domestic route tax readiness as automatically true and did not reproduce this live marketplace-seller tax boundary.

That was a real parity defect because the shadow engine could classify a listing as checkout-eligible while the live checkout would correctly reject it.

## Repair applied

The ECN shadow route decision now mirrors the existing GB marketplace-seller tax contract for checkout parity:

- destination postcode is explicit input;
- seller country must resolve to the GB contract;
- excluded postcode families remain blocked: `BT|GY|JE|IM|GX|BF`;
- seller tax self-declaration v1 is required;
- seller must be non-VAT under the current narrow contract;
- seller VAT number must not conflict;
- listing must be a physical product;
- product treatment must be `seller_non_vat_declared`;
- product evidence source/version/timestamp must match the live contract;
- VAT rate must be 0;
- `priceExVat` must equal listing price to penny precision;
- failure produces `TAX_READINESS_INCOMPLETE`;
- Marketplace Seller RO/international tax remains fail-closed and is not inferred from the GB contract.

Supplier Commerce remains separate because it has its own governed tax/economics evidence chain.

## Safety

This repair changes only the **shadow/non-authoritative ECN decision**.

It does not:

- change live UK checkout;
- create new tax evidence for listings;
- make the 5 currently incomplete listings purchasable;
- activate Romania;
- apply ECN migrations to production.

## Remaining GB->GB parity work

Continue comparing the live UK contract and the shadow route decision across:

- product/market
- seller capability
- dispatch/origin
- price
- shipping
- tax
- compliance
- payment
- legal
- launch control
- returns

Every mismatch must be repaired in the shadow/appropriate domain unless the live behaviour is independently proven defective.


## Parity finding 3 — seller commercial boundary, stock and selected shipping method

A second read-only production parity pass checked the active UK physical catalogue against the live checkout conditions for seller account state, stock and selected shipping method.

Observed production state:

- active physical listings: **9**
- positive stock: **9/9**
- seller commercial/account boundary ready: **9/9**
- at least one active supported shipping selection with non-negative rate: **9/9**
- valid shipping choices per listing: **1–2**

The active seller is an **individual seller**. `businessName` is intentionally empty while `fullName` is populated.

This exposed a shadow-only identity bug during implementation: SQL using `COALESCE(businessName, fullName, '')` treats an empty businessName as present and never reaches fullName. The live TypeScript checkout correctly uses `businessName?.trim() || fullName?.trim()`.

The shadow engine was corrected to use empty-string-aware fallback:

- non-empty business name, otherwise
- non-empty full name.

No live seller data was changed.

### Shadow parity hardening added

For marketplace-seller checkout context the shadow decision now also requires:

- active `public.users` account;
- non-admin seller actor;
- active `account_capabilities` seller capability;
- active/non-paused seller profile;
- active Stripe Connect status and Stripe account id;
- non-empty commercial identity with individual-seller fallback;
- positive requested whole quantity;
- sufficient `products.stockQuantity`;
- selected `product_shipping` relation;
- active shipping method;
- carrier restricted to the same live supported set: **Royal Mail / Evri**;
- at least one non-negative shipping rate for the selected method.

New explicit shadow outputs include seller-account eligibility, stock eligibility, selected-shipping eligibility, selected method/courier/rate and requested quantity.

This remains read-only and non-authoritative.
