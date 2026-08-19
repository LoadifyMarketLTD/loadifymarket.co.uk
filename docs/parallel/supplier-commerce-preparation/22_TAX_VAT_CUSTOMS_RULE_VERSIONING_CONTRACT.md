# TAX, VAT AND CUSTOMS RULE VERSIONING CONTRACT

Status: PREPARATION ONLY. This document defines architecture/governance. It does not provide final tax/legal advice and does not authorise tax implementation before Gate B plus current authoritative verification.

## Purpose

Prevent tax, VAT, customs and duty logic from becoming hardcoded assumptions that silently age, while keeping customer price, supplier cost and financial history reproducible.

## Core rule

BUSINESS MODEL + JURISDICTION + PRODUCT + PARTIES + DATE/EFFECTIVE VERSION
→ VERIFIED RULE SET
→ DETERMINISTIC CALCULATION
→ SNAPSHOT / EVIDENCE
→ IMMUTABLE COMMERCIAL HISTORY.

## Separation of responsibilities

Do not conflate:
- buyer-facing VAT/tax amount;
- supplier invoice tax;
- import VAT;
- customs duty;
- marketplace/platform fee tax;
- processor fee;
- supplier cost;
- customer shipping charge;
- supplier/carrier shipping cost.

Each may have a different basis and responsible party.

## Gate B dependencies

Before schema/calculation implementation, Gate B must define by commercial model:
- legal seller to buyer;
- merchant/payment responsibility;
- invoice issuer;
- importer/exporter responsibility where relevant;
- supplier contractual relationship;
- who bears customs/duty/import tax;
- Loadify revenue nature (commission/margin/fee/other).

Tax code cannot safely answer these business-model questions itself.

## Rule versioning

Every tax/customs calculation used for a commercial event should be reproducible from:
- rule-set identifier;
- effective-from/effective-to dates;
- jurisdiction;
- currency;
- relevant registration/business status;
- product/category classification evidence;
- transaction date/time;
- source/reference version;
- calculation inputs;
- resulting amounts.

Historical orders must not be recalculated using today's rules merely because rules changed later.

## Official-source requirement

Immediately before implementation and before material rule changes, verify current authoritative sources for:
- UK VAT rules;
- marketplace/e-commerce rules relevant to the chosen model;
- imports/exports/customs/duties;
- threshold or registration rules where applicable;
- product-specific rates/classifications;
- invoicing requirements.

Do not implement volatile tax rules from memory or old project documentation.

## Money precision

Calculations must use deterministic money precision and explicit rounding policy.

Avoid floating-point reconstruction across services. Canonical implementation should later define one monetary representation policy and test penny-level outcomes.

## Reverse charge / B2B

Any reverse-charge or B2B treatment must be governed by current law and evidence, not merely a client-side checkbox. Required verification may include business/customer tax status according to the applicable rule.

## Customs/duty

Where cross-border sourcing exists, landed cost must distinguish:
- supplier item cost;
- supplier shipping;
- international freight;
- duty;
- import VAT;
- brokerage/clearance fees;
- FX;
- other approved costs.

Unknown customs exposure must not be treated as zero by default if it can materially change margin or customer obligations.

## Product classification

If customs/tax treatment depends on product classification:
- classification source/evidence must be retained;
- low-confidence classification must trigger review;
- AI may suggest but not silently assert regulated/tax classification without evidence;
- changes are versioned.

## Price construction

The buyer-visible selling price should be generated from the approved commercial model and current rule set.

Supplier cost changes do not automatically rewrite tax snapshots for already-paid customer orders.

## Refunds/adjustments

Refunds, partial refunds, cancellations and supplier recoveries must preserve linkage to the original transaction rule set while applying any legally required adjustment logic verified for the implementation date.

CUSTOMER REFUND ≠ SUPPLIER RECOVERY.

## Reconciliation

Financial reconciliation should be able to explain:
- what the customer paid;
- what tax was charged/accounted;
- what supplier cost was incurred;
- what customs/duty was incurred;
- what was refunded/recovered;
- what Loadify ultimately retained/lost.

## Failure behavior

If required tax/customs inputs are missing or rule selection is ambiguous:
- fail closed for automatic publication/checkout when material;
- route to review;
- never guess a zero rate or no-duty assumption for convenience.

## Test matrix

Future implementation tests should cover at minimum:
- domestic consumer sale;
- B2B scenario allowed by Gate B;
- tax-registered/non-registered evidence differences;
- zero/reduced/standard rate categories where applicable;
- cross-border supplier scenario;
- FX change;
- duty present/unknown;
- refund/partial refund;
- rule effective-date boundary;
- historical replay after rule update;
- penny-rounding edge cases.

## PASS criteria

Tax/VAT/customs architecture is PASS only when:
- Gate B responsibilities are resolved;
- current authoritative rules are cited/verified during implementation;
- rule sets are versioned;
- calculations are reproducible;
- historical orders preserve their original commercial/tax snapshots;
- landed cost and buyer tax are separated;
- missing/ambiguous material inputs fail closed;
- refund/reconciliation paths are tested.
