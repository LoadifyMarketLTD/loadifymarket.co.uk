# VERTICAL-SLICE IMPLEMENTATION BACKLOG

Status: PREPARED ORDER ONLY. Execution now waits for Gate B PASS; Checkpoint A and Foundation Baseline Freeze are completed historical gates.

Interpret this file together with `33_PRODUCT_DIRECTION_RECONCILIATION_2026-08-20.md` and the current canonical contract on `main`.

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

Every implementation PR must also verify that it did not introduce unrelated visual redesign or change the established Loadify site direction. Supplier Commerce extends Loadify; it does not replace or visually redesign unrelated Buyer/Seller/Admin/Super Admin/Workspace surfaces.

## Slice C1 — Platform control foundations

Prepare/verify:
- Supplier Commerce feature flags;
- server-enforced rollout controls;
- observability/correlation IDs;
- incident model;
- API versioning contract;
- privacy/retention model;
- risk architecture;
- recovery/replay design;
- provider/legal capability register framework;
- provider capability re-verification ownership;
- kill-switch ownership and audit.

Acceptance focus:
- no UI-only flag;
- lifecycle deterministic under rollout;
- incidents have owner/remediation path;
- rollback includes data compatibility;
- stale provider/legal assumptions cannot silently become production truth.

## Slice D1 — Supplier registry + capabilities

Business responsibilities:
- supplier identity;
- qualification state;
- territory;
- capabilities;
- integration type;
- active/paused/suspended state;
- SLA contract references;
- provenance/compliance status;
- manufacturer/importer/responsible-operator evidence where applicable;
- product-safety/incident relationship where applicable.

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

External role model must remain separated:
DISCOVERY SOURCE
≠ CATALOG SOURCE
≠ SUPPLIER
≠ FULFILMENT PROVIDER
≠ CARRIER
≠ SALES / CHANNEL CONNECTOR.

Provider-specific implementation remains behind adapter/connector boundaries.

Every implementation target requires current capability/API/rights/commercial-term evidence before implementation readiness.

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
- supplier offer data does not corrupt canonical product truth;
- review/rating/media provenance does not become canonical product fact.

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
- origin/fulfilment evidence where relevant;
- compliance state;
- status/version.

E2E must prove one product can have multiple offers without duplicate buyer product truth.

Supplier fallback must never silently substitute a merely similar product or violate exact variant, compliance, committed price, delivery promise, return/support or origin/customs constraints defined by Gate B.

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
- write financial truth;
- treat publicly visible content as reusable commercial content;
- convert external reviews/ratings into Loadify reviews.

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
→ SOURCE ROLE CLASSIFICATION
→ NORMALISE
→ CANONICAL MATCH/CANDIDATE
→ VARIANT MAP
→ SUPPLIER OFFER
→ PROVENANCE
→ CONTENT / IMAGE / VIDEO / UGC RIGHTS
→ PRODUCT SAFETY / COMPLIANCE
→ STOCK ORIGIN / SHIPPING CAPABILITY
→ COMMERCIAL ECONOMICS
→ TAX/VAT/CUSTOMS CONTEXT
→ AI BUILDER
→ REVIEW
→ PUBLISH.

E2E includes interrupted/retry/idempotent import and duplicate avoidance.

No owner/admin direct-write bypass.

## Slice F2 — AI Product Builder

May generate presentation only from verified facts.

May assist with title, descriptions, benefits presentation, structured specifications, FAQ, SEO, category suggestions, variant/comparison presentation, page structure, marketing copy, social/channel ad copy and creative briefs/scripts, and presentation/image enhancement where rights permit.

E2E must prove unverified certification/material/origin/warranty/safety/medical/technical/environmental/authenticity/delivery claims cannot be promoted to factual product truth.

E2E must also prove externally sourced review/rating content preserves truthful provenance and commercial media rights can block publication.

## Slice G1 — True Landed Cost

Responsibilities:
- supplier product cost;
- supplier shipping;
- tax/customs/duty where applicable;
- FX;
- payment/provider fees;
- operational allowances where contract approves;
- expected contribution/margin;
- consignment/shipment context where tax/customs requires it.

Rules must be versioned where volatile.

For multi-leg/multi-item cases preserve, where applicable:
CUSTOMER ORDER
↔ FULFILMENT LEG
↔ CONSIGNMENT
↔ TAX/CUSTOMS EVIDENCE.

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

Where UK digital-platform reporting applies, required reporting totals/evidence must derive from canonical transaction/financial truth. Do not create a parallel reporting ledger.

Buyer-facing totals must consume canonical pricing truth. No drip-price design or conflicting reconstruction across surfaces.

## Slice H1 — Stock sync / Sellable stock

SUPPLIER RAW STOCK ≠ LOADIFY SELLABLE STOCK.

Include:
- supplier quantity;
- freshness;
- confidence;
- safety buffer;
- reservation;
- stale/unknown;
- regional shipping availability;
- exact variant availability;
- supplier/account health;
- compliance state;
- provider incident/kill switch;
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
- no silent loss-making orders;
- protection against post-payment price mutation;
- canonical customer price/mandatory-fee/shipping/tax presentation contract.

## Slice I1 — Order Orchestrator

Preserve ONE CUSTOMER ORDER.

Add internal fulfilment legs and selected offer snapshot/responsibility without parallel buyer order truth.

E2E:
- one order / one supplier leg;
- one order / multiple legs if supported by Gate B;
- consignment relationship preserved where applicable;
- supplier suspended mid-order;
- reservation failure;
- idempotent orchestration;
- fallback supplier cannot violate the customer promise;
- no eligible fallback enters canonical exception/cancellation/customer-remedy path.

## Slice I2 — Commerce Risk

Cover supplier, buyer, product-safety/compliance and platform risk signals.

Actions:
ALLOW / REVIEW / HOLD / RESTRICT / BLOCK according to policy.

No opaque automatic ban.

Risk controls must support supplier/product suspension and emergency safety/operational kill switches where relevant.

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
- supplier fallback eligibility/ineligibility;
- customer remedy;
- recovery/reconciliation.

## Slice K1 — Tracking normalisation

Supplier/carrier events map into canonical Loadify shipment/fulfilment state.

Buyer stays in Loadify experience.

Where legally/business-required, customer-facing seller/fulfiller/dispatch-origin/return-path disclosures remain accurate without exposing raw provider jargon as canonical state.

## Slice K2 — Exception Engine

Every exception needs:
- state;
- owner;
- next action;
- audit;
- customer impact;
- financial impact;
- resolution.

Include supplier non-acknowledgement, stock mismatch, provider outage, compliance/safety hold and recall/withdrawal escalation where applicable.

## Slice L1 — Returns / Customer Refund

Extend existing return/refund flow vertically.

No Loadify-warehouse assumption.

Support Gate B-defined return destination, customer remedy, safety recall/withdrawal handling and accurate disclosure.

## Slice L2 — Supplier Recovery + Reconciliation

Track supplier return/reimbursement/recovery separately from customer refund.

Order complete ≠ financially reconciled.

Where reporting obligations apply, corrections/recoveries must remain traceable in canonical financial/reporting evidence.

## Slice M1 — Supplier Control Centre

Admin/Super Admin vertical governance:
- registry;
- provider capability record/verification status;
- health/SLA;
- offers/catalog sync;
- stock/price failures;
- margin alerts;
- order/ack failures;
- tracking exceptions;
- returns/refunds/recovery;
- reconciliation;
- risk/incidents;
- product-safety complaints/incidents;
- recall/withdrawal state;
- affected buyer/order traceability where required;
- supplier/product/provider suspension;
- performance;
- kill switch.

Functional controls must fit the established Admin/Super Admin design. This slice does not authorise unrelated visual redesign.

## Slice N1 — Supplier Simulator + Replay

Simulate success and failure paths before production supplier pilot.

Include provider capability mismatch, stale stock/price, supplier timeout/unknown acknowledgement, fallback supplier eligibility, rights/compliance block, recall/safety hold and recovery/replay scenarios where applicable.

Simulator PASS ≠ pilot PASS.

## Slice O1 — Controlled Pilot

Default contract recommendation unless Gate B changes it:
- Great Britain;
- one approved supplier;
- small low-risk product set;
- end-to-end verification.

Pilot prerequisites include current provider capability evidence, rights/compliance evidence, price transparency, tax/customs treatment, customer remedy, observability, kill switch and financial reconciliation.

## Slice P1 — Performance + Controlled Scale

Supplier performance must be explainable and evidence-based.

Scale only after pilot evidence.

Reverify provider capability/policy/legal assumptions before material scale expansion.

## Slice Q1 — Full Production Hardening

Reaudit entire platform after Supplier Commerce integration:
- auth;
- marketplace;
- Supplier-Fulfilled;
- products/catalog;
- Product Discovery;
- Operator Import;
- AI Product Builder;
- checkout/payments/ledger;
- price transparency;
- tax/VAT/customs/consignments;
- digital-platform reporting readiness where applicable;
- orders/fulfilment/tracking;
- returns/refunds/recovery;
- review/rating provenance;
- content/image/video/UGC rights;
- product safety/recall/market-surveillance readiness;
- admin/mobile;
- DB/RLS/security/privacy;
- observability/incidents/recovery;
- provider capability register/configuration;
- sales-channel connector boundary if any channel has been introduced;
- E2E/error paths;
- visual-direction guard / no unrelated redesign.

Production ready only after canonical Definition of Done is evidenced.