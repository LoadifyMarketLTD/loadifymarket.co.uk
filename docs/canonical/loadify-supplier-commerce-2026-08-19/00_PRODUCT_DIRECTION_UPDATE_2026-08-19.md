# LOADIFY SUPPLIER COMMERCE
# CANONICAL EXECUTION CONTRACT — PRODUCT-DIRECTION UPDATE 2026-08-19

> This file contains a controlling product-direction clarification agreed on 19 August 2026. It DOES NOT create a parallel plan and DOES NOT alter the execution sequence. It clarifies business intent that must be formalised at Gate B and implemented only in the phases already defined by the contract.

======================================================================
0A. CANONICAL PRODUCT-DIRECTION CLARIFICATION — 2026-08-19
======================================================================

STATUS:

CONTROLLING BUSINESS-INTENT CLARIFICATION.

This clarification:

- DOES NOT replace the Canonical Execution Contract;
- DOES NOT create a parallel architecture;
- DOES NOT authorise Supplier Commerce migrations before Gate B PASS;
- DOES NOT authorise Product Discovery before canonical supplier data exists;
- DOES NOT weaken any existing security, financial, privacy, E2E, Branch Guard or No Fake PASS gate;
- MUST be integrated into Gate B and the existing Phases C → Q.

The target product is:

LOADIFY MARKET
=
MARKETPLACE
+
LOADIFY-OPERATED PRODUCT SOURCING / IMPORT
+
SUPPLIER-FULFILLED COMMERCE
+
PRODUCT DISCOVERY / OPPORTUNITY INTELLIGENCE
+
CANONICAL COMMERCE CONTROL.

Loadify is not a simple dropshipping website and must not be modelled as a clone of AliExpress, DSers, AutoDS, PagePilot, TikTok Shop, Amazon or any other provider.

Loadify controls its own canonical commercial truth.

======================================================================
0A.1 TARGET OPERATING MODEL — NO LOADIFY PHYSICAL WAREHOUSE
======================================================================

The target Supplier Commerce model DOES NOT REQUIRE and DOES NOT OPERATE a Loadify-owned physical warehouse.

The intended supplier-fulfilled path is:

LOADIFY SOURCES / APPROVES PRODUCT
→ LOADIFY PUBLISHES PRODUCT
→ CUSTOMER BUYS IN LOADIFY
→ LOADIFY ORCHESTRATES ORDER
→ APPROVED SUPPLIER / FULFILMENT PROVIDER HOLDS THE STOCK
→ APPROVED SUPPLIER / FULFILMENT PROVIDER SHIPS DIRECTLY TO CUSTOMER
→ LOADIFY CONTROLS CUSTOMER-FACING ORDER, TRACKING, SUPPORT, RETURNS, REFUNDS AND FINANCIAL RECONCILIATION ACCORDING TO THE BUSINESS CONTRACT.

Therefore, do NOT design Supplier Commerce around mandatory:

- Loadify warehouse ownership;
- Loadify inbound receiving;
- Loadify physical picking/packing;
- Loadify-owned stock storage;
- Loadify warehouse transfer flows;
- Loadify physical inventory operations.

Supplier warehouse/origin may still be relevant for qualification, shipping, compliance, SLA, tax/customs and risk.

If a future business decision explicitly introduces a Loadify physical-warehouse model, that is a NEW BUSINESS DECISION and must not be inferred from this contract.

======================================================================
0A.2 LOADIFY OPERATOR MUST BE ABLE TO SOURCE / IMPORT PRODUCTS
======================================================================

Loadify itself is an active commerce operator, not only a passive host for marketplace sellers.

An authorised Loadify operator / Admin / Super Admin, according to the final permission contract, must be able to source or import a product candidate discovered externally and bring it into the canonical Loadify pipeline.

This is NOT an owner bypass around the canonical product system.

The operator path must converge into the same canonical controls as every approved import:

MANUAL PRODUCT / URL / FEED / CATALOG / APPROVED SOURCE
→ EXTRACT
→ IDENTIFY PRODUCT
→ IDENTIFY SOURCE / SUPPLIER
→ NORMALIZE
→ MATCH EXISTING CANONICAL PRODUCT OR CREATE CANDIDATE
→ MAP VARIANTS
→ ATTACH / CREATE SUPPLIER OFFER
→ PROVENANCE
→ RIGHTS
→ COMPLIANCE
→ TRUE LANDED COST
→ MARGIN
→ AI PRODUCT BUILDER / MERCHANDISING
→ REVIEW
→ PUBLISH.

DO NOT implement:

OWNER URL
→ DIRECT WRITE TO `products`
→ PUBLISH.

The owner/operator has operational authority, but canonical product identity, provenance, rights, compliance, supplier mapping, cost and audit requirements still apply.

======================================================================
0A.3 EXTERNAL ECOSYSTEM ROLES MUST BE SEPARATED
======================================================================

External ecosystems may be used for different purposes.

Keep these concepts separate:

DISCOVERY SOURCE
≠
CATALOG SOURCE
≠
SUPPLIER
≠
FULFILMENT PROVIDER.

A provider may fulfil one or more roles, but the role must be established factually from actual capabilities, permissions, contracts and current provider rules.

Examples are BUSINESS-DIRECTION examples only, not hardcoded implementation commands:

- TikTok may be a discovery / trend / market-intelligence source;
- Amazon may be a discovery / market-intelligence / catalog reference source where lawful and technically permitted;
- Alibaba / AliExpress may be catalog / supplier / fulfilment sources where lawful, contractually valid and technically supported;
- wholesalers, distributors and manufacturers may be supplier / catalog / fulfilment sources;
- supplier feeds and manual URLs may be ingestion sources.

DO NOT assume that an external marketplace is automatically the supplier of record.

DO NOT implement provider capabilities from memory.

For every external source/provider:

VERIFY CURRENT OFFICIAL API / POLICY / RIGHTS / COMMERCIAL TERMS
→ MAP ACTUAL CAPABILITIES
→ ADAPTER / CONNECTOR
→ CANONICAL LOADIFY CONTRACT.

======================================================================
0A.4 DISCOVERY CONNECTORS ARE DISTINCT FROM SUPPLIER ADAPTERS
======================================================================

The architecture may require two distinct integration families:

A. DISCOVERY / PRODUCT-INTELLIGENCE CONNECTORS

Used to identify:

- demand;
- trend;
- engagement;
- competition;
- opportunity;
- candidate products;
- candidate sources.

B. SUPPLIER / FULFILMENT ADAPTERS

Used for operational commerce capabilities such as:

- supplier identity;
- catalog;
- variants;
- stock;
- price;
- shipping;
- order submission;
- acknowledgement;
- tracking;
- cancellation;
- returns;
- reimbursement.

Do not merge these responsibilities merely because one provider can supply both kinds of data.

Commerce core remains provider-independent.

======================================================================
0A.5 ONE CANONICAL PRODUCT → MULTIPLE SUPPLIER OFFERS
======================================================================

If the same factual product is found on multiple external ecosystems or from multiple suppliers, the target model is:

ONE LOADIFY CANONICAL PRODUCT
→ MULTIPLE SUPPLIER OFFERS.

Do not create duplicate Loadify products merely because:

- the source URL differs;
- the marketplace differs;
- the supplier differs;
- the AI title differs;
- the marketing copy differs.

Canonical identity must follow the existing Catalog Identity / Canonicalisation rules.

A Supplier Offer represents supplier-specific commercial/operational truth such as cost, stock, shipping, SLA, source and fulfilment capability.

The Canonical Product represents verified product identity/facts.

======================================================================
0A.6 PRODUCT DISCOVERY PURPOSE
======================================================================

Product Discovery / Opportunity Intelligence is strategically the engine by which Loadify can identify what may be worth selling.

It may evaluate, where legitimate data exists:

- demand;
- trends;
- competition;
- conversion signals;
- supplier availability;
- supplier reliability;
- landed cost;
- expected contribution;
- delivery;
- return risk;
- compliance risk;
- stock stability;
- price stability;
- seasonality.

Discovery remains RECOMMENDATION ONLY.

It does NOT auto-publish.

It is NOT a hard dependency for Supplier Commerce.

It MUST NOT block the commerce engine.

Per the existing phase sequence, Product Discovery may begin only after canonical supplier data exists and then evolve in parallel.

======================================================================
0A.7 AI PRODUCT BUILDER / MERCHANDISING
======================================================================

PagePilot-like functionality is interpreted as an internal Loadify capability:

AI PRODUCT BUILDER / MERCHANDISING.

It is not the architecture of Supplier Commerce and must not become a structural dependency on PagePilot.

This capability may assist with:

- product title;
- description;
- benefits presentation;
- SEO structure;
- page structure;
- FAQ;
- merchandising copy;
- variant presentation;
- marketing content;
- presentation improvements.

It remains fully subject to AI FACTS LOCK.

VERIFIED FACTS
→ AI PRESENTATION / COPY.

Never:

AI INVENTION
→ PRODUCT FACT.

======================================================================
0A.8 BUYER MUST REMAIN INSIDE LOADIFY
======================================================================

The target customer experience is:

LOADIFY PRODUCT
→ LOADIFY CART
→ LOADIFY CHECKOUT
→ LOADIFY PAYMENT
→ LOADIFY CUSTOMER ORDER
→ LOADIFY TRACKING EXPERIENCE
→ LOADIFY SUPPORT
→ LOADIFY RETURN / REFUND EXPERIENCE.

Do not design Supplier Commerce as a redirect engine that sends the buyer to an external marketplace to complete the purchase.

The supplier / fulfilment provider may operate behind the Loadify orchestration boundary, but the customer-facing commercial experience remains Loadify according to the Gate B business/legal contract.

======================================================================
0A.9 EXISTING CORE INVARIANTS REMAIN CONTROLLING
======================================================================

These remain mandatory:

ONE CUSTOMER ORDER.

Internally:

MULTIPLE FULFILMENT LEGS MAY EXIST.

ONE CANONICAL FINANCIAL TRUTH.

CANONICAL PRODUCT
≠
SUPPLIER OFFER.

SUPPLIER RAW STOCK
≠
LOADIFY SELLABLE STOCK.

PAYMENT SUCCESS
≠
SUPPLIER ORDER SUCCESS.

CUSTOMER REFUND
≠
SUPPLIER RECOVERY.

ORDER COMPLETED
≠
FINANCIALLY RECONCILED.

NO PARALLEL MARKETPLACE ARCHITECTURE.
NO PARALLEL ORDER TRUTH.
NO PARALLEL PAYMENT TRUTH.
NO PARALLEL FINANCIAL TRUTH.
NO PROVIDER-SPECIFIC COMMERCE CORE.

======================================================================
0A.10 GATE B MUST FORMALISE THIS CLARIFICATION
======================================================================

At Gate B, explicitly formalise how the clarified target model applies to:

1. MARKETPLACE SELLER
2. LOADIFY DIRECT, where applicable without implying a Loadify warehouse
3. LOADIFY SUPPLIER-FULFILLED.

Gate B must determine, from current law/business reality and official sources where required:

- seller of record;
- merchant of record where relevant;
- supplier;
- fulfilment provider;
- stock owner;
- who ships directly to customer;
- invoice issuer;
- payment flow;
- platform fee;
- supplier payable;
- VAT/tax/customs responsibility;
- refund responsibility;
- return responsibility;
- chargeback responsibility;
- product liability responsibility;
- support responsibility;
- fulfilment ownership;
- customer-facing disclosure requirements;
- operator import authority and governance.

Do not infer these legal/fiscal answers from the phrase “supplier-fulfilled”.

Use current official sources for volatile legal, fiscal and provider rules.

======================================================================
0A.11 EXECUTION SEQUENCE IS UNCHANGED
======================================================================

CURRENT ORDER REMAINS:

CRITICAL FOUNDATION
→ CHECKPOINT A
→ CHECKPOINT A ATOMIC PASS WITH REAL EVIDENCE
→ FOUNDATION BASELINE FREEZE
→ HARD STOP OLD EXTENSIVE HARDENING
→ GATE B BUSINESS CONTRACT
→ GATE B PASS
→ PHASE C
→ PHASE D
→ PHASE E CANONICAL SUPPLIER DATA
→ PRODUCT DISCOVERY MAY BEGIN IN PARALLEL
→ CONTINUE PHASES F → Q
→ SIMULATOR
→ PILOT
→ CONTROLLED SCALE
→ FINAL FULL-PRODUCT HARDENING.

NO Supplier Commerce migration before Gate B PASS.

Do NOT use this clarification as permission to jump from Checkpoint A directly into TikTok/Amazon/Alibaba/AliExpress integrations.

Do NOT hardcode any provider before the relevant contract/capability is verified.

======================================================================
0A.12 FINAL PRODUCT INTENT
======================================================================

Loadify Market must become a commerce operating system in which:

- independent marketplace sellers can sell;
- Loadify can source/import products as an operator;
- approved external suppliers can fulfil directly to customers without a Loadify physical warehouse;
- the same factual product can have multiple supplier offers;
- Loadify can discover commercial opportunities across legitimate external sources;
- AI can build professional merchandising from verified facts;
- Loadify controls canonical catalog, checkout, customer order, payment truth, risk, fulfilment orchestration, tracking, returns/refunds, supplier recovery, finance, customer experience and governance.

This clarification is a refinement of the existing contract, not a replacement architecture.
