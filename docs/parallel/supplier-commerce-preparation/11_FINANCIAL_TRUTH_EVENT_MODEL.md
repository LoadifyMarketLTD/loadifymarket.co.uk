# FINANCIAL TRUTH — EVENT AND RESPONSIBILITY MODEL

Status: PREPARATION ONLY. This is not accounting advice and does not mandate final ledger schema.

Purpose: prevent Supplier Commerce from creating competing or retrospectively mutable financial truths.

## 1. Core invariant

ONE CANONICAL FINANCIAL TRUTH.

Customer commerce, Stripe/payment evidence, supplier cost, refunds, recoveries, chargebacks and operational adjustments must reconcile to one explainable financial history.

## 2. No retrospective mutation of paid commercial truth

After payment is accepted for a customer order, fulfilment operations must not silently rewrite:
- customer item price;
- customer shipping charge;
- tax/VAT amount;
- customer total;
- captured amount.

Corrections must be represented as explicit events/adjustments/reversals/reconciliations according to Gate B.

## 3. Financial responsibility classes

The future model must be able to represent, where applicable:
- customer charge/payment;
- customer subtotal;
- customer shipping charge;
- VAT/tax;
- discount;
- processor fee;
- Loadify commission/revenue;
- Loadify margin/contribution;
- supplier product cost;
- supplier shipping/fulfilment cost;
- supplier payable;
- customs/duty;
- FX effect;
- customer refund;
- partial refund;
- supplier reimbursement/recovery;
- transfer/payout;
- transfer reversal;
- chargeback/dispute;
- unrecovered supplier loss;
- manual reviewed adjustment;
- reconciliation variance.

Not every commercial model uses every class.

## 4. Commercial-model separation

Gate B must determine financial semantics for:
- Marketplace Seller;
- Loadify Direct / Loadify-operated offer;
- Loadify Supplier-Fulfilled.

Do not assume the current seller payout mechanism equals supplier payable.

Do not assume Loadify revenue is always commission; it may be margin/fee/other according to the chosen model.

## 5. Order commercial snapshot

At the successful-payment boundary, the system must be able to explain what the buyer agreed to and paid:
- item lines and quantities;
- unit prices;
- tax treatment;
- shipping charge;
- discounts;
- total;
- currency;
- selected delivery promise/method;
- relevant pricing/rule versions where required.

Later supplier cost changes do not alter this buyer snapshot.

## 6. Supplier commercial snapshot

When a Supplier Offer is selected/submitted, preserve enough evidence to explain:
- offer/reference selected;
- supplier product cost;
- supplier shipping/fulfilment cost;
- supplier currency;
- price/freshness version;
- quantity;
- expected supplier payable;
- tolerance/risk decision where applicable.

Supplier price change after customer payment becomes an exception/decision, not a silent overwrite.

## 7. Customer payment event

Evidence should ultimately support:
- provider transaction reference;
- amount;
- currency;
- status;
- timestamp;
- idempotency identity;
- linked customer order;
- payment method/provider metadata only as needed.

Payment success does not imply supplier-order success.

## 8. Supplier payable event

The financial model must define when supplier liability/payable is created.

Possible trigger depends on Gate B and supplier contract, e.g. submission, acknowledgement, dispatch or another contractual event.

Do not invent the trigger during coding.

## 9. Supplier cost vs customer shipping

These are different facts:
- customer shipping charge: what buyer pays;
- supplier shipping/fulfilment cost: what Loadify/seller incurs to fulfil;
- carrier cost: may be yet another operational value.

One must never overwrite another by reusing the same field semantically.

## 10. Processor fee

Processor fee evidence may arrive after payment and must be reconciled without changing the original customer charge.

Provider rules/API details must be verified from current official documentation at implementation time.

## 11. Refund

Customer refund event must identify:
- linked order/payment;
- amount;
- currency;
- reason;
- provider refund reference;
- partial/full status;
- timestamp;
- operator/system source;
- reconciliation status.

A refund changes financial position via an explicit event, not by rewriting the historical payment amount.

## 12. Supplier recovery

Supplier recovery is separate from customer refund.

It may include:
- supplier refund;
- credit note/credit balance;
- replacement value;
- reimbursement;
- shipping recovery;
- rejected recovery;
- unrecovered loss.

The platform must be able to show:
CUSTOMER REFUNDED = yes/no/amount
and separately
SUPPLIER RECOVERED = yes/no/amount/status.

## 13. Chargeback/dispute

A chargeback/dispute must not be collapsed into a generic refund.

Track:
- disputed amount;
- reason/provider evidence;
- financial hold/exposure;
- seller/supplier recovery exposure;
- final outcome;
- fees/loss where applicable.

## 14. Reconciliation

Reconciliation answers whether external and internal financial evidence agree.

Possible dimensions:
- payment provider vs internal payment evidence;
- customer order snapshot vs captured amount;
- supplier payable vs supplier invoice/charge;
- transfer/payout vs internal liability;
- customer refund vs provider refund;
- supplier recovery vs expected recovery;
- chargeback vs ledger impact.

`completed order` must not automatically mean `financially reconciled`.

## 15. Append-safe history

Corrections should preserve audit history.

Conceptual operations:
- append adjustment;
- reverse prior entry;
- supersede with traceable version where appropriate;
- link reconciliation resolution.

Do not delete/rewrite financial history merely to make totals look correct.

## 16. Idempotency

Every external money-changing action must have an idempotency/replay strategy.

E2E must cover:
- duplicate webhook;
- duplicate supplier acknowledgement;
- repeated refund request;
- repeated recovery callback;
- response lost after provider success;
- retry after internal persistence failure.

No double-charge, double-refund, double-payable, double-recovery or duplicate financial event.

## 17. Currency and FX

Where supplier and customer currency differ, preserve:
- source currency;
- source amount;
- conversion basis/rate evidence where required;
- converted amount used for commercial decision;
- FX variance where relevant.

Do not destroy original currency evidence by storing only converted GBP value.

## 18. Tax/VAT/customs

Tax/customs rules are volatile and model-dependent.

At Gate B/implementation:
- verify current official UK rules;
- define who accounts for VAT/tax;
- define invoice responsibility;
- define import/customs responsibility;
- version rules/evidence where required.

Do not encode remembered legal assumptions into the ledger.

## 19. Profitability / contribution

Expected and realised contribution should be explainable from canonical financial evidence.

Conceptually:
customer economics
- supplier costs
- processor costs
- taxes/duties attributable under chosen model
- refunds/losses/recoveries
= contribution according to Gate B accounting definition.

The exact formula and recognition timing must be defined before implementation.

## 20. Admin visibility

Supplier Control Centre / Finance views should be projections of canonical finance, not spreadsheets-in-code.

Need visibility into:
- pending/unreconciled money;
- supplier payable;
- supplier recovery;
- refunds;
- transfer/reversal state;
- chargebacks;
- margin/contribution anomalies;
- reconciliation exceptions.

## 21. Current foundation seam

Current marketplace runtime already contains customer order totals, payment sessions, Stripe references, seller payouts/transfers, refunds and escrow-like state.

After Foundation Freeze, these must be re-audited before mapping Supplier Commerce finance.

Do not create a second independent `supplier commerce finance` universe beside existing order/payment truth.

## 22. PASS criteria

Financial architecture is PASS only when tests/evidence show:
- one customer payment truth;
- paid customer economics immutable to fulfilment operations;
- supplier cost separate from buyer price;
- supplier payable distinct from seller payout unless explicitly equivalent by contract;
- refunds and supplier recovery separate;
- chargebacks represented distinctly;
- idempotent external money actions;
- reconciliation can identify mismatches;
- corrections preserve history;
- dashboards derive from canonical records;
- no fake PASS from matching totals alone.
