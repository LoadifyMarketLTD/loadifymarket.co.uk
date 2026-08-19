# SUPPLIER FULFILMENT ORCHESTRATION CONTRACT

Status: PREPARATION ONLY. No runtime implementation or final state-machine names are authorised here.

Purpose: define how one Loadify customer order may be fulfilled by external suppliers/fulfilment providers without creating a second customer-order truth or requiring a Loadify physical warehouse.

## 1. Core invariant

ONE CUSTOMER ORDER
-> one or more internal fulfilment responsibilities/legs.

An external supplier order reference is operational evidence, not a second buyer order.

## 2. No-warehouse target

Target Supplier-Fulfilled path:

BUYER CHECKOUT IN LOADIFY
-> PAYMENT EVIDENCE
-> INTERNAL FULFILMENT RESPONSIBILITY
-> SUPPLIER/PROVIDER SUBMISSION
-> ACKNOWLEDGEMENT
-> DIRECT DISPATCH TO BUYER
-> TRACKING NORMALISATION
-> DELIVERY/EXCEPTION
-> RETURNS/RECOVERY/RECONCILIATION.

No Loadify-owned receiving, bin, pick/pack or warehouse step is required.

## 3. Preconditions for orchestration

A Supplier-Fulfilled leg must not be created/submitted merely because a product is visible.

Preconditions may include:
- customer order exists;
- valid payment evidence according to model;
- selected Supplier Offer exists and is eligible;
- supplier is active/qualified;
- product/offer compliance and rights are valid;
- stock evidence acceptable;
- price evidence acceptable;
- territory/delivery capability valid;
- margin/risk policy passes;
- feature flag enabled;
- incident/kill switch permits action.

Final policy waits for Gate B and authorised phases.

## 4. Offer selection snapshot

At orchestration time preserve enough evidence to explain why this supplier/offer was selected:
- canonical product/variant;
- selected supplier;
- selected offer/reference;
- supplier cost/currency;
- supplier shipping cost;
- stock evidence/freshness;
- price evidence/freshness;
- SLA/delivery promise evidence;
- compliance/risk state;
- selection policy/version.

Later source changes must not erase the historical selection basis.

## 5. Reservation

Reservation means preventing oversell/race conditions according to the supplier capability and Loadify sellability model.

Possible capability classes:
- supplier supports remote reservation;
- supplier has no reservation API but supports reliable stock/price confirmation;
- supplier only supports order submission;
- manual/offline supplier.

Core architecture must not pretend all providers have the same reservation semantics.

## 6. Payment -> supplier handshake

PAYMENT SUCCESS != SUPPLIER ORDER SUCCESS.

Canonical responsibilities:
1. verify payment evidence;
2. recheck selected offer where policy requires;
3. recheck stock/price where capability permits;
4. create idempotency identity;
5. submit supplier order;
6. persist request/evidence safely;
7. resolve acknowledgement;
8. persist external supplier reference;
9. transition internal fulfilment responsibility;
10. notify/continue buyer lifecycle.

## 7. Submission idempotency

Every supplier submission must tolerate:
- client/server retry;
- function retry;
- timeout after external provider accepted order;
- response lost after acceptance;
- webhook/callback duplication;
- manual recovery.

A retry must not create two supplier orders for one intended fulfilment leg.

## 8. Lost-response recovery

If Loadify cannot tell whether the supplier accepted the order:
- do not blindly submit again;
- enter recoverable unknown/pending state;
- query provider by idempotency/reference where supported;
- reconcile callback/webhook/order lookup;
- route to operator review if certainty cannot be restored.

UNKNOWN != FAILED.

## 9. Acknowledgement

Supplier acknowledgement may be synchronous or asynchronous.

Architecture must distinguish:
- submitted;
- accepted/acknowledged;
- rejected;
- pending/unknown;
- failed before external acceptance;
- externally accepted but internal persistence incomplete.

Names are conceptual only.

## 10. Supplier refusal

If supplier refuses after customer payment:
- customer order remains canonical;
- orchestrator evaluates approved fallback offer if contract/policy permits;
- otherwise initiate cancellation/refund/exception flow according to Gate B;
- preserve reason and supplier-performance evidence;
- do not silently substitute a materially different product/terms.

## 11. Price change

If supplier price changes between checkout and submission:
- never rewrite what customer paid;
- apply configured tolerance/margin/risk policy;
- choose fallback/review/hold/refund action as contract allows;
- record commercial impact.

## 12. Stock disappearance

If supplier stock disappears:
- do not fabricate available stock;
- try approved alternate Supplier Offer only if product identity/variant and policy permit;
- otherwise exception/refund path;
- update offer/stock health evidence.

## 13. Multiple fulfilment legs

If future Gate B permits one customer order with multiple supplier legs:
- customer order remains one;
- each leg has independent supplier/submission/tracking/exception state;
- customer-facing status is derived from all relevant legs according to deterministic policy;
- financial allocation between legs remains reconcilable;
- one failed leg must not corrupt successful leg history.

Do not enable multi-leg checkout merely because this architecture can model it.

## 14. Tracking

Supplier/provider/carrier tracking events enter through adapters/connectors.

Responsibilities:
- deduplicate events;
- preserve raw provider evidence where useful;
- normalize into Loadify shipment/fulfilment state;
- map timestamps safely;
- detect impossible regressions/out-of-order events;
- surface buyer-facing status in Loadify.

Provider-specific status strings must not become core lifecycle enums by accident.

## 15. Direct-to-buyer dispatch

Supplier/fulfilment provider may dispatch directly to customer.

Loadify still needs canonical evidence for:
- dispatch time;
- carrier/service where available;
- tracking reference;
- expected delivery;
- delivery events;
- failure/exception.

No Loadify warehouse hop is assumed.

## 16. Buyer experience

Buyer remains inside Loadify for:
- order confirmation;
- order status;
- tracking;
- support;
- returns/refunds;
- exception communications.

External supplier UI is not required for normal buyer lifecycle unless an explicit future decision allows it.

## 17. Exceptions

Every exception needs:
- type;
- state;
- owner;
- customer impact;
- financial impact;
- next action;
- deadline/SLA where applicable;
- evidence;
- resolution.

Examples:
- supplier timeout;
- refusal;
- duplicate/unknown submission;
- price change;
- stock lost;
- dispatch late;
- tracking stale;
- delivery failed;
- wrong item;
- lost parcel;
- supplier unreachable;
- provider outage.

## 18. Cancellation

Cancellation semantics depend on supplier capability and timing.

Distinguish:
- before supplier submission;
- after submission but before acknowledgement;
- acknowledged but cancellable;
- dispatched/not cancellable;
- provider cancellation accepted but callback lost;
- customer refund independent of supplier recovery where necessary.

Do not mark supplier cancellation successful solely from a local status change.

## 19. Returns

Customer return lifecycle remains Loadify-owned from customer perspective.

Physical return destination is contract/capability driven:
- supplier;
- fulfilment provider;
- manufacturer/returns processor;
- another approved destination.

Do not default to Loadify warehouse.

## 20. Supplier recovery

Return/refund to buyer and recovery from supplier are separate linked processes.

Fulfilment completion does not imply financial reconciliation completion.

## 21. Performance evidence

Orchestration should generate objective supplier-performance evidence such as:
- acknowledgement latency;
- refusal rate;
- stock mismatch rate;
- price mismatch rate;
- dispatch timeliness;
- tracking freshness;
- delivery success/failure;
- return/recovery outcomes.

Performance scoring must remain explainable and policy-versioned.

## 22. Kill switch

Supplier/provider kill switch may block:
- new offer selection;
- new supplier submissions;
- selected capabilities.

It must not delete or hide existing order/fulfilment history.

Open orders need explicit exception/recovery handling.

## 23. Replay/recovery

Architecture must support safe replay of recoverable operations using idempotency and state evidence.

Replay is not re-execution without checking external reality.

## 24. E2E mandatory scenarios

At minimum:
- normal success;
- duplicate submission attempt;
- timeout before acceptance;
- accepted but response lost;
- duplicate acknowledgement;
- supplier refusal;
- stock disappears;
- price changes;
- provider outage;
- tracking events out of order;
- delivery failed;
- customer refund before supplier recovery;
- supplier recovery succeeds/fails;
- kill switch with open order;
- retry/replay after partial persistence failure.

## 25. PASS criteria

Supplier fulfilment orchestration is not PASS until:
- one customer order truth is preserved;
- direct-to-buyer model works without Loadify warehouse dependency;
- supplier submission is idempotent;
- payment success is not confused with supplier acceptance;
- unknown/lost-response state is recoverable;
- provider statuses are normalized;
- customer price history is immutable to fulfilment cost changes;
- exceptions have ownership and recovery paths;
- returns and supplier recovery remain separate;
- open-order history survives supplier/provider kill switch;
- reconciliation is evidenced end-to-end.
