# BigBuy Transactional Contract Safety Scaffold — 2026-09-01

## Status

**PREPARATION ONLY — NO PROVIDER WRITE PATH — NO CAPABILITY PROMOTION**

## Purpose

Extend the existing BigBuy read-only scaffold with provider-contract knowledge that can be prepared safely before authorised sandbox credentials arrive, without making BigBuy executable for supplier orders.

## Authoritative provider evidence

Source: BigBuy API user guide, `https://www.bigbuy.eu/public/doc/Guia_API_BigBuy_EN.pdf`, reviewed 2026-09-01.

The official guide documents:

- Bearer API-key authentication and separate Production / sandbox hosts;
- product images via `GET /rest/catalog/productsimages.{format}?parentTaxonomy=...`;
- order validation via `POST /rest/order/check/multishipping.{format}`;
- order creation via `POST /rest/order/create/multishipping.{format}`;
- pre-order shipping options via `POST /rest/shipping/orders.{format}`;
- carrier/service discovery via `GET /rest/shipping/carriers.{format}`.

The guide explicitly instructs integrations to call CHECK before CREATE. CHECK validates the order and returns totals; it does not create an order.

The guide also explicitly documents a multi-warehouse partial-create outcome: a CREATE request may produce one or more created warehouse orders and one or more errors in the same response. Therefore Loadify must never collapse `orders.length > 0` into generic atomic success when `errors.length > 0`.

## What this gate adds

### Product images

`bigBuyContracts.ts` now models the documented image response and:

- accepts the guide's documented boolean/string ambiguity for `isCover`;
- requires image IDs and names;
- requires HTTPS image URLs without embedded credentials;
- does not fetch, publish or trust the image automatically.

This is parser preparation only. Product rights, provenance, content-quality and marketplace-publication gates remain independent.

### Shipping quote contract

`bigBuyTransactionalContracts.ts` models the documented pre-order shipping request and response.

The request builder accepts only:

- destination ISO country;
- destination postcode;
- product references and quantities.

It deliberately does not accept customer name, street address, phone or email.

A real integration mismatch is now explicit: BigBuy requires both country **and postcode** for an exact shipping quote, while the current provider-neutral `SupplierAdapterV1.quoteShipping` input exposes only `destinationCountry`. BigBuy shipping is therefore **not wired into the generic adapter** by this gate. The core contract must be extended or a separately governed server-side destination context must provide postcode before runtime integration.

### Order CHECK parser

The CHECK parser:

- parses per-warehouse totals and provider errors;
- reports `canCreate=true` only when there is at least one validated warehouse order and zero provider errors;
- records `providerMutationPerformed=false`.

A CHECK PASS is not order acknowledgement and does not promote `order_submission`.

### Order CREATE parser

The CREATE parser classifies outcomes as:

- `complete` — created orders and zero errors;
- `partial` — created orders plus errors;
- `failed` — zero created orders plus provider errors.

`partial` always sets:

- `partialCreationDetected=true`;
- `requiresReconciliation=true`.

An empty CREATE response is rejected as malformed rather than treated as success.

## Why order submission remains blocked

Public documentation is useful provider-contract evidence, but it does not prove all runtime guarantees Loadify requires.

The scaffold therefore keeps these blockers machine-readable:

- `bigbuy_orders_permission_not_runtime_verified`;
- `bigbuy_pii_permission_not_runtime_verified`;
- `bigbuy_idempotency_contract_missing`;
- `bigbuy_lost_response_recovery_contract_missing`;
- `bigbuy_partial_creation_reconciliation_not_runtime_verified`.

The inspected official material does not establish a provider idempotency-key contract or a supported lost-response recovery procedure that would let Loadify safely decide whether CREATE may be retried after a network timeout. Those facts must not be inferred.

The documented CREATE request also requires recipient shipping PII. That disclosure remains separately prohibited until the exact permission, minimisation and runtime execution gate is verified.

## Runtime boundary

This gate does **not** change `BigBuyClient`: it remains GET-only and rejects POST before network access.

This gate does **not** change `supplierProviderRegistry.ts`: BigBuy remains:

- `codeState = scaffolded_unverified`;
- `verifiedCapabilities = []`;
- `hostedActivation = off`.

No shipping, order, acknowledgement or tracking capability is promoted.

## Safety

This work performs no:

- BigBuy sandbox or Production network call;
- API credential storage or disclosure;
- supplier order CHECK or CREATE call;
- customer PII disclosure;
- marketplace publication;
- Supplier Foundation mutation;
- Supabase migration or hosted DB mutation;
- payment, refund, reimbursement or payout mutation;
- provider activation.

## Next gates

1. Obtain authorised BigBuy sandbox credentials and controlled taxonomy/product/variation IDs.
2. Run the existing controlled read-only sandbox verification.
3. Review and promote only read capabilities supported by real evidence.
4. Resolve the provider-neutral shipping postcode contract before wiring BigBuy shipping.
5. Obtain authoritative/runtime evidence for Orders permission, PII permission, idempotency and lost-response recovery.
6. Design durable reconciliation for documented multi-warehouse partial creation before any CREATE transport can be enabled.
7. Only then consider a separately gated BigBuy write client / adapter path.
