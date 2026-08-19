# SELLABILITY, STOCK AND PRICE CONTRACT

Status: PREPARATION ONLY. Defines responsibility-level behavior, not final schema/table names.

## 1. Core invariants

SUPPLIER RAW STOCK ≠ LOADIFY SELLABLE STOCK.

SUPPLIER PRICE ≠ BUYER PRICE.

A product can exist in the catalog while being not sellable.

A supplier offer can exist while being not eligible for checkout.

Unknown, stale or contradictory commercial state must not silently become buyer-facing availability.

## 2. Sellability inputs

Buyer-facing sellability may depend on:

- canonical product approved/publishable;
- supplier qualified and active;
- supplier offer active;
- territory eligibility;
- compliance/provenance/rights state;
- stock evidence/freshness;
- price evidence/freshness;
- margin floor;
- delivery promise availability;
- reservation state;
- supplier incident/kill switch;
- platform feature flag;
- policy/risk decision.

Sellability is a platform decision derived from canonical evidence; it is not equivalent to one supplier field.

## 3. Stock evidence

Supplier/fulfilment stock observations should preserve:

- source/provider;
- supplier offer reference;
- observed quantity or availability state;
- observation timestamp;
- source timestamp if supplied;
- confidence/quality where applicable;
- sync method;
- error/stale state;
- reservation implications.

Raw source value remains distinguishable from computed sellable stock.

## 4. Sellable stock

Preparation responsibility model:

SELLABLE STOCK
= trusted fresh supplier availability
- safety buffer
- active reservations
- other contract-defined exclusions.

Exact formula/policy is not fixed here.

Important:
- never allow negative sellable stock;
- stale source cannot be treated as fresh by default;
- unknown stock and zero stock are different states;
- reservation behavior must be idempotent/concurrency-safe;
- multiple supplier offers must not be naively summed unless the orchestration contract explicitly permits multi-offer fulfilment.

## 5. Freshness

Each provider/offer may have a freshness policy based on:

- polling frequency;
- webhook/event support;
- provider SLA;
- stock volatility;
- item risk/value;
- checkout recheck capability.

States may conceptually include:

FRESH
STALE
UNKNOWN
ERROR

Final names are not mandated.

Sellability behavior for each state is policy-driven and must be deterministic.

## 6. Checkout recheck

Before buyer payment/supplier submission, the platform may require a fresh stock recheck according to the supplier capability contract.

Failure paths include:

- product now out of stock;
- quantity reduced;
- supplier unavailable;
- provider timeout;
- ambiguous provider response;
- source state stale.

The system must not guess success.

## 7. Reservation

Supplier Commerce reservation is distinct from today's marketplace listing reservation.

A future reservation contract must define:

- what is reserved;
- where the reservation is authoritative;
- TTL;
- idempotency key;
- concurrency behavior;
- expiry/release;
- payment linkage;
- supplier/provider reservation if supported;
- compensation after payment failure/cancel;
- reconciliation after lost responses.

Do not reuse a legacy reservation mechanism merely because a field named `reservedUntil` exists.

## 8. Supplier price evidence

Supplier offer price observations should preserve:

- amount;
- currency;
- source/provider;
- observed timestamp;
- source timestamp if available;
- validity period where supplied;
- minimum order/quantity constraints if relevant;
- variant/SKU context;
- shipping-cost separation;
- tax inclusion/exclusion context;
- error/stale state.

## 9. Buyer price

Buyer price is a Loadify commercial decision based on Gate B and pricing policy.

It may depend on:

- supplier cost;
- supplier shipping;
- tax/VAT/customs treatment;
- FX;
- processor fees;
- platform fee/commission/margin model;
- risk allowance;
- promotions;
- required margin floor;
- customer shipping charge.

The exact formula must be versioned and auditable.

## 10. Price freshness and movement

The system must distinguish:

- current supplier cost;
- prior supplier cost;
- buyer price already displayed/quoted;
- buyer price already paid;
- supplier price at order submission;
- explicit adjustment/recovery events.

Paid customer commercial history must not be rewritten because supplier cost later changed.

## 11. Margin guard

Before accepting/sending a supplier order, a policy must prevent silent loss-making execution outside explicit tolerance/override.

Possible outcomes:

ALLOW
REPRICE BEFORE PAYMENT
REVIEW
HOLD
BLOCK

Final policy is Gate B/business-rule dependent.

After payment, a supplier price increase creates an exception/recovery problem; it must not silently mutate the customer charge.

## 12. Multi-offer selection

For ONE CANONICAL PRODUCT → MULTIPLE SUPPLIER OFFERS, offer selection may consider:

- cost;
- stock;
- freshness;
- SLA;
- territory;
- delivery promise;
- supplier risk;
- compliance;
- return/recovery capability;
- margin;
- incident state.

Cheapest does not automatically mean selected.

Selection decision should be explainable and preserve the chosen-offer snapshot/evidence relevant to the order.

## 13. Fallback supplier

Fallback may be allowed only if the business contract defines it.

If used, fallback must preserve:

- original selected offer;
- reason for fallback;
- replacement offer;
- price/cost delta;
- delivery delta;
- customer-impact decision;
- supplier submission idempotency;
- financial adjustment/recovery.

Never submit simultaneously to multiple suppliers unless explicitly designed to do so.

## 14. Customer availability

Buyer UI should derive availability from canonical sellability, not expose raw supplier internals.

Customer-facing state may include policy-approved representations such as:

- in stock;
- low availability;
- unavailable;
- delivery estimate;

Do not display false precision from unreliable supplier data.

## 15. Stock/price sync failures

Every failure should record enough context for:

- supplier/offer;
- operation;
- provider response/error class;
- last known good state;
- freshness age;
- customer/order exposure;
- retry/recovery decision;
- incident escalation if threshold exceeded.

## 16. Kill switch behavior

Supplier/offer kill switch should:

- stop new sellability/submissions as configured;
- preserve existing order history;
- not erase product/source evidence;
- expose affected in-flight orders for intervention;
- be auditable/reversible under controlled policy.

## 17. E2E acceptance

Future E2E must prove at minimum:

1. stale supplier stock cannot silently remain sellable beyond policy;
2. two concurrent buyers cannot oversell a constrained offer under the chosen reservation model;
3. supplier price increase before payment causes deterministic reprice/block behavior;
4. supplier price increase after payment does not mutate paid customer price;
5. multiple offers remain distinct while sharing one canonical product;
6. fallback supplier cannot create duplicate supplier orders;
7. provider timeout does not become success;
8. margin-floor breach cannot silently submit;
9. kill switch stops new commerce while preserving in-flight/history;
10. stock/price recovery after outage is observable and reconciled.

## 18. Implementation gate

Final freshness windows, buffers, reservation semantics, pricing formulas and tolerances are business/runtime decisions.

Do not implement them before:

CHECKPOINT A PASS
→ FOUNDATION BASELINE FREEZE
→ GATE B PASS
→ RESPONSIBILITY-TO-SCHEMA/API DESIGN.