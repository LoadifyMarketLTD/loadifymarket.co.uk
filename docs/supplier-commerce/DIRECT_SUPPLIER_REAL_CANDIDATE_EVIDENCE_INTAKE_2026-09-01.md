# Direct Supplier Real Candidate Evidence Intake — 2026-09-01

Status: **PREPARATION ONLY — NO REAL SUPPLIER ONBOARDED — NO COMMERCIAL APPROVAL — HOSTED ACTIVATION OFF**

## Purpose

Turn the existing Direct Supplier technical scaffold into a practical evidence checklist for the **first authentic supplier candidate** without fabricating identity, qualification, capability or readiness evidence.

This document does not authorize a Supplier Foundation write by itself. It defines what must be collected and independently reviewed before each existing governed transition is used.

## Existing canonical path

The repository already provides the required provider-neutral lifecycle:

1. validate a strict `DirectSupplierOnboardingManifestV1`;
2. create/update only a Supplier Foundation **candidate** identity through the existing `upsert_supplier` action;
3. keep registration/VAT and requested capabilities as evidence/intent rather than automatically promoting them;
4. collect canonical qualification evidence;
5. activate an explicit supplier SLA;
6. review and approve territory compliance;
7. register/verify only independently proven adapter capabilities;
8. move lifecycle `candidate -> verification -> approved` only when all canonical prerequisites are satisfied;
9. only after Foundation readiness, proceed to later catalog/pilot gates.

No step below implies marketplace listing or order execution.

## A. Authentic onboarding manifest — required before candidate creation

Collect from the real supplier and independently review:

- stable `supplierKey` — lowercase, non-secret internal/provider identifier;
- legal business name;
- registration country (2-letter country code);
- company/business registration number where applicable;
- VAT number where applicable;
- feed transport: one of `json_api`, `json_feed`, `csv`, `xml`, `sftp`;
- declared warehouses with stable external warehouse reference + country;
- supported sales/delivery territories;
- requested capabilities from the canonical capability allowlist only.

Mandatory fail-closed values in the manifest:

- `commercialApproval = false`
- `hostedActivation = "off"`

Do **not** put any of the following into the onboarding manifest:

- API keys;
- passwords;
- signing secrets;
- bank details;
- customer PII;
- arbitrary credential/config fields.

## B. Identity evidence pack

Before treating identity as verified, retain authoritative evidence references for the real legal entity.

Minimum review targets:

- legal name matches the onboarding manifest;
- registration country matches;
- registration number is authentic where applicable;
- VAT number is authentic where applicable;
- supplier contact/domain relationship is credible;
- warehouse declarations are attributable to the supplier or an identified fulfilment partner.

Recommended evidence sources, depending on supplier jurisdiction and structure:

- official company/business registry record;
- official VAT validation evidence where available;
- supplier-issued legal/commercial document;
- signed contract or onboarding agreement;
- warehouse/3PL evidence where fulfilment is outsourced.

Do not record a source as `verified` merely because the supplier typed the value into a form.

## C. Canonical qualification evidence required by Supplier Foundation

Supplier Foundation currently requires all of the following evidence types to be `verified` and unexpired before readiness can pass:

1. `identity`
2. `business_identity`
3. `warehouse_origin`
4. `uk_shipping`
5. `api_feed_capability`
6. `stock_reliability`
7. `price_reliability`
8. `tracking`
9. `returns`
10. `documentation`
11. `compliance`
12. `content_rights`

Each verified record must have an authoritative `sourceRef`; evidence summaries/hashes/expiry should be recorded where appropriate through the existing `set_qualification` action.

### Evidence interpretation

#### `identity`
Proves the supplier identity being onboarded is the entity/party actually supplying the feed and goods.

#### `business_identity`
Proves legal/business registration identity independently of the integration manifest.

#### `warehouse_origin`
Proves declared fulfilment warehouse/origin facts and prevents an unverified origin from silently entering landed-cost, delivery or compliance logic.

#### `uk_shipping`
Proves the supplier can fulfil the intended UK territory under known shipping rules, including applicable service limitations.

#### `api_feed_capability`
Proves the actual selected transport/feed contract works for the real supplier. A sample schema or documentation alone is not runtime proof when authentication, signing, transport or response behaviour matters.

#### `stock_reliability`
Requires evidence that supplier stock can be obtained with known semantics and freshness appropriate to the planned flow.

#### `price_reliability`
Requires evidence that supplier price/cost data can be obtained with known currency/tax semantics and acceptable freshness.

#### `tracking`
Requires a known tracking/status contract or clearly governed manual alternative. Do not infer tracking capability from the existence of an order status string.

#### `returns`
Requires a documented return/RMA process and operational responsibility boundaries.

#### `documentation`
Requires sufficient provider/supplier documentation and operational contact/escalation information to support the integration safely.

#### `compliance`
Requires evidence appropriate to the supplied product categories and the intended territory. It is not satisfied merely by company registration.

#### `content_rights`
Requires evidence that Loadify is permitted to use/distribute the supplied listing content/assets as intended. Do not infer content rights from technical access to a feed.

## D. SLA evidence and decision

A Supplier Foundation candidate cannot become ready without an **active approved SLA**.

The existing SLA model can explicitly govern:

- acknowledgement time;
- dispatch time;
- stock freshness;
- price freshness;
- tracking deadline;
- return window;
- refund response time;
- reimbursement deadline;
- defect tolerance;
- stock accuracy target;
- cancellation threshold;
- escalation terms;
- suspension threshold;
- kill-switch threshold;
- commercial terms reference.

Do not invent values merely to satisfy the schema. Values must come from actual supplier commitments, observed evidence, negotiated terms or an explicit owner/risk decision.

The governed write path is the existing `activate_sla` action.

## E. Compliance profile

For the intended territory (initially expected to be `GB` unless explicitly approved otherwise), record a real compliance review through the existing `set_compliance` action.

Foundation readiness requires:

- compliance record exists for the territory;
- `status = approved`;
- `risk_class` is not `red`;
- approval evidence/source references exist;
- review is not expired.

A red-risk supplier cannot be converted into an approved compliance profile by wording alone; the canonical schema intentionally forces red risk into prohibited/manual-review/stale states.

## F. Adapter and capability evidence

Requested capabilities in the onboarding manifest are **intent only**.

Do not convert them into runtime capability authority until the exact real-provider contract has been independently verified.

The existing Supplier Foundation `register_adapter` action is the governed registration surface. An active adapter requires verification identity and a non-empty configuration reference.

Capability promotion must be capability-by-capability. In particular:

- catalogue proof does not imply stock proof;
- stock proof does not imply price proof;
- read proof does not imply write proof;
- order write proof does not imply customer-PII authority;
- order creation does not imply acknowledgement/reconciliation;
- order creation does not imply cancellation/returns/reimbursement;
- generic write permission does not imply financial mutation authority.

For `order_submission`, evidence must separately establish at minimum the safe submission/reconciliation contract, stable provider identity for the order, duplicate prevention/idempotency behaviour, and lost-response recovery before autonomous execution can be considered.

## G. Lifecycle transition sequence

The existing lifecycle supports the controlled path:

`candidate -> verification -> approved`

Approval is blocked unless canonical qualification evidence, active SLA and approved compliance are present.

Do not skip directly from candidate identity creation to commercial readiness.

If identity materially changes after later approval/restriction/suspension/ban, the existing Foundation guard requires the verification lifecycle rather than silent overwrite.

## H. First real supplier evidence packet — practical collection form

For the first authentic Direct Supplier candidate, assemble one reviewed packet containing:

### Supplier identity
- proposed stable `supplierKey`:
- legal name:
- registration country:
- registration number:
- VAT number:
- official registry evidence reference:
- VAT evidence reference:
- primary supplier contact reference:

### Feed/technical
- feed transport:
- documentation/source reference:
- authentication/signing method description **without secret values**:
- controlled test environment available? yes/no:
- product/variant identifier semantics:
- stock field + freshness semantics:
- price/currency/tax semantics:
- change/update mechanism:
- rate limits/retry rules if applicable:

### Warehousing and shipping
- warehouse references + countries:
- UK shipping supported? yes/no:
- service/rate source of truth:
- remote/restricted postcode rules:
- dispatch commitment:
- delivery expectation:

### Order lifecycle — collect even if currently not requested
- canonical create/order acceptance method:
- stable supplier order identifier:
- duplicate/idempotency contract:
- lost-response reconciliation method:
- acknowledgement/status method:
- tracking method:
- cancellation method:
- returns/RMA method:
- refund/reimbursement/finality method:

### Commercial / SLA
- commercial terms reference:
- acknowledgement commitment:
- dispatch commitment:
- stock freshness commitment:
- price freshness commitment:
- tracking deadline:
- return window:
- refund/reimbursement timing:
- escalation route:
- suspension/kill-switch terms:

### Compliance/content rights
- compliance evidence references:
- product-category restrictions:
- product safety/regulatory evidence references where applicable:
- content/image usage rights evidence:

### Decision state
- manifest reviewed by active admin: NO
- Supplier Foundation candidate created: NO
- 12 required qualification evidence records verified: NO
- SLA active: NO
- compliance approved: NO
- adapter registered/verified: NO
- lifecycle approved: NO
- hosted activation: OFF
- marketplace listing: OFF
- supplier order execution: OFF

## I. What may happen before full approval

Once an authentic manifest has been reviewed, an active admin may deliberately create the **candidate identity** through the existing Direct Supplier candidate onboarding route.

That action still must leave:

- registration/VAT as pending evidence where supplied;
- requested capabilities as intent only;
- lifecycle not approved;
- qualification not auto-verified;
- adapter not auto-activated;
- commercial activation false;
- marketplace listing false.

## J. Hard stop

Do not create a real Supplier Foundation record until there is an authentic supplier to bind it to.

Do not use test fixture `uk-maker-001`, placeholders, invented company details, synthetic warehouse references or copied third-party data as if they represented an approved Loadify supplier.

Until authentic external evidence exists, Direct Supplier remains `scaffolded_unverified`, verified capabilities remain empty and hosted activation remains OFF.
