# PRODUCT-DIRECTION RECONCILIATION — 20 AUGUST 2026

Status: CONTROLLING PREPARATION OVERLAY / NO RUNTIME IMPLEMENTATION / NO MIGRATIONS / NO PRODUCTION CHANGES

Purpose: reconcile the existing Supplier Commerce preparation plan with the controlling canonical clarification merged to `main` on 20 August 2026 as `06_PRODUCT_DIRECTION_CLARIFICATION_2026-08-20.md`.

This file DOES NOT create a new plan, new phase, new architecture or new implementation lane.

It amends interpretation of the existing preparation files so that future implementation follows the current canonical product direction.

The implementation sequence remains:

FOUNDATION BASELINE FREEZE
→ GATE B BUSINESS CONTRACT
→ GATE B PASS
→ PHASE C → Q.

No Supplier Commerce migration before Gate B PASS.

## 1. Preparation documents remain valid unless explicitly clarified here

The existing documents `01` through `32` remain the prepared implementation plan.

This reconciliation closes omissions identified after the 20 August product-model review.

If an older preparation document is silent or ambiguous on a point covered here, THIS FILE controls the preparation interpretation together with the canonical contract on `main`.

If any preparation text conflicts with the canonical contract on `main`, the canonical contract wins.

## 2. Product direction is unchanged

Loadify Market remains a hybrid commerce platform:

MARKETPLACE
+
LOADIFY-OPERATED PRODUCT SOURCING / IMPORT
+
SUPPLIER-FULFILLED COMMERCE
+
PRODUCT DISCOVERY / OPPORTUNITY INTELLIGENCE
+
AI PRODUCT BUILDER / MERCHANDISING
+
CANONICAL COMMERCE CONTROL.

Supplier-Fulfilled commerce does not require a Loadify-owned warehouse or pre-purchased Loadify stock.

Approved suppliers/fulfilment providers may retain physical stock and ship directly to the buyer.

This does not remove Loadify responsibilities established by Gate B.

## 3. Existing Loadify site direction is preserved

Supplier Commerce EXTENDS Loadify Market. It does not redesign or replace it.

Existing visual identity, navigation logic and established Buyer/Seller/Admin/Super Admin/Workspace direction remain the baseline.

UI changes are permitted only where a new Supplier Commerce capability genuinely requires:

- a control;
- a status;
- a field;
- an evidence view;
- a workflow;
- an operational exception path;
- a compliance/safety action;
- a supplier/provider governance action.

Do not perform unrelated visual redesign while implementing Supplier Commerce.

Do not import visual direction from unrelated historical PRs.

Admin/Super Admin may receive necessary Supplier Commerce functions, but capability integration is not permission for unrelated visual redesign.

Every implementation PR must include a Branch Guard statement confirming whether it changed visual direction and why any visual change was required by the capability.

## 4. Provider role taxonomy is expanded

All preparation documents must interpret external roles as:

DISCOVERY SOURCE
≠ CATALOG SOURCE
≠ SUPPLIER
≠ FULFILMENT PROVIDER
≠ CARRIER
≠ SALES / CHANNEL CONNECTOR.

A provider may perform more than one role only when current official capability, permissions and commercial terms prove it.

TikTok, TikTok Shop, Amazon, Alibaba, AliExpress, Avasam, wholesalers, distributors, manufacturers and other networks remain provider candidates only.

No provider may become a commerce-core architecture type.

## 5. Provider/legal capability register is mandatory before implementation

Before a provider integration is considered implementation-ready, maintain a versioned capability record containing at least:

- provider name;
- role(s);
- territory;
- official documentation/source references;
- date verified;
- auth model;
- APIs/feeds/webhooks;
- catalog rights;
- media/content rights;
- stock semantics;
- price semantics;
- order capability;
- acknowledgement/idempotency semantics;
- cancellation capability;
- tracking capability;
- return/reimbursement capability;
- rate limits;
- prohibited/restricted use;
- commercial requirements;
- legal/compliance constraints;
- adapter version;
- monitoring owner;
- kill-switch path.

Stale provider assumptions are not production truth.

This requirement extends `08_SOURCE_AND_PROVIDER_CAPABILITY_CONTRACT.md`, `20_API_VERSIONING_AND_ADAPTER_INTERFACE_CONTRACT.md`, `31_IMPLEMENTATION_READINESS_MATRIX.md` and `32_VERTICAL_SLICE_ACCEPTANCE_EVIDENCE_MATRIX.md`.

## 6. Operator import remains governed

`10_OPERATOR_IMPORT_CONTRACT.md` remains valid.

The operator may source from manual entry, approved URL, feed, catalog, API or approved discovery source, but may not bypass:

SOURCE IDENTIFICATION
→ PRODUCT IDENTITY
→ SUPPLIER/FULFILMENT ROLE
→ NORMALISATION
→ CANONICAL MATCH/DEDUPLICATION
→ VARIANT MAPPING
→ SUPPLIER OFFER
→ PROVENANCE
→ CONTENT/IP RIGHTS
→ PRODUCT SAFETY/COMPLIANCE
→ STOCK ORIGIN
→ SHIPPING CAPABILITY
→ TRUE LANDED COST
→ TAX/VAT/CUSTOMS
→ MARGIN
→ AI MERCHANDISING
→ REVIEW
→ PUBLISH.

No `OWNER FOUND IT → DIRECT PRODUCT WRITE → PUBLISH` path is allowed.

## 7. Canonical product / supplier-offer routing is tightened

Existing invariant remains:

ONE FACTUAL CANONICAL PRODUCT
→ MULTIPLE SUPPLIER OFFERS.

Supplier selection may optimise for sellable stock, landed cost, SLA, delivery, risk, margin, geography, returns and compliance.

However fallback after customer commitment is allowed only if the replacement offer still satisfies the factual order promise, including where applicable:

- exact canonical product;
- exact variant;
- compliance equivalence;
- territory;
- delivery promise/tolerance;
- committed buyer price;
- return/support capability;
- origin/customs constraints.

No silent substitution of a merely similar product.

If no eligible offer exists, use canonical exception/cancellation/customer-remedy handling.

This extends `04_VERTICAL_SLICE_BACKLOG.md`, `08_SOURCE_AND_PROVIDER_CAPABILITY_CONTRACT.md`, `12_SUPPLIER_FULFILMENT_ORCHESTRATION_CONTRACT.md`, `15_SELLABILITY_STOCK_AND_PRICE_CONTRACT.md` and `32_VERTICAL_SLICE_ACCEPTANCE_EVIDENCE_MATRIX.md`.

## 8. Sellable stock remains distinct from supplier stock

SUPPLIER RAW STOCK
≠ LOADIFY SELLABLE STOCK.

Sellability must consider at minimum:

- supplier quantity;
- freshness;
- source confidence;
- reservations;
- regional shipping availability;
- exact variant availability;
- supplier/account health;
- compliance state;
- price/margin guard;
- provider incident/kill-switch state.

This remains part of Phase H, not a new phase.

## 9. AI Product Builder scope is expanded, Facts Lock is not weakened

`16_AI_FACTS_LOCK_AND_MERCHANDISING_CONTRACT.md` remains controlling for factual safety.

AI may assist with:

- titles;
- descriptions;
- benefits presentation;
- structured specifications;
- FAQ;
- SEO structure;
- category suggestions;
- variant presentation;
- comparison presentation;
- product-page structure;
- marketing copy;
- channel-specific ad copy;
- social captions;
- ad creative briefs/scripts;
- presentation/image enhancement where rights permit.

Absolute invariant:

VERIFIED FACT
→ AI PRESENTATION.

Never:

AI CLAIM
→ PRODUCT FACT.

No unsupported certification, safety, material, origin, warranty, compatibility, performance, environmental, medical, authenticity or delivery claims.

## 10. Commercial content / media / UGC rights are a hard publish gate

`14_COMPLIANCE_PROVENANCE_AND_RIGHTS_CONTRACT.md` must be interpreted to cover not only supplier images/copy but also external marketplace media, TikTok/social videos, UGC and ad creative.

Public visibility does not establish commercial reuse rights.

Commercial use must preserve sufficient rights evidence where required, including source, owner/licensor, commercial-use permission, modification permission where relevant, territory/channel obligations, attribution and expiry/revocation where relevant.

No required rights evidence → asset not publishable.

## 11. Review/rating provenance is mandatory

External marketplace reviews/ratings must never be presented as Loadify customer reviews unless they are factually Loadify customer reviews.

Review presentation must retain source/provenance classification.

Never transform an external rating/review count into a Loadify rating/review count.

Fake-review prevention, moderation and source disclosure must be part of consumer-protection acceptance evidence.

This requirement maps into Phase F merchandising/review governance and Phase Q hardening. It does not create a new phase.

## 12. Price transparency is part of canonical pricing truth

Customer pricing must not be designed around hidden mandatory fees that appear only late in checkout to make earlier displayed prices look lower.

Architecture must distinguish:

- base merchandise price;
- mandatory fees;
- shipping;
- taxes/VAT;
- customs/import amounts where relevant;
- genuinely optional add-ons.

Buyer-facing totals must consume canonical pricing truth rather than independently reconstructing totals across pages.

This extends Phase G and final hardening.

## 13. Tax/VAT/customs must be consignment-aware

`22_TAX_VAT_CUSTOMS_RULE_VERSIONING_CONTRACT.md` must support shipment/consignment context, not merely item-level tax.

Model must be capable of considering as applicable:

- stock location at point of sale;
- customer destination/jurisdiction;
- seller/business establishment;
- B2B/B2C status;
- verified VAT data where relevant;
- consignment grouping;
- intrinsic consignment value;
- applicable thresholds/rules;
- restricted/excise category;
- import VAT/customs responsibility;
- marketplace VAT liability where applicable;
- invoice evidence;
- rule version/effective date.

For multi-leg orders preserve the relationship:

CUSTOMER ORDER
↔ FULFILMENT LEG
↔ CONSIGNMENT
↔ TAX/CUSTOMS EVIDENCE.

Do not infer a multi-item order tax result from one line item.

## 14. Digital-platform seller reporting/due diligence is explicit

Gate B must determine whether and how Loadify is a UK reporting platform operator for each relevant activity.

Where applicable, platform/seller governance must support canonical evidence for:

- seller identity collection;
- seller verification;
- reportable/excluded classification;
- transaction/payment totals;
- platform fees/commissions/taxes;
- payout/bank-account evidence where required;
- reporting period/filing status;
- seller copy of reported data;
- corrections and audit history.

Do not build a second reporting ledger. Reporting must derive from canonical transaction/financial truth.

This maps to Gate B, Phase C governance, Phase G financial truth and Phase Q hardening.

## 15. Product safety includes post-publication incident/recall governance

`14_COMPLIANCE_PROVENANCE_AND_RIGHTS_CONTRACT.md`, `18_SUPPLIER_QUALIFICATION_SLA_AND_RISK_CONTRACT.md` and `24_SUPPLIER_CONTROL_CENTRE_GOVERNANCE_CONTRACT.md` must include operational readiness for, as applicable:

- manufacturer/importer/responsible-operator evidence;
- category-specific compliance evidence;
- markings/instructions/warnings;
- product risk classification;
- safety incidents/complaints;
- recall/withdrawal state;
- regulator requests;
- supplier/product suspension;
- buyer-order traceability for affected variants;
- customer notification where required;
- evidence retention;
- emergency kill switch.

Current law/regulation must be reverified at rollout. Do not treat a proposal/consultation as an operative duty unless enacted/in force.

## 16. External sales channels are a separate integration family

If Loadify later publishes/synchronises products or receives orders through TikTok Shop or another external sales channel, treat it as:

LOADIFY CANONICAL CATALOG / COMMERCE
↔ SALES CHANNEL CONNECTOR.

A channel may expose listing, inventory, order, fulfilment, refund or finance capabilities, but it never becomes the canonical Loadify product/order/payment ledger.

This preparation update does not authorise a specific channel integration now.

## 17. Gate B decisions added by 20 August clarification

Gate B must explicitly resolve, in addition to the existing pack:

1. customer-facing meaning of Marketplace Seller, Loadify Supplier-Fulfilled and Loadify Direct if retained;
2. seller of record / merchant of record / invoice issuer / payment recipient for each mode;
3. stock owner and fulfilment provider;
4. required customer disclosure of seller, fulfiller, dispatch origin and return path;
5. product liability / recall / safety-incident ownership;
6. UK digital-platform reporting applicability/responsibility;
7. VAT/customs ownership for domestic, overseas-stock and multi-consignment cases;
8. mandatory-fee and shipping price-transparency contract;
9. review/rating provenance and moderation;
10. content/image/video/UGC licensing evidence standard;
11. supplier substitution/fallback after purchase;
12. supplier cancellation/non-acknowledgement/stock mismatch/customer remedy;
13. provider capability verification and re-verification cadence;
14. external sales-channel boundary if introduced;
15. operator authority to source, approve, publish, suspend, recall and kill products/suppliers/providers.

Gate B PASS requires explicit answers, not assumptions.

## 18. Mapping to existing slices — no new phases

These additions map into the existing plan:

- Gate B → responsibility, seller/MoR, tax ownership, disclosures, reporting applicability, review/price/rights responsibility;
- C1 → provider/legal capability register, feature flags, observability, incidents, retention, kill/recovery foundations;
- D1/D2 → provider roles, supplier qualification, SLA, provenance, compliance and adapters;
- E1/E2 → canonical product, multiple offers, deduplication;
- F1/F2 → governed import, rights, review provenance, AI Facts Lock, merchandising;
- G1/G2 → consignment-aware landed cost/tax/customs, price transparency, financial/reporting evidence;
- H1/H2 → sellable stock, freshness, price/margin guards;
- I1/I2/J1 → offer routing, reservation, supplier acknowledgement, fallback/exception handling, idempotency/reconciliation;
- K1/K2/L1/L2 → tracking, exceptions, returns, refunds, supplier recovery/customer remedy;
- M1 → supplier/provider control, safety incidents, recall/suspension, capability health, kill switches;
- N1/O1/P1/Q1 → simulator, pilot, controlled scale, full revalidation and production hardening.

Product Discovery remains the existing parallel track and begins only after canonical supplier data exists.

## 19. Readiness / acceptance additions

No capability is IMPLEMENTATION READY or PASS merely because:

- a provider has an API;
- a product is publicly visible;
- an external rating exists;
- an image/video can technically be downloaded;
- a supplier reports stock;
- AI can generate a product page;
- a tax formula works for one item;
- a channel connector returns an order.

Relevant readiness/PASS evidence must additionally prove, where applicable:

- provider capability record is current;
- rights provenance is valid;
- review provenance is truthful;
- price disclosure is compliant with the Gate B contract;
- consignment-aware tax evidence exists;
- supplier fallback cannot violate customer promise;
- safety incident/recall controls exist;
- digital-platform reporting data derives from canonical truth;
- no unrelated site visual direction was changed.

## 20. Final guard

NO PARALLEL MARKETPLACE ARCHITECTURE.
NO PARALLEL ORDER TRUTH.
NO PARALLEL PAYMENT TRUTH.
NO PARALLEL FINANCIAL TRUTH.
NO PROVIDER-SPECIFIC COMMERCE CORE.
NO OWNER PUBLISH BYPASS.
NO DISCOVERY AUTO-PUBLISH.
NO AI-INVENTED FACTS.
NO UNLICENSED COMMERCIAL CONTENT ASSUMPTION.
NO REVIEW LAUNDERING.
NO DRIP-PRICE DESIGN.
NO RAW-SUPPLIER-STOCK = SELLABLE-STOCK ASSUMPTION.
NO SILENT NON-EQUIVALENT SUPPLIER SUBSTITUTION.
NO TAX RESULT FROM PRICE ALONE.
NO PARALLEL REPORTING LEDGER.
NO PRODUCT-SAFETY CHECKBOX WITHOUT INCIDENT/RECALL GOVERNANCE.
NO PROVIDER CAPABILITY IMPLEMENTED FROM MEMORY.
NO UNRELATED VISUAL REDESIGN UNDER SUPPLIER COMMERCE SCOPE.

This file is preparation alignment only. Runtime execution remains blocked until Gate B PASS.