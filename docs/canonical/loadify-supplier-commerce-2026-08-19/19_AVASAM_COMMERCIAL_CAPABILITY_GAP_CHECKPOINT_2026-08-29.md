# Avasam Commercial Capability Gap Checkpoint — 2026-08-29

## Purpose

This checkpoint separates the **verified read-only provider integration** from the **hosted commercial pilot** prerequisites.

No hosted state is activated by this document.

## Current verified read-only state

Avasam Seller API evidence currently supports and PR #608 implements only:

- `catalog`
- `stock`
- `price`

for the controlled GB pilot SKU `S0671779793`.

Real provider evidence was captured in diagnostic PR #615. Code quality was validated in #617. PR #608 remains DRAFT / NOT MERGED.

## Hosted Supplier Commerce state — fresh read-only check

Hosted project: `fwdfpmfvgygvqciecesx`.

Fresh counts on 2026-08-29:

- Supplier Commerce controls: 11 total / 0 enabled
- supplier foundation suppliers: 0
- supplier offers: 0
- Avasam adapter registrations: 0
- Avasam provider capability rows: 0
- Avasam pilot programs: 0
- pilot offers: 0
- pilot cohort members: 0
- passed simulator runs: 0

No hosted writes were made.

## Readiness object correction

`public.server_supplier_pilot_readiness_v1` is a **function/RPC taking `p_pilot_id uuid`**, not a view.

`public.server_supplier_pilot_activation_readiness_v1` is also a function/RPC.

The prior description of the readiness object as a view was documentation wording drift, not a missing hosted database object.

## Hosted commercial pilot contract — KEEP

The hosted readiness function intentionally requires a full commercial supplier adapter with all of:

- catalog
- stock
- price
- shipping
- order_submission
- acknowledgement
- tracking
- cancellation
- returns
- reimbursement

It also requires supplier foundation/governance, approved pilot offers, canonical-product linkage and stock/price commercial readiness.

Activation readiness additionally requires:

- a passed Phase N simulator run referenced by the pilot;
- an explicit buyer cohort;
- the global `pilot` control enabled;
- every other global Supplier Commerce operation remaining disabled.

**Verdict: KEEP.**

Do not weaken this function to make the current read-only provider verification fit a commercial-pilot contract.

## Stage separation

The current Avasam work is a **provider verification / read-only integration stage**, not a hosted `supplier_pilot_programs` commercial pilot.

Therefore:

- do not create a fake pilot row merely to store API evidence;
- do not register a full-capability adapter when only three read capabilities are verified;
- do not mark unsupported capabilities as verified;
- do not enable the pilot master control.

## Official Seller API capability audit

### catalog — VERIFIED

Documented endpoint:

`POST /apiseeker/Products/GetSellerProductList`

Live verified for sourced SKU `S0671779793` with numeric Price.

Code state: implemented read-only.

Verdict: **VERIFIED / KEEP**.

### stock — VERIFIED

Documented endpoint:

`POST /apiseeker/Products/SellerStockList`

Live verified for sourced SKU `S0671779793` with integer Stock.

Code state: implemented read-only.

Verdict: **VERIFIED / KEEP**.

### price — VERIFIED

Price is supplied by the documented Seller Product List and was live verified as numeric for the pilot SKU.

Code state: implemented as GBP minor-unit snapshot.

Verdict: **VERIFIED / KEEP**.

### shipping — NOT VERIFIED AS A QUOTE CAPABILITY

The Seller API documentation contains shipping service fields in order-creation payloads and shipping data in processed-order responses.

No standalone read-only shipping-quote endpoint is documented in the supplied Seller API documentation.

Supplier `GB010107` also has unresolved supplier-specific shipping terms and remote-area restrictions.

Verdict: **BLOCKED / DO NOT ADVERTISE**.

Required before implementation:

- provider-confirmed shipping service/quote contract suitable before order submission;
- remote/restricted postcode handling;
- reconciliation of dispatch/delivery SLA wording.

### order_submission — DOCUMENTED BUT NOT ENABLED

Documented endpoints include:

- `POST /apiseeker/Order/CreateSellerOrder`
- `POST /apiseeker/OrdersCreation/AddNewOrder`

Both require customer/shipping information and therefore cross the current read-only / no-PII boundary.

Current Avasam Orders permission remains OFF.

The documented success response contains only:

- `ErrorCode`
- `Message`
- `id`, documented as always `0`

It does not provide a stable supplier order reference suitable by itself for Loadify acknowledgement/recovery semantics.

Verdict: **DOCUMENTED BUT BLOCKED / DO NOT IMPLEMENT YET**.

### acknowledgement — INSUFFICIENT CONTRACT

The order-create response can state `Order created successfully`, but returns no stable external order reference (`id` is documented as always `0`).

`GetProcessOrderList` can return processed order records including seller references and statuses, but the documented request does not expose a direct lookup by the Loadify idempotency/reference key.

This is insufficient to claim safe lost-response recovery or idempotent acknowledgement semantics.

Verdict: **BLOCKED / PROVIDER CLARIFICATION REQUIRED**.

Required evidence:

- stable external order identifier after submission, or
- deterministic lookup by seller reference/idempotency key, including lost-response behaviour and duplicate-submit rules.

### tracking — READ DATA EXISTS, CAPABILITY NOT YET SAFE

`GetProcessOrderList` returns order shipping data including `TrackingNumber`, status, dispatch timestamps and history.

However the same response includes substantial customer PII (name, address, email, phone) and payment/order information.

Current PII permission remains OFF and Orders permission remains OFF.

There is no dedicated tracking-only endpoint documented in the supplied Seller API document.

Verdict: **BLOCKED / DO NOT ADVERTISE**.

Required before implementation:

- least-privilege permission decision;
- server-side minimisation proving unnecessary PII is neither retained nor exposed;
- provider/account validation that the endpoint is accessible under the intended permission set.

### cancellation — STATUS OBSERVABLE, ACTION ENDPOINT NOT DOCUMENTED

Processed-order statuses include cancellation states such as `CANCELLED_REQUEST`, `CANCELLED`, and `CANCEL_PARTIAL_ORDER`.

Supplier `GB010107` terms explicitly state that standard cancellation is disabled for this supplier and cancellation must be requested through Avasam support, typically shortly after payment and not guaranteed.

No Seller API cancellation action endpoint is documented in the supplied Seller API documentation.

Verdict: **UNSUPPORTED FOR AUTOMATED API ACTION / KEEP DISABLED**.

### returns — STATUS OBSERVABLE, ACTION ENDPOINT NOT DOCUMENTED

`GetProcessOrderList` exposes return-related states/fields including:

- `RETURN_REQUEST`
- `RETURN`
- `IsReturnRequestDraft`
- `IsReturnRequest`
- `ReturnStatus`
- return quantities/reasons
- return order references in OrderTicket data

No dedicated Seller API endpoint for creating/requesting a return is documented in the supplied Seller API documentation.

Supplier `GB010107` does not accept non-faulty returns, increasing the need for a supplier-specific commercial/legal workflow rather than a guessed API action.

Verdict: **BLOCKED / KEEP DISABLED**.

### reimbursement — STATUS/REFUND DATA OBSERVABLE, ACTION CONTRACT NOT DOCUMENTED

Processed-order status values include `REPAYMENT`, and response metadata/examples can contain refund information such as cancellation reason and shipping refund.

No dedicated reimbursement/refund request API endpoint is documented in the supplied Seller API documentation.

Verdict: **BLOCKED / KEEP DISABLED**.

## GetProcessOrderList privacy boundary

Documented endpoint:

`POST /apiseeker/OrdersView/SeekerGetOrdersListWithFilter`

The response can contain:

- order status and references;
- tracking number;
- return state;
- shipment information;
- history;
- customer name;
- postal and billing address;
- email;
- phone number;
- payment fields.

This endpoint must not be treated as a harmless tracking/status endpoint. It crosses the current PII/Orders boundary.

## Commercial capability matrix

| Capability | Current verdict | Adapter advertised? |
|---|---|---|
| catalog | verified live | YES |
| stock | verified live | YES |
| price | verified live | YES |
| shipping | no quote contract | NO |
| order_submission | documented, permission/PII/recovery blocked | NO |
| acknowledgement | stable recovery contract missing | NO |
| tracking | data exists but PII/Orders boundary unresolved | NO |
| cancellation | no action endpoint; supplier support flow | NO |
| returns | no action endpoint documented | NO |
| reimbursement | no action endpoint documented | NO |

## Next provider questions / evidence required

Before a commercial Avasam pilot can be built safely, obtain authoritative Avasam confirmation for:

1. supported shipping service discovery / pre-order quote API, if any;
2. which order creation endpoint is canonical for Seller API integrations;
3. stable external order reference returned/obtainable after submit;
4. deterministic order lookup by seller reference/idempotency key;
5. duplicate submission and timeout/lost-response semantics;
6. a least-privilege order-status/tracking mechanism and required API permission(s);
7. cancellation API availability for suppliers that permit cancellation;
8. return-request API availability and supplier-specific restrictions;
9. refund/reimbursement API availability and settlement semantics;
10. rate-limit/retry expectations for these transactional calls.

Until those are answered, the hosted commercial pilot correctly remains **NOT READY**.

## Safety state

- Orders permission: OFF
- PII view: OFF
- Invoice: OFF
- Our suppliers: OFF
- Listing Manager: OFF
- Payment Settings: OFF
- Supplier Commerce controls: 0/11 enabled
- hosted Avasam adapter registrations: 0
- hosted Avasam provider capability records: 0
- hosted Avasam pilot programs: 0
- no order API calls made
- no hosted writes made
