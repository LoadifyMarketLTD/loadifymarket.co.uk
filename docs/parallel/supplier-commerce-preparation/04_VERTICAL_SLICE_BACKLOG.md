# VERTICAL-SLICE IMPLEMENTATION BACKLOG

Status: PREPARED ORDER ONLY. Execution waits for Checkpoint A PASS → Baseline Freeze → Gate B PASS.

Every slice must follow:

BUSINESS CONTRACT
→ DATA MODEL
→ AUTH
→ API
→ DB
→ SIDE EFFECTS
→ ADMIN GOVERNANCE
→ MOBILE IF RELEVANT
→ ERROR PATHS
→ E2E
→ BRANCH GUARD.

No slice is PASS because only its DB or UI exists.

## Slice C1 — Platform control foundations

Prepare/verify:
- Supplier Commerce feature flags;
- server-enforced rollout controls;
- observability/correlation IDs;
- incident model;
- API versioning contract;
- privacy/retention model;
- risk architecture;
- recovery/replay design.

Acceptance focus:
- no UI-only flag;
- lifecycle deterministic under rollout;
- incidents have owner/remediation path;
- rollback includes data compatibility.

## Slice D1 — Supplier registry + capabilities

Business responsibilities:
- supplier identity;
- qualification state;
- territory;
- capabilities;
- integration type;
- active/paused/suspended state;
- SLA contract references;
- provenance/compliance status.

No provider-specific core fields unless proven canonical responsibilities.

## Slice D2 — Supplier Adapter Interface

Canonical capabilities may include:
- health/capability discovery;
- catalog retrieval;
- stock;
- price;
- submit order;
- acknowledgement;
- cancel;
- tracking/fulfilment events;
- return/reimbursement where supported.

Provider-specific implementation remains behind adapter.

## Slice E1 — Canonical Product identity

Responsibilities:
- factual product identity;
- normalized facts;
- category;
- variant identity;
- evidence/provenance references;
- deduplication workflow.

E2E must prove:
- same product from multiple sources can converge;
- false-positive merge can be reviewed/rejected;
- supplier offer data does not corrupt canonical product truth.

## Slice E2 — Supplier Offers

Responsibilities:
- supplier-specific reference;
- product cost/currency;
- supplier shipping cost;
- territory;
- stock/price evidence;
- freshness;
- SLA;
- returns/recovery capability;
- status/version.

E2E must prove one product can have multiple offers without duplicate buyer product truth.

## Parallel track after E — Product Discovery / Opportunity Intelligence

May begin only when canonical supplier data exists.

Capabilities:
- source connectors;
- opportunity evidence;
- trend/demand signals;
- supplier matching candidates;
- margin/delivery/risk indicators;
- explainable recommendation.

Must not:
- auto-publish by default;
- become checkout dependency;
- invent supplier role;
- write financial truth.

## Slice F1 — Operator Import / Source Product

Entry points:
- manual product;
- approved URL;
- approved catalog/feed;
- supplier catalog/API;
- Discovery recommendation.

Pipeline:
EXTRACT
→ SOURCE IDENTIFICATION
→ NORMALISE
→ CANONICAL MATCH/CANDIDATE
→ SUPPLIER OFFER
→ PROVENANCE
→ RIGHTS
→ COMPLIANCE
→ COMMERCIAL ECONOMICS
→ AI BUILDER
→ REVIEW
→ PUBLISH.

E2E includes interrupted/retry/idempotent import and duplicate avoidance.

## Slice F2 — AI Product Builder

May generate presentation only from verified facts.

E2E must prove unverified certification/material/origin/warranty/safety/medical/technical claims cannot be promoted to factual product truth.

## Slice G1 — True Landed Cost

Responsibilities:
- supplier product cost;
- supplier shipping;
- tax/customs/duty where applicable;
- FX;
- payment/provider fees;
- operational allowances where contract approves;
- expected contribution/margin.

Rules must be versioned where volatile.

## Slice G2 — Financial Ledger / Accounting Truth

One canonical financial truth.

Must model by event/responsibility, according to Gate B:
- customer payment;
- Loadify revenue/margin;
- supplier payable/cost;
- shipping economics;
- tax;
- refund;
- recovery;
- chargeback;
- loss;
- reconciliation.

Corrections append/reverse/adjust; no retrospective history rewriting.

## Slice H1 — Stock sync / Sellable stock

SUPPLIER RAW STOCK ≠ LOADIFY SELLABLE STOCK.

Include:
- freshness;
- confidence;
- safety buffer;
- reservation;
- stale/unknown;
- sellable calculation;
- admin visibility;
- checkout guard;
- failure alert.

## Slice H2 — Price sync / Margin guard

Include:
- supplier price freshness;
- safe movement policy;
- abnormal movement review;
- margin floor;
- fail closed on unavailable price where required;
- no silent loss-making orders.

## Slice I1 — Order Orchestrator

Preserve ONE CUSTOMER ORDER.

Add internal fulfilment legs and selected offer snapshot/responsibility without parallel buyer order truth.

E2E:
- one order / one supplier leg;
- one order / multiple legs if supported by Gate B;
- supplier suspended mid-order;
- reservation failure;
- idempotent orchestration.

## Slice I2 — Commerce Risk

Cover supplier, buyer and platform risk signals.

Actions:
ALLOW / REVIEW / HOLD / RESTRICT / BLOCK according to policy.

No opaque automatic ban.

## Slice J1 — Payment → Supplier Handshake

PAYMENT SUCCESS ≠ SUPPLIER ORDER SUCCESS.

E2E:
- success;
- supplier timeout;
- accepted but response lost;
- duplicate submit;
- duplicate acknowledgement;
- price changed;
- stock disappeared;
- supplier refusal;
- recovery/reconciliation.

## Slice K1 — Tracking normalisation

Supplier/carrier events map into canonical Loadify shipment/fulfilment state.

Buyer stays in Loadify experience.

## Slice K2 — Exception Engine

Every exception needs:
- state;
- owner;
- next action;
- audit;
- customer impact;
- financial impact;
- resolution.

## Slice L1 — Returns / Customer Refund

Extend existing return/refund flow vertically.

No Loadify-warehouse assumption.

## Slice L2 — Supplier Recovery + Reconciliation

Track supplier return/reimbursement/recovery separately from customer refund.

Order complete ≠ financially reconciled.

## Slice M1 — Supplier Control Centre

Admin/Super Admin vertical governance:
- registry;
- health/SLA;
- offers/catalog sync;
- stock/price failures;
- margin alerts;
- order/ack failures;
- tracking exceptions;
- returns/refunds/recovery;
- reconciliation;
- risk/incidents;
- performance;
- kill switch.

## Slice N1 — Supplier Simulator + Replay

Simulate success and failure paths before production supplier pilot.

Simulator PASS ≠ pilot PASS.

## Slice O1 — Controlled Pilot

Default contract recommendation unless Gate B changes it:
- Great Britain;
- one approved supplier;
- small low-risk product set;
- end-to-end verification.

## Slice P1 — Performance + Controlled Scale

Supplier performance must be explainable and evidence-based.

Scale only after pilot evidence.

## Slice Q1 — Full Production Hardening

Reaudit entire platform after Supplier Commerce integration:
- auth;
- marketplace;
- Supplier-Fulfilled;
- products/catalog;
- checkout/payments/ledger;
- orders/fulfilment/tracking;
- returns/refunds/recovery;
- admin/mobile;
- DB/RLS/security/privacy;
- observability/incidents/recovery;
- provider configuration;
- E2E/error paths.

Production ready only after canonical Definition of Done is evidenced.