# IMPLEMENTATION READINESS MATRIX

Status: PREPARATION ONLY

## Purpose

Provide a deterministic way to decide whether a Supplier Commerce capability is ready for implementation, instead of beginning code because the idea appears clear.

## Readiness states

Each capability is classified as:

- NOT READY — blocked by Checkpoint A, Gate B, missing evidence or unresolved ownership;
- DESIGN READY — responsibility contract exists but runtime/schema is still unauthorized;
- IMPLEMENTATION READY — Gate B and frozen-foundation dependencies are resolved;
- PILOT READY — implementation and evidence pass controlled pre-production/pilot gates;
- SCALE READY — operational, financial, security and supplier-performance evidence supports controlled expansion.

Current lane status for all runtime capabilities: DESIGN READY at most. None is IMPLEMENTATION READY before the canonical gates pass.

## Global prerequisites

No Supplier Commerce capability can become IMPLEMENTATION READY until:

- Checkpoint A atomic PASS;
- Foundation Baseline Freeze;
- Gate B PASS for the capability's business-contract dependencies;
- exact frozen main SHA captured;
- live migration head captured;
- no unresolved P0/P1 foundation conflict affecting the capability;
- implementation branch created/reconciled from frozen main.

## Capability matrix

### Platform control foundations

Design artifacts available:

- feature flags/kill switch;
- observability/incidents;
- API versioning;
- privacy/retention;
- backup/recovery;
- concurrency/idempotency.

Implementation readiness requires:

- final auth/admin boundary;
- final event/logging conventions;
- Gate B scope for operator powers;
- rollback/data-compatibility contract.

### Supplier adapter framework

Design artifacts available:

- provider-independent adapter interfaces;
- capability taxonomy;
- source/supplier/fulfilment role separation;
- retry/idempotency principles.

Implementation readiness requires:

- at least one approved supplier integration target;
- verified current official provider API/terms;
- credential storage/security contract;
- supplier relationship defined by Gate B;
- simulator contract ready before live provider activation.

### Supplier qualification/SLA/risk

Design artifacts available:

- qualification controls;
- SLA/risk governance;
- kill-switch triggers;
- supplier-performance concept.

Implementation readiness requires:

- Gate B supplier obligations;
- exact required documents/evidence;
- operator/admin authority;
- legal/compliance source verification;
- risk thresholds versioned.

### Canonical Product / Supplier Offer

Design artifacts available:

- one canonical product / multiple supplier offers;
- dedupe/canonical identity responsibilities;
- separation from marketplace seller listings.

Implementation readiness requires:

- frozen current product schema audit;
- Gate B ownership of Loadify-operated listings;
- final product identity/dedupe rules;
- source/provenance/rights contract;
- explicit relationship to existing `sellerId` requirement without inventing a fake seller.

### Operator import

Design artifacts available:

- URL/catalog/source-driven import pipeline;
- evidence/review gates;
- no direct URL-to-products bypass.

Implementation readiness requires:

- operator role/authorization finalized;
- canonical product target finalized;
- provider/source connector contract;
- rights/compliance requirements;
- AI Facts Lock enforcement path;
- preview/review/publish ownership.

### Product Discovery / Opportunity Intelligence

Design artifacts available:

- recommendation-only discovery;
- provider/source capability separation.

Implementation readiness requires:

- Phase E canonical supplier data exists;
- discovery cannot write live products directly;
- current source terms/API rights verified;
- ranking/opportunity facts distinguish evidence from inference.

This capability must not block core commerce.

### AI Product Builder

Design artifacts available:

- AI Facts Lock;
- merchandising governance;
- provenance separation.

Implementation readiness requires:

- canonical factual input model;
- allowed vs forbidden transformations;
- evidence traceability;
- rights policy for imagery/copy;
- human/operator review policy where required.

### Landed cost / pricing

Design artifacts available:

- supplier cost vs buyer price separation;
- landed-cost responsibility;
- margin guard;
- tax/VAT/customs rule versioning.

Implementation readiness requires:

- Gate B money flow;
- supplier commercial terms;
- tax/customs responsibility;
- currency/FX policy;
- buyer-price authority;
- minimum-margin/exception policy.

### Stock/sellability

Design artifacts available:

- raw supplier stock != sellable stock;
- freshness/stale handling;
- reservation and safety buffer concepts.

Implementation readiness requires:

- supported supplier stock capabilities;
- Gate B oversell/backorder policy;
- frozen marketplace reservation behavior mapped;
- concurrency boundary;
- fail-closed stale/unknown policy.

### Price sync

Design artifacts available:

- source observation;
- stale-price policy;
- margin protection;
- controlled repricing.

Implementation readiness requires:

- supplier pricing capability;
- buyer price authority;
- threshold/approval policy;
- tax/FX dependencies;
- protection against post-payment price mutation.

### Order orchestrator

Design artifacts available:

- customer order vs internal fulfilment legs;
- supplier acknowledgement and failure states;
- direct supplier-to-buyer model.

Implementation readiness requires:

- final frozen order lifecycle;
- final immutable commercial snapshot contract;
- Gate B seller-of-record/customer obligation decision;
- payment-to-supplier timing;
- idempotency keys and supplier retry rules;
- supplier failure policy.

### Payment-to-supplier

Design artifacts available:

- buyer payment != supplier order success;
- supplier payable distinct from seller payout by default;
- canonical financial truth.

Implementation readiness requires:

- Gate B supplier payable/settlement model;
- processor/payment constraints;
- refund/chargeback allocation;
- supplier acknowledgement semantics;
- reconciliation contract.

### Tracking/exceptions

Design artifacts available:

- canonical customer tracking;
- supplier/carrier evidence ingestion;
- exception engine.

Implementation readiness requires:

- final shipment boundary from frozen foundation;
- provider tracking capability;
- event mapping;
- retry/dedupe rules;
- customer notification policy;
- incident/escalation thresholds.

### Returns/refunds/supplier recovery

Design artifacts available:

- customer refund != supplier recovery;
- separate financial reconciliation;
- no warehouse assumption.

Implementation readiness requires:

- Gate B return/refund obligations;
- return destination model;
- supplier return capability;
- payment refund source of truth;
- ledger/recovery events;
- customer SLA.

### Supplier Control Centre

Design artifacts available:

- supplier operational visibility;
- risk/SLA/kill switch;
- incident visibility.

Implementation readiness requires:

- final admin/operator authorization;
- canonical supplier entity;
- metrics/events available;
- mutation actions behind server boundaries;
- no direct unsafe DB shortcuts.

### Simulator/replay

Design artifacts available:

- supplier simulator;
- replay/idempotency responsibilities;
- failure injection.

Implementation readiness requires:

- stable adapter contract;
- stable event/idempotency model;
- representative failure scenarios;
- deterministic fixture policy.

Simulator must be available before risky live provider integration is treated as mature.

### Pilot

Design artifacts available:

- controlled pilot and DoD evidence.

Pilot readiness requires:

- selected supplier/provider qualified;
- complete vertical slice implemented;
- production-safe feature flag;
- kill switch verified;
- observability dashboards/alerts;
- rollback/recovery rehearsal;
- customer remedy process;
- financial reconciliation evidence.

### Scale

Scale readiness requires evidence from real controlled operation:

- supplier acknowledgement reliability;
- stock/price freshness;
- fulfilment SLA;
- tracking quality;
- refund/recovery behavior;
- financial reconciliation accuracy;
- incident rate;
- customer-impact metrics;
- kill-switch effectiveness.

Scale is not authorized merely because the pilot technically completed.

## Readiness anti-patterns

Do not mark IMPLEMENTATION READY because:

- a table name was proposed;
- a provider has an API;
- a UI mock exists;
- a deploy preview is green;
- a supplier says it supports dropshipping;
- a product is visible on an external marketplace;
- AI can extract the page;
- current marketplace seller flow appears similar;
- service_role can bypass RLS;
- a migration can technically be written.

## Readiness evidence record

For each capability transitioning to IMPLEMENTATION READY, record:

- frozen main SHA;
- Gate B contract version;
- authoritative source references;
- dependency status;
- data/source-of-truth owner;
- security boundary;
- failure model;
- rollback plan;
- acceptance tests;
- unresolved risks.

No capability is ready if any unresolved risk can make the business state ambiguous or financially unsafe without a fail-closed guard.
