# GATE B — BUSINESS DECISION PACK

Purpose: prepare the exact decisions Gate B must close before Supplier Commerce schema or migrations are allowed.

This file DOES NOT answer legal/tax/provider-specific questions by assumption. It defines the decisions that must be resolved from the business contract and current official sources.

This file is interpreted together with `33_PRODUCT_DIRECTION_RECONCILIATION_2026-08-20.md` and the current canonical contract on `main`.

## A. Commercial models

For each model define the canonical answer:

1. Marketplace Seller
2. Loadify Supplier-Fulfilled
3. Loadify Direct / Loadify-operated commercial offer, only if this label receives a precise legal/commercial meaning

For each model resolve:

- who is legal seller to the buyer;
- who is merchant of record;
- who receives payment;
- who issues the customer invoice;
- who owns the customer relationship;
- who owns fulfilment responsibility;
- who holds physical stock;
- who bears supplier failure risk;
- who bears return/refund responsibility;
- who bears chargeback responsibility;
- who bears product-liability/compliance responsibility;
- who owns safety-incident/recall escalation;
- what Loadify revenue is (commission, margin, fee, other);
- what supplier payable means;
- what event creates/changes financial liability;
- what customer-facing seller/fulfiller/dispatch-origin/return-path disclosures are required.

Do not infer legal responsibility from UI labels.

## B. No-warehouse target

Business intent to formalise:

- Loadify does not require or operate a Loadify-owned physical warehouse as part of the target Supplier-Fulfilled model.
- Loadify does not need to pre-purchase physical stock for the target model.
- Approved supplier/fulfilment provider may retain stock.
- Supplier/fulfilment provider may ship directly to buyer.
- Loadify must still control the canonical commerce contract, buyer experience and governance according to the legal/commercial model decided here.

Gate B must define whether any future Loadify-owned stock mode is out of scope, optional, or separately modelled. Do not silently infer warehouse ownership from the name `Loadify Direct`.

## C. Operator-driven sourcing/import

Loadify authorised operators must be able to source/import products manually without waiting for Product Discovery.

Allowed source forms at business-contract level may include:

- manual product data;
- external product URL;
- approved catalog;
- approved feed;
- supplier catalog;
- supplier API;
- opportunity identified by Product Discovery.

Mandatory rule:

SOURCE
→ IDENTIFY SOURCE ROLE
→ IDENTIFY PRODUCT
→ NORMALISE
→ CANONICAL PRODUCT MATCH/CREATE CANDIDATE
→ VARIANT MAP
→ SUPPLIER OFFER
→ PROVENANCE
→ CONTENT/IP RIGHTS
→ PRODUCT SAFETY/COMPLIANCE
→ STOCK ORIGIN/SHIPPING CAPABILITY
→ TRUE LANDED COST
→ TAX/VAT/CUSTOMS
→ MARGIN
→ AI MERCHANDISING
→ REVIEW
→ PUBLISH.

Never URL → PUBLISH.
Never OWNER FOUND IT → DIRECT PRODUCT WRITE → PUBLISH.

## D. External role taxonomy

Every provider/source must be classified by capability, not brand name:

- Discovery Source
- Catalog Source
- Supplier
- Fulfilment Provider
- Carrier
- Sales / Channel Connector
- Payment/Finance Provider where relevant

A provider may have multiple roles, but each role must be factual and contract-driven.

Provider names are never core architecture types.

Gate B must also define the governance rule that every implementation target needs current official capability/API/rights/commercial-term evidence and a versioned Loadify capability record before implementation readiness.

## E. Product identity

Business contract must preserve:

ONE CANONICAL PRODUCT
→ MULTIPLE SUPPLIER OFFERS.

Resolve:

- canonical identity keys/evidence;
- variant identity;
- duplicate-confidence thresholds;
- manual review boundary;
- when two visually similar products are NOT the same canonical product;
- how supplier-specific attributes stay outside canonical product truth.

## F. Supplier offer contract

Resolve responsibility for:

- supplier SKU/reference;
- product cost;
- shipping cost;
- territories;
- stock evidence;
- price freshness;
- SLA;
- dispatch estimate;
- return terms;
- supplier risk;
- provenance/compliance evidence;
- currency;
- minimum order constraints if any;
- offer validity/version;
- origin/warehouse evidence where relevant;
- fulfilment provider relationship where separate.

## G. Customer-visible offer

Resolve how Loadify constructs the buyer-facing offer from canonical product + supplier offer(s):

- seller display;
- fulfilment disclosure where required;
- dispatch origin disclosure where required;
- delivery promise;
- stock display;
- price;
- mandatory fees;
- shipping presentation;
- VAT/tax display;
- customs/import disclosure where relevant;
- returns;
- support ownership;
- fulfilment visibility;
- whether supplier identity is hidden, visible or conditional;
- review/rating provenance presentation;
- multi-supplier fallback rules.

Customer-facing pricing must not be designed around drip-pricing or independent conflicting total calculations across surfaces.

## H. Payment and supplier-order responsibility

Formalise:

PAYMENT SUCCESS ≠ SUPPLIER ORDER SUCCESS.

Resolve:

- when supplier order is allowed;
- when funds are considered captured/available;
- stock recheck rules;
- price-change tolerance;
- acknowledgement deadline;
- supplier refusal/timeout response;
- duplicate submission prevention;
- lost-response recovery;
- buyer communication;
- cancellation/refund trigger;
- supplier fallback eligibility after customer commitment;
- whether any fallback requires customer notification/consent.

Fallback must not silently alter exact product/variant, compliance, delivery promise, committed buyer price, return/support capability or origin/customs constraints.

## I. Financial truth

Formalise one canonical financial truth.

Resolve what the ledger must represent for each model:

- customer gross/net;
- VAT/tax;
- processor fees;
- Loadify revenue/commission/margin;
- supplier payable;
- supplier product cost;
- supplier shipping;
- customs/duty;
- FX;
- refunds;
- supplier recoveries;
- chargebacks;
- unrecovered loss;
- final contribution.

Commercial history after payment must not be retrospectively rewritten by fulfilment actions. Corrections must be explicit adjustments/reversals/recoveries according to the contract.

Where digital-platform reporting applies, reporting data must derive from canonical transaction/financial truth and must not create a parallel reporting ledger.

## J. Shipping economics

Gate B must define the authoritative moment and source for buyer shipping price.

Do not allow fulfilment-time supplier/seller input to silently rewrite the price the buyer already paid.

Separate at business-contract level:

- customer shipping charge;
- supplier fulfilment shipping cost;
- carrier cost;
- shipping recovery/adjustment;
- delivery method label;
- operational tracking data;
- fulfilment leg;
- consignment evidence where relevant.

These values may differ and must not be conflated.

## K. Returns / refunds / recovery

Formalise:

CUSTOMER REFUND ≠ SUPPLIER RECOVERY.

Resolve:

- who authorises return;
- return destination;
- who pays return shipping;
- customer refund timing;
- supplier reimbursement timing;
- partial refunds;
- lost-return cases;
- non-returnable products;
- unrecovered supplier loss;
- financial reconciliation completion;
- supplier non-acknowledgement/stock mismatch customer remedy;
- safety recall/withdrawal return/refund handling where applicable.

No assumption that returned stock comes to a Loadify warehouse.

## L. Tax / VAT / customs

Gate B must explicitly resolve responsibility for UK domestic, overseas-stock and multi-consignment scenarios.

The future model must be capable of considering, where applicable:

- stock location at point of sale;
- destination/jurisdiction;
- seller/business establishment;
- B2B/B2C status;
- verified VAT details where relevant;
- consignment grouping;
- intrinsic consignment value;
- applicable thresholds/rules;
- excise/restricted category;
- import VAT/customs responsibility;
- marketplace VAT liability where applicable;
- invoice evidence;
- rule version/effective date.

Do not infer a multi-item order tax result from one line item.

Preserve the relationship CUSTOMER ORDER ↔ FULFILMENT LEG ↔ CONSIGNMENT ↔ TAX/CUSTOMS EVIDENCE where relevant.

## M. Content / image / video / UGC rights

Gate B must define the commercial-use evidence standard for externally sourced content.

Public visibility is not commercial reuse permission.

Resolve at responsibility level:

- source/provenance;
- owner/licensor evidence where relevant;
- commercial-use permission;
- modification/derivative permission where relevant;
- territory/channel restrictions;
- attribution obligations;
- expiry/revocation handling;
- what happens when required rights evidence is missing.

No required rights evidence → asset not publishable.

## N. Reviews / ratings / consumer presentation

Gate B must define review/rating provenance and moderation rules.

Never convert external marketplace ratings/review counts into Loadify customer ratings/review counts.

Resolve:

- verified Loadify purchase review classification;
- permitted external/licensed review classification where applicable;
- source disclosure;
- seller-provided testimonial rules where lawful;
- fake-review prevention/moderation;
- suppression/removal governance;
- audit history.

## O. Digital-platform seller reporting / due diligence

Gate B must determine whether and how Loadify is a UK reporting platform operator for each relevant activity.

Where applicable, operational responsibility must cover:

- required seller identity collection;
- verification;
- reportable/excluded seller classification;
- reportable transaction/payment totals;
- fees/commissions/taxes;
- payout/bank-account evidence where required;
- reporting periods/filing status;
- seller copy of reported information;
- corrections/audit history.

Do not defer this to an unstructured year-end spreadsheet if the obligation applies.

## P. Product safety / recall / market surveillance

Gate B must resolve responsibility for:

- manufacturer/importer/responsible-operator evidence where applicable;
- category-specific compliance evidence;
- required markings/instructions/warnings;
- product risk classification;
- safety incidents/complaints;
- recall/withdrawal state;
- regulator requests;
- supplier/product suspension;
- affected buyer/order/variant traceability;
- customer notification where required;
- evidence retention;
- emergency kill switch.

Current law/regulation must be verified from authoritative sources before rollout. Do not treat a proposal/consultation as operative law unless enacted/in force.

## Q. External sales channels

If Loadify later publishes/synchronises products or receives orders through an external sales channel, Gate B must preserve the boundary:

LOADIFY CANONICAL CATALOG / COMMERCE
↔ SALES CHANNEL CONNECTOR.

External channels must not become the canonical Loadify product/order/payment ledger.

Actual channel implementation remains provider-capability dependent and is not authorised by Gate B preparation alone.

## R. Operator/admin authority

Resolve exactly who may:

- source/import;
- approve/reject/hold;
- publish/unpublish;
- suspend product;
- suspend supplier/provider;
- initiate recall/withdrawal;
- activate kill switch;
- override/review exceptions;
- access sensitive supplier cost/margin/compliance evidence.

All sensitive actions require server-enforced authorization and audit.

## S. Legal / provider rules to verify from current official sources

Before implementation, verify as relevant:

- Stripe / Stripe Connect rules for the chosen model;
- UK VAT treatment;
- customs/duty treatment;
- UK consumer price-transparency/unfair-commercial-practice rules;
- review/fake-review requirements;
- digital-platform reporting rules;
- product regulations and product-safety responsibilities by category;
- UK GDPR/privacy/retention;
- provider API/platform policies;
- rights/licensing for imported images/content/video/UGC.

Do not implement volatile rules from memory.

## Gate B PASS definition

Gate B is PASS only when the above decisions are sufficiently explicit to design schema/API/data ownership without inventing business rules during implementation.

PASS requires explicit answers, not assumptions, for the applicable operating modes and territories.

BUSINESS CONTRACT → SCHEMA DESIGN → MIGRATIONS.

Never the reverse.