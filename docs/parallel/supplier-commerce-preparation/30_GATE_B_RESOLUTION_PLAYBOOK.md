# GATE B RESOLUTION PLAYBOOK

Status: PREPARATION ONLY / NO SCHEMA AUTHORIZATION

## Purpose

Turn Gate B from a vague discussion into a finite business-contract decision process that can safely authorize Supplier Commerce schema and runtime design.

Gate B exists because technical architecture cannot decide legal/commercial responsibility by itself.

## Output required from Gate B

Gate B must produce one versioned, signed-off business contract defining at least:

- who is the seller of record to the buyer for Supplier-Fulfilled orders;
- who contracts with the supplier;
- who owns customer-facing pricing;
- who receives customer payment;
- who owes supplier payment and when;
- who bears refund risk;
- who bears chargeback/dispute risk;
- who is responsible for VAT/tax/customs treatment by transaction class;
- who handles returns and who funds them;
- who owns customer support responsibility;
- how supplier failure is handled after payment;
- what commercial facts are immutable at checkout;
- what can change during fulfilment;
- what evidence must be retained.

## Decision method

For every question, record:

1. decision;
2. rationale;
3. legal/commercial owner;
4. operational consequence;
5. financial consequence;
6. data consequence;
7. customer-facing consequence;
8. failure/recovery consequence;
9. source/evidence relied on;
10. whether external legal/tax review is required.

Avoid answers such as `we will decide later` for anything that changes schema ownership, money flow or customer rights.

## Decision group A — Marketplace identity

Resolve whether Supplier-Fulfilled product sales are presented to the buyer as:

- Loadify sale;
- third-party supplier sale mediated by Loadify;
- another explicitly defined model.

Do not infer the answer from current seller-marketplace architecture.

Required consequences to settle:

- terms shown to buyer;
- invoice issuer;
- refund obligor;
- complaint handling;
- tax documents;
- supplier identity visibility;
- platform liability allocation.

## Decision group B — Supplier relationship

Resolve:

- supplier contracting party;
- supplier onboarding authority;
- required supplier certifications/documents;
- commercial terms acceptance;
- service-level obligations;
- payment terms;
- cancellation rules;
- return/recovery obligations;
- right to suspend/kill switch;
- audit rights;
- provenance/content rights.

## Decision group C — Money flow

Define the canonical money path:

BUYER PAYMENT
→ platform/payment processor
→ platform commercial ledger
→ supplier payable/accrual
→ supplier settlement
→ reconciliation.

Answer explicitly:

- gross customer amount;
- VAT/tax component;
- shipping charged to customer;
- supplier merchandise cost;
- supplier shipping/fulfilment cost;
- platform margin/commission;
- processor fees;
- refunds;
- chargebacks;
- supplier credits/recoveries;
- FX/customs/duty where relevant.

Seller marketplace payout semantics must not be reused for supplier payables unless Gate B explicitly proves they are the same contract.

## Decision group D — Commercial price authority

Resolve:

- who sets buyer price;
- whether supplier price changes can automatically affect buyer price;
- minimum margin policy;
- maximum stale-price age;
- what happens if supplier price changes between browse and checkout;
- whether post-payment supplier price increase is absorbed, cancelled or escalated;
- who can authorize below-margin exceptions.

Canonical safety principle:

The buyer's paid commercial terms cannot be retroactively rewritten by supplier fulfilment updates.

## Decision group E — Stock and sellability

Resolve:

- what supplier stock evidence is acceptable;
- freshness thresholds;
- safety buffers;
- reservation semantics;
- oversell policy;
- stale/unknown stock behavior;
- manual override authority;
- whether backorders/preorders are permitted;
- cancellation/refund handling when supplier allocation fails.

Supplier raw stock is not automatically Loadify sellable stock.

## Decision group F — Fulfilment

The controlling product direction currently assumes no Loadify-operated physical warehouse is required.

Gate B must still resolve:

- supplier direct-to-buyer responsibility;
- allowed fulfilment providers;
- shipment initiation authority;
- tracking evidence;
- delivery proof expectations;
- lost/damaged parcel responsibility;
- reship/replacement rules;
- carrier claims ownership;
- customer communication obligations.

Do not create Loadify warehouse/pick-pack lifecycle unless separately authorized by future business intent.

## Decision group G — Returns and refunds

Resolve separately:

CUSTOMER REFUND
and
SUPPLIER RECOVERY.

They are not the same event.

Define:

- return eligibility;
- return destination;
- who supplies label/instructions;
- who bears return shipping;
- when buyer refund is due;
- whether refund can precede supplier recovery;
- damaged/not-as-described evidence;
- partial refund policy;
- supplier dispute/escalation;
- unrecovered loss treatment.

## Decision group H — Tax/VAT/customs

Do not encode tax rules from memory.

For each supported transaction route, record:

- buyer jurisdiction;
- supplier jurisdiction;
- goods origin;
- goods destination;
- business/consumer status;
- VAT registration assumptions;
- importer of record where relevant;
- customs/duty responsibility;
- evidence required;
- rule version/source date.

Provider-specific or jurisdiction-specific rules require current authoritative-source verification at implementation time.

## Decision group I — Customer identity and privacy

Resolve minimum necessary customer data shared with:

- supplier;
- fulfilment provider;
- carrier;
- customs/tax intermediaries.

Define:

- lawful/business purpose;
- retention duration;
- deletion/anonymization boundaries;
- incident handling;
- subcontractor/processors expectations;
- whether supplier may use buyer data outside fulfilment.

Default: share only data required to execute the authorized fulfilment purpose.

## Decision group J — Product/content rights

Resolve:

- who owns/has permission for titles, descriptions, images, trademarks and specifications;
- whether external marketplace/catalog data may be imported;
- whether AI may rewrite copy;
- what facts AI may not invent;
- takedown process;
- provenance evidence retention;
- seller/supplier warranty regarding rights.

External visibility does not imply copying rights.

## Decision group K — Supplier failure after payment

Define deterministic policy for:

- supplier rejects order;
- supplier does not acknowledge;
- supplier out of stock;
- supplier price changed;
- supplier ships partial quantity;
- supplier ships wrong item;
- tracking absent/stale;
- delivery lost;
- supplier disappears;
- supplier API outage.

For every failure define buyer state, supplier state, financial state, operational owner, retry policy and timeout/escalation.

## Decision group L — Operator powers

The controlling direction allows Loadify operator-driven sourcing/import.

Gate B must resolve which operator actions are allowed and audited, including:

- create import candidate;
- link source/supplier;
- approve canonical match;
- approve compliance/rights evidence;
- approve landed-cost/margin result;
- publish/unpublish;
- suspend supplier offer;
- trigger kill switch;
- issue customer remedy;
- authorize exceptional commercial loss.

No operator shortcut should bypass canonical evidence and audit requirements.

## Decision group M — Audit and evidence

Define retention and immutability expectations for:

- checkout commercial snapshot;
- supplier offer snapshot;
- supplier acknowledgement;
- supplier cost basis;
- stock/price observation;
- tax rule version;
- payment evidence;
- fulfilment events;
- tracking/POD;
- return/refund;
- supplier recovery;
- admin/operator actions;
- incident/replay events.

## Gate B PASS standard

Gate B is PASS only when:

- all schema-driving questions are resolved;
- conflicting decisions are reconciled;
- unresolved legal/tax questions are explicitly held rather than guessed;
- customer-facing and supplier-facing obligations are coherent;
- one canonical financial truth can be derived;
- no Loadify physical warehouse is accidentally assumed;
- source/provider roles remain separated;
- decisions are versioned and auditable;
- implementation can begin without inventing business rules.

If a decision remains open but does not affect the first vertical slice, it may be deferred only if the slice is technically prevented from entering that unresolved state.
