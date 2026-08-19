# PILOT, CONTROLLED SCALE AND DEFINITION OF DONE CONTRACT

Status: PREPARATION ONLY. Defines evidence required before Supplier Commerce can move from implementation to pilot, scale and production readiness.

## 1. Core principle

CODE COMPLETE ≠ PRODUCTION READY.

SIMULATOR PASS ≠ PILOT PASS.

PILOT PASS ≠ FULL SCALE PASS.

A gate is passed only with real evidence for all required dimensions.

## 2. Pre-pilot prerequisites

Before any real Supplier Commerce pilot, evidence must exist for the applicable vertical slice across:

- business contract;
- data ownership;
- authorization/security;
- API/server boundaries;
- database invariants;
- supplier adapter behavior;
- stock/price freshness;
- payment/supplier handshake;
- fulfilment/tracking;
- refunds/recovery;
- financial reconciliation;
- observability/incidents;
- rollback/replay;
- admin governance;
- mobile/web parity where applicable;
- privacy/compliance/provenance;
- E2E failure paths.

No single green build can substitute for this evidence.

## 3. Supplier simulator gate

Simulator should exercise at minimum:

- successful catalog/offer retrieval;
- stock change;
- price change;
- supplier order accepted;
- supplier order rejected;
- timeout;
- accepted but response lost;
- duplicate request;
- duplicate acknowledgement;
- delayed tracking;
- delivery failure;
- cancellation;
- return/recovery outcome;
- provider outage;
- malformed response.

Simulator must prove idempotency/recovery behavior, not just happy-path parsing.

## 4. Recovery/replay gate

Before pilot, demonstrate recovery for operations that can produce uncertain external side effects.

Examples:

- supplier submission timeout;
- webhook/event lost;
- tracking ingestion outage;
- refund succeeds but local update fails;
- supplier reimbursement response lost;
- sync interrupted mid-batch.

Recovery evidence must show no duplicate customer/supplier financial side effect.

## 5. Default controlled pilot shape

Unless Gate B/owner later changes it, preparation recommendation is:

- Great Britain scope;
- one approved supplier;
- small low-risk product set;
- limited order value/volume;
- explicit pilot feature flag/cohort;
- enhanced observability;
- kill switch available;
- operator review/escalation path;
- no physical Loadify warehouse requirement.

This is a safety recommendation, not a legal/commercial mandate.

## 6. Pilot product criteria

Prefer products with:

- clear product identity;
- clear source/content rights;
- low compliance complexity;
- stable stock;
- stable price;
- predictable fulfilment;
- clear return path;
- sufficient margin;
- reliable tracking;
- limited customer harm if exception occurs.

Avoid proving the architecture first with the hardest category.

## 7. Pilot supplier criteria

Pilot supplier should have:

- verified identity/qualification;
- stable integration path;
- clear SLA/contact escalation;
- stock/price evidence;
- order acknowledgement support;
- tracking support;
- returns/recovery process;
- willingness/capability to investigate reconciliation issues.

## 8. Pilot observability

For every pilot order, authorized operators should be able to determine:

- chosen canonical product/offer;
- stock/price evidence at decision points;
- customer payment state;
- supplier submission state;
- acknowledgement/external reference;
- shipment/tracking state;
- customer communications/exceptions;
- refund/recovery state;
- financial reconciliation state;
- incident/correlation IDs.

If an operator cannot explain an order end-to-end, pilot observability is incomplete.

## 9. Pilot success metrics

Metrics may include:

- successful supplier submission/ack rate;
- duplicate side-effect rate = zero target;
- stock rejection/oversell rate;
- price/margin exception rate;
- on-time dispatch/delivery;
- tracking completeness;
- customer-contact/exception rate;
- refund rate;
- supplier recovery rate;
- unreconciled financial exceptions;
- incident count/severity;
- operator intervention burden.

Exact thresholds are decided before pilot/scale, not invented after seeing results.

## 10. Pilot failure rule

A failed order does not automatically mean pilot failure if the system correctly:

- detects the failure;
- preserves truth;
- prevents duplicate/unsafe side effects;
- communicates appropriately;
- recovers/refunds/reconciles;
- produces actionable evidence.

A silent failure or unexplained financial discrepancy is more serious than a visible controlled exception.

## 11. Scale promotion

Promotion from pilot to larger scope requires evidence that:

- known failure modes are controlled;
- reconciliation backlog is acceptable;
- supplier performance supports expansion;
- observability is sufficient;
- support/admin operations are manageable;
- financial outcomes are understood;
- no unresolved P0/P1 risk remains;
- rollback/kill-switch remains demonstrated.

## 12. Scale dimensions

Scale should be controlled independently by dimensions such as:

- supplier count;
- product count;
- category risk;
- territory;
- order value;
- order volume;
- automation level;
- number of providers/connectors.

Do not expand every dimension at once.

## 13. Definition of Done — vertical slice

A Supplier Commerce vertical slice is DONE only when applicable elements are evidenced:

1. business responsibility defined;
2. data ownership/schema aligned;
3. authorization/server boundary enforced;
4. client cannot bypass critical write path;
5. lifecycle/state transitions deterministic;
6. idempotency/concurrency handled;
7. external side effects recoverable;
8. observability/audit present;
9. admin governance present;
10. error/failure paths tested;
11. E2E happy path tested;
12. financial consequences reconciled;
13. privacy/compliance requirements satisfied;
14. mobile/web contract consistent where relevant;
15. rollback/data compatibility demonstrated;
16. Branch Guard exact diff PASS;
17. no known P0/P1 unresolved for the slice.

Partial completion must be reported as partial, not PASS.

## 14. Definition of Done — Supplier Commerce subsystem

Subsystem production readiness additionally requires:

- Checkpoint A foundation remains healthy after integration;
- Gate B decisions are still reflected in runtime;
- no parallel order/payment/financial truth;
- supplier adapters remain provider-independent at core;
- Product Discovery remains non-blocking/recommendation-only;
- operator import remains governed;
- no Loadify warehouse assumption introduced;
- customer experience remains coherent inside Loadify;
- supplier performance/kill switch/incident controls operational;
- backup/recovery/replay tested;
- pilot evidence reviewed;
- scale decision documented.

## 15. No Fake PASS rules

Never call PASS because:

- code compiles;
- Netlify preview builds;
- migration exists in repo;
- UI is visible;
- unit tests exist but were not executed;
- one happy-path manual test worked;
- simulator passed but real supplier pilot did not occur;
- provider returned 200 without business acknowledgement;
- customer refund happened but supplier recovery remains unknown;
- order delivered but financial reconciliation remains open.

## 16. Production hardening Q

Full hardening should re-audit at minimum:

- auth/active-account behavior;
- RLS/grants/server-only writes;
- seller marketplace flows;
- Supplier-Fulfilled flows;
- catalog/product identity;
- stock/price/sellability;
- checkout/payment;
- financial ledger/reconciliation;
- order/fulfilment/tracking;
- returns/refunds/recovery;
- admin/control centre;
- mobile/web parity;
- provider credentials/security;
- privacy/retention;
- compliance/provenance;
- observability/incidents;
- feature flags/kill switches;
- backup/recovery/replay;
- performance/capacity;
- rollback.

## 17. Release evidence packet

Before declaring full production readiness, prepare an evidence packet containing:

- exact release/main SHA;
- migration head;
- deployed configuration version;
- feature flag/pilot state;
- supplier/provider versions/capabilities;
- executed test evidence;
- unresolved/deferred risks;
- rollback procedure/evidence;
- monitoring/alert coverage;
- incident contacts;
- decision sign-off required by business contract.

## 18. Final invariant

LOADIFY SUPPLIER COMMERCE IS READY ONLY WHEN IT CAN SELL, FAIL, RECOVER, REFUND, RECONCILE AND EXPLAIN ITSELF SAFELY — NOT MERELY WHEN IT CAN PLACE ONE SUCCESSFUL ORDER.