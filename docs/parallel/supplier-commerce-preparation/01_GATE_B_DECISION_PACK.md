# GATE B — BUSINESS DECISION PACK

Purpose: prepare the exact decisions Gate B must close before Supplier Commerce schema or migrations are allowed.

This file DOES NOT answer legal/tax/provider-specific questions by assumption. It defines the decisions that must be resolved from the business contract and current official sources.

## A. Commercial models

For each model define the canonical answer:

1. Marketplace Seller
2. Loadify Direct / Loadify-operated commercial offer
3. Loadify Supplier-Fulfilled

For each model resolve:

- who is legal seller to the buyer;
- who is merchant of record;
- who issues the customer invoice;
- who owns the customer relationship;
- who owns fulfilment responsibility;
- who holds physical stock;
- who bears supplier failure risk;
- who bears return/refund responsibility;
- who bears chargeback responsibility;
- who bears product-liability/compliance responsibility;
- what Loadify revenue is (commission, margin, fee, other);
- what supplier payable means;
- what event creates/changes financial liability.

## B. No-warehouse target

Business intent to formalise:

- Loadify does not require or operate a Loadify-owned physical warehouse as part of the target Supplier-Fulfilled model.
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

SOURCE → IDENTIFY → NORMALISE → CANONICAL PRODUCT MATCH/CREATE CANDIDATE → SUPPLIER OFFER → PROVENANCE → RIGHTS → COMPLIANCE → COST/MARGIN → REVIEW → PUBLISH.

Never URL → PUBLISH.

## D. External role taxonomy

Every provider/source must be classified by capability, not brand name:

- Discovery Source
- Catalog Source
- Supplier
- Fulfilment Provider
- Carrier
- Payment/Finance Provider

A provider may have multiple roles, but the role must be factual and contract-driven.

Provider names are never core architecture types.

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
- offer validity/version.

## G. Customer-visible offer

Resolve how Loadify constructs the buyer-facing offer from canonical product + supplier offer(s):

- seller display;
- delivery promise;
- stock display;
- price;
- VAT/tax display;
- returns;
- support ownership;
- fulfilment visibility;
- whether supplier identity is hidden, visible or conditional;
- multi-supplier fallback rules.

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
- cancellation/refund trigger.

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

## J. Shipping economics

Gate B must define the authoritative moment and source for buyer shipping price.

Do not allow fulfilment-time supplier/seller input to silently rewrite the price the buyer already paid.

Separate at business-contract level:

- customer shipping charge;
- supplier fulfilment shipping cost;
- carrier cost;
- shipping recovery/adjustment;
- delivery method label;
- operational tracking data.

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
- financial reconciliation completion.

No assumption that returned stock comes to a Loadify warehouse.

## L. Tax / legal / provider rules

Before implementation, verify from current official sources:

- Stripe / Stripe Connect rules relevant to chosen model;
- UK VAT treatment;
- customs/duty treatment;
- product regulations by category;
- UK GDPR/privacy/retention;
- provider API and platform policies;
- rights/licensing for imported images/content.

Do not implement volatile rules from memory.

## Gate B PASS definition

Gate B is PASS only when the above decisions are sufficiently explicit to design schema/API/data ownership without inventing business rules during implementation.

BUSINESS CONTRACT → SCHEMA DESIGN → MIGRATIONS.

Never the reverse.