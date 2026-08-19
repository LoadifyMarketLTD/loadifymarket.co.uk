# TARGET ARCHITECTURE — RESPONSIBILITY MODEL

Status: architecture preparation only. No final schema/table names are mandated here.

## 1. Core principle

Loadify owns canonical platform truth.

External providers do not dictate Loadify architecture.

Provider → Adapter/Connector → Canonical Loadify Contract.

## 2. External-facing role separation

### Discovery Source Connector
Purpose:
- observe products/trends/opportunities;
- ingest permitted product/catalog intelligence;
- produce recommendations/evidence.

It must NOT:
- become checkout dependency;
- auto-publish by default;
- create financial truth;
- become supplier merely because a product was discovered there.

### Catalog Source Connector
Purpose:
- retrieve factual source product/catalog data where permitted;
- preserve source reference/provenance;
- feed normalisation.

### Supplier Adapter
Purpose:
- supplier identity/capabilities;
- offer/catalog retrieval;
- stock;
- price;
- supplier order submission;
- acknowledgement;
- cancellation/return/reimbursement where supported.

### Fulfilment Provider Adapter
Purpose:
- dispatch/fulfilment execution if distinct from supplier;
- shipment/tracking handoff;
- fulfilment events.

### Carrier Adapter
Purpose:
- carrier events/tracking normalisation.

A single external platform may implement more than one adapter/connector role. Core code must still consume role-specific canonical interfaces.

## 3. Product sourcing surface

Loadify must support an authorised operator flow:

IMPORT / SOURCE PRODUCT
→ identify source
→ factual extraction
→ canonical identity matching
→ supplier/source matching
→ supplier offer candidate
→ provenance/rights/compliance
→ commercial economics
→ AI merchandising
→ review
→ publish.

This is a first-class operational capability, not an admin bypass.

## 4. Product intelligence

Product Discovery / Opportunity Intelligence may use approved data to score/recommend:

- demand;
- trend;
- competition;
- supplier availability;
- supplier reliability;
- price stability;
- stock stability;
- delivery performance;
- return rate where known;
- compliance risk;
- expected contribution/margin.

Output:
- recommendation;
- evidence;
- confidence;
- source freshness;
- rationale.

Discovery does not own product truth and does not auto-publish by architectural necessity.

## 5. Canonical Product

Responsibility:
- factual identity of what the product is;
- normalized factual attributes;
- variants;
- category mapping;
- verified facts and evidence references.

Must not own:
- supplier credentials;
- supplier-private cost;
- provider-specific operational metadata unrelated to product identity;
- provider-specific lifecycle.

## 6. Supplier Offer

Responsibility:
- supplier-specific commercial/operational offer for a canonical product;
- supplier/source reference;
- cost/currency;
- supplier shipping cost;
- stock evidence/freshness;
- territories;
- SLA;
- fulfilment capability;
- returns/recovery capability;
- risk/compliance/provenance state;
- version/freshness.

One Canonical Product may have many Supplier Offers.

## 7. AI Product Builder

Purpose:
- transform verified facts into professional Loadify merchandising.

May produce:
- title suggestions;
- description;
- benefit-oriented copy based on facts;
- SEO structure;
- FAQ from verified data;
- presentation and variant wording.

AI Facts Lock:
- generated copy cannot create new factual truth;
- unverified facts remain unverified/absent;
- certifications/materials/dimensions/origin/warranty/safety/medical/technical claims require evidence.

## 8. Offer Selection / Sellability

Supplier raw stock is not buyer-facing sellable stock.

Sellability may depend on:
- supplier active/qualified;
- offer active;
- product approved;
- provenance/compliance/rights state;
- stock freshness;
- stock confidence;
- safety buffer;
- reservations;
- price freshness;
- margin floor;
- territory;
- feature flag;
- incident/kill-switch state.

Unknown/stale states fail closed according to policy.

## 9. No-warehouse Supplier-Fulfilled model

Target operational path:

Buyer purchases on Loadify
→ canonical customer order
→ internal fulfilment leg
→ supplier order submission
→ supplier acknowledgement
→ supplier/fulfilment provider dispatches directly to buyer
→ tracking normalised into Loadify
→ buyer sees Loadify tracking/support experience.

No Loadify-owned warehouse is required by this model.

Do not invent:
- inbound receiving;
- bin locations;
- Loadify warehouse stock movements;
- pick/pack workflows;
unless a later explicit business decision introduces a physical inventory model.

## 10. One customer order / multiple fulfilment legs

Buyer-facing truth:

ONE CUSTOMER ORDER.

Internal execution may split into fulfilment legs by:
- Marketplace Seller;
- Supplier A;
- Supplier B;
- other authorised fulfiller.

A supplier operational order/reference is not a second customer-order truth.

## 11. Payment → supplier handshake

Canonical responsibility path:

customer order validation
→ reservation
→ payment evidence
→ supplier stock recheck
→ supplier price recheck when contract requires
→ supplier submission
→ acknowledgement
→ external supplier order reference
→ tracking/fulfilment
→ reconciliation.

Idempotency and lost-response recovery are required.

## 12. Financial architecture

ONE CANONICAL FINANCIAL TRUTH.

Dashboards, orders, admin, supplier operations and Stripe consumers read from/reconcile with canonical financial records; they do not independently reconstruct contradictory finance.

Key separation:
- customer price/charge;
- supplier product cost;
- supplier shipping cost;
- customer shipping charge;
- tax;
- processor fee;
- Loadify revenue/margin;
- supplier payable;
- refund;
- supplier recovery;
- chargeback;
- loss.

Fulfilment updates must not retrospectively mutate paid commercial truth.

## 13. Tracking

Supplier/carrier event
→ canonical shipment/fulfilment event
→ buyer-facing Loadify status.

Provider-specific statuses are mapped, not leaked into core lifecycle.

## 14. Returns and recovery

Buyer return/refund lifecycle and supplier recovery lifecycle are separate but linked.

Return destination may be supplier/fulfilment provider or another contract-defined destination. Do not assume Loadify warehouse.

## 15. Control Centre

Admin/Super Admin Supplier Control Centre ultimately needs governed visibility into:

- supplier registry/qualification;
- capabilities;
- compliance/provenance;
- offers/catalog sync;
- stock/price freshness;
- margin alerts;
- supplier submission/ack failures;
- tracking exceptions;
- returns/refunds/recovery;
- reconciliation;
- incidents;
- performance;
- kill switch.

Control Centre is a consumer/governor of canonical platform state, not a parallel business engine.