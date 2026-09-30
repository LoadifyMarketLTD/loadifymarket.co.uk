# Loadify Market — Costway Alignment Audit

Date: 2026-09-30  
Status: CONDITIONAL / PRE-QUALIFIED  
Production activation: OFF  
Supplier Commerce controls: verified OFF in production during this audit

## Supplier evidence

Costway confirmed by email on 2026-09-30:

- cooperation/application is required before CSV access;
- CSV is updated once daily;
- only in-stock CSV goods may be sold;
- Costway brand name, logo and other brand assets may not be used on website/listings/marketing/sales channels without advance agreement;
- retail prices may not be lower than the official Costway UK retail price;
- orders are placed through promotion.com using their downloadable Excel order template;
- invoices and tracking are available through the B2B platform;
- parcel outer packaging is SKU/barcode based, contains no Costway brand information and no invoice;
- warranty follows Costway website terms;
- Costway customer service handles customer service through the address they supplied.

## Alignment matrix

| Requirement | Loadify capability | Costway evidence/configuration | Audit status |
| --- | --- | --- | --- |
| Marketplace permission | Supplier onboarding and evidence gates exist | Costway has not yet approved loadifymarket.co.uk as a marketplace channel | BLOCKED — supplier approval |
| Seller-of-record / legal model | Canonical marketplace model is evidence-gated | Costway has not explicitly accepted the Loadify seller-of-record / marketplace allocation | BLOCKED — supplier/legal evidence |
| Direct-to-customer fulfilment | Supplier-fulfilled commercial mode exists | Costway confirmed direct order fulfilment model and neutral parcel behaviour | PASS at supplier capability level |
| CSV/catalogue ingestion | Direct Supplier staging supports CSV/manual catalogue and CSV as source format; remote scheduled acquisition supports HTTPS feed/SFTP | Costway only said it will provide a daily CSV; delivery mechanism is not yet known | PARTIAL — exact transport/config pending |
| Daily refresh | Scheduled acquisition can represent 1440-minute cadence | Actual Costway feed/config not provisioned | GAP — configuration/evidence |
| Stock truth | Fail-closed stock observations and freshness controls exist | CSV contains stock/in-stock eligibility, but no live Costway observations/config exist | GAP — onboarding/config |
| Retail price floor | PR #818 adds evidence-backed supplier-wide or per-offer/SKU minimum-price enforcement at pricing approval, publication and checkout | Official Costway UK retail price is the required minimum; exact machine-readable price source/update mapping is not yet agreed | CODE GAP CLOSED IN DRAFT PR; supplier source/config pending |
| Brand/logo restriction | PR #818 adds versioned supplier brand/trademark usage policy and fail-closed publication enforcement | Costway explicitly prohibits brand name/logo/brand assets without advance agreement | CODE GAP CLOSED IN DRAFT PR; Costway policy evidence available |
| Product media rights | Asset-rights table, import approval guard and verified-media publication path are fail-closed | Costway's reply does not clearly grant title/description/image reuse rights; Q4 is ambiguous | BLOCKED — explicit rights evidence |
| Compliance/safety | Product-level compliance reviews and publication gates exist | No Costway SKU-level compliance evidence received | BLOCKED per SKU |
| Order submission | Controlled Phase O manual order route accepts verified manual_portal/manual_file bindings with admin evidence | Costway requires promotion.com + Excel template | PLATFORM PASS; supplier account/template pending |
| Order acknowledgement | Manual acknowledgement binding and acceptance evidence route exist | Promotion.com order state/reference details require account access | GAP — supplier account/evidence |
| Tracking | Tracking ingestion/recovery capability exists; manual/provider evidence paths are supported | Costway says tracking is available on promotion.com | PLATFORM PASS; binding/config pending |
| Cancellation | Cancellation capability is modeled and evidence-gated | Exact Costway cancellation timing/rules were not supplied | BLOCKED — supplier process |
| Returns / damaged goods | Returns, refund and supplier-recovery foundations exist | Warranty/customer-service contact confirmed, but exact returns/damage workflow and liability are incomplete | BLOCKED — supplier process |
| Settlement/payment | Commercial profile and settlement evidence gates exist | Payment method/terms on promotion.com were not explicitly supplied | BLOCKED — supplier commercial evidence |
| MOQ/MOV | Onboarding profile supports commercial constraints | Not confirmed by Costway response | UNCONFIRMED |
| UK geography / shipping coverage | Territory and shipping readiness gates exist | Exact UK exclusions/rates/service levels not confirmed in response | UNCONFIRMED |
| Packaging / parcel invoice | Can be stored as supplier operational evidence | Costway confirmed neutral packaging and no invoice in parcel | PASS supplier evidence |
| Publication/live | Fail-closed publication path exists | Costway is not onboarded/configured/approved | OFF / correctly blocked |

## Code remediation created during audit

Draft PR #818: **Enforce supplier retail and brand usage policies**

Branch: `fix/supplier-price-floor-enforcement-20260930`

Head at validation: `ccf706d059004b5310a95934779c56692aaa1e40`

Adds:

1. `private.supplier_offer_price_constraints`
2. supplier-wide or offer/SKU-specific minimum-price enforcement
3. pricing-approval, publication and checkout enforcement
4. `private.supplier_brand_usage_policies`
5. fail-closed brand-name/logo publication policy
6. immutable reviewed evidence for both policy classes

Validation on the branch:

- targeted policy tests: 11/11 PASS
- TypeScript: PASS
- ESLint: PASS
- migration health: PASS, 250 canonical migrations / 250 unique versions
- build security tests: 9/9 PASS
- production build: PASS
- PR mergeability at audit time: true
- branch behind main at audit time: 0

No Supplier Commerce control was enabled by this work.

## Production state verified during audit

Loadify Supabase project: `fwdfpmfvgygvqciecesx`

Observed:

- supplier foundation rows: 2
- onboarding profiles: 2
- integration profiles: 0
- marketplace projections: 0
- pricing snapshots: 0
- stock observations: 0
- price observations: 0
- existing foundation suppliers: Inkthreadable and Tradeprint, both in verification lifecycle
- Costway is not onboarded in Supplier Foundation
- all global Supplier Commerce controls observed are disabled, including pilot, publish, checkout, stock_sync, price_sync, supplier_order, tracking_ingest and return_recovery.

## Decision

Do **not** mark Costway APPROVED_FOR_PILOT, STAGING, PUBLICATION_ELIGIBLE or LIVE yet.

Current supplier status remains **CONDITIONAL / PRE-QUALIFIED**.

Before any Costway product can move toward publication, obtain and preserve evidence for:

1. explicit approval of loadifymarket.co.uk as the sales channel;
2. marketplace/seller-of-record compatibility;
3. explicit product title/description/image reuse permission;
4. CSV delivery method and field schema;
5. official retail-price source/mapping and update mechanism;
6. promotion.com account/payment terms and order-template details;
7. exact cancellation, return, faulty/damaged-goods and reimbursement process;
8. shipping geography/rates/service levels;
9. SKU-level compliance evidence.

Until those gates are complete, Costway publication and checkout remain fail-closed.
