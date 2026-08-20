# LOADIFY SUPPLIER COMMERCE
# CANONICAL EXECUTION CONTRACT — PRODUCT-DIRECTION CLARIFICATION 2026-08-20

> Controlling clarification produced after re-checking the canonical contract against the 20 August 2026 product-model discussion and current UK marketplace obligations. This document does NOT create a parallel plan, does NOT reopen general planning, does NOT weaken the Foundation Baseline Freeze, and does NOT authorise Supplier Commerce runtime/schema/provider implementation before Gate B PASS.

======================================================================
0B. STATUS AND PRECEDENCE
======================================================================

STATUS:

CONTROLLING BUSINESS/PRODUCT CLARIFICATION FOR GATE B AND EXISTING PHASES C → Q.

This clarification:

- supplements `00_PRODUCT_DIRECTION_UPDATE_2026-08-19.md`;
- preserves the original 2210-line Canonical Execution Contract;
- preserves the 20 August 2026 Foundation Baseline Freeze;
- does not create a new architecture or implementation lane;
- does not change the mandatory execution order;
- does not authorise provider-specific code before the relevant gate and capability verification;
- must be resolved through Gate B and the already-defined vertical slices in Phases C → Q.

The current sequence remains:

FOUNDATION BASELINE FREEZE
→ GATE B BUSINESS CONTRACT
→ GATE B PASS
→ PHASE C → Q.

No Supplier Commerce migration before Gate B PASS.

======================================================================
0B.1 TARGET MODEL REMAINS HYBRID COMMERCE, NOT SIMPLE DROPSHIPPING
======================================================================

Loadify Market remains:

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

Loadify may operate without owning a physical warehouse or pre-purchasing physical stock.

Approved supplier / fulfilment-provider stock may remain outside Loadify custody and ship directly to the buyer.

However:

NO LOADIFY WAREHOUSE
≠
NO LOADIFY RESPONSIBILITY.

Gate B must establish the exact legal/commercial responsibility model for each operating mode before implementation.

======================================================================
0B.2 OPERATING MODES MUST REMAIN EXPLICIT
======================================================================

Gate B must formalise at minimum these distinct modes:

1. MARKETPLACE SELLER
   - independent seller lists and sells through Loadify;
   - seller/merchant/platform roles must be explicit.

2. LOADIFY SUPPLIER-FULFILLED
   - Loadify sources/approves and publishes the product under the business model approved at Gate B;
   - approved supplier/fulfilment provider holds stock and ships direct to customer;
   - Loadify orchestrates the customer-facing commerce boundary according to the approved contract.

3. LOADIFY DIRECT, only if Gate B gives that label a precise legal/commercial meaning.
   - the label MUST NOT imply Loadify warehouse ownership;
   - it MUST NOT be used as marketing shorthand before seller-of-record, merchant-of-record, invoice, VAT, returns, product-liability and fulfilment responsibilities are resolved.

Do not infer responsibility from UI labels.

======================================================================
0B.3 OWNER / OPERATOR SOURCING IS GOVERNED, NOT A BYPASS
======================================================================

An authorised Loadify operator may discover or source a candidate from:

- manual entry;
- approved URL ingestion;
- supplier feed;
- supplier catalog;
- approved API;
- approved discovery source;
- approved importer/catalog integration.

The operator may initiate the pipeline but may not bypass it.

MANDATORY CONVERGENCE:

CANDIDATE
→ SOURCE IDENTIFICATION
→ PRODUCT IDENTITY
→ SUPPLIER / FULFILMENT ROLE IDENTIFICATION
→ NORMALISATION
→ CANONICAL MATCH / DEDUPLICATION
→ VARIANT MAPPING
→ SUPPLIER OFFER
→ PROVENANCE
→ CONTENT / IMAGE / IP RIGHTS
→ PRODUCT SAFETY / COMPLIANCE
→ STOCK ORIGIN
→ SHIPPING CAPABILITY
→ TRUE LANDED COST
→ TAX / VAT / CUSTOMS RULE
→ MARGIN
→ AI MERCHANDISING
→ REVIEW
→ PUBLISH.

Never:

OWNER FOUND IT
→ DIRECT PRODUCT WRITE
→ PUBLISH.

======================================================================
0B.4 PROVIDER ROLE MATRIX IS EXPANDED
======================================================================

Keep these provider roles separate:

DISCOVERY SOURCE
≠ CATALOG SOURCE
≠ SUPPLIER
≠ FULFILMENT PROVIDER
≠ CARRIER
≠ SALES / CHANNEL CONNECTOR.

A provider may perform more than one role, but each role requires separate factual capability, permission and contractual verification.

Examples such as TikTok, TikTok Shop, Amazon, Alibaba, AliExpress, Avasam, wholesalers, distributors, manufacturers, feeds or other networks are PROVIDER CANDIDATES ONLY.

Do not hardcode a provider from reputation, screenshots, memory or marketing claims.

For every provider and every role:

CURRENT OFFICIAL CAPABILITY
→ CURRENT API / FEED / WEBHOOK CONTRACT
→ CURRENT COMMERCIAL TERMS
→ DATA / CONTENT RIGHTS
→ RATE LIMITS / AUTH
→ ORDER / STOCK / PRICE / TRACKING SEMANTICS
→ RETURNS / CANCELLATION / REIMBURSEMENT CAPABILITY
→ LEGAL / TERRITORY RESTRICTIONS
→ VERSIONED LOADIFY ADAPTER
→ MONITORING
→ KILL SWITCH.

Provider policy/API changes must be treated as operational risk, not as static assumptions.

======================================================================
0B.5 DISCOVERY MUST NOT BE CONFUSED WITH CATALOG OR FULFILMENT
======================================================================

Product Discovery may identify:

- trend;
- demand signals;
- engagement;
- competition;
- candidate product;
- candidate supplier;
- candidate market;
- opportunity score.

Discovery data is recommendation evidence only.

It does not prove:

- supplier legitimacy;
- product identity;
- stock availability;
- rights to images/content;
- compliance;
- deliverability;
- landed cost;
- margin;
- consumer-review authenticity.

Discovery must never auto-publish.

======================================================================
0B.6 CANONICAL PRODUCT AND MULTIPLE SUPPLIER OFFERS — ROUTING RULE
======================================================================

The existing invariant remains:

ONE FACTUAL CANONICAL PRODUCT
→ MULTIPLE SUPPLIER OFFERS.

Supplier selection/routing may optimise for:

- sellable stock;
- landed cost;
- delivery promise;
- supplier SLA;
- supplier risk;
- margin;
- geography;
- return capability;
- compliance state.

However supplier fallback MUST NOT silently change the factual customer promise.

A fallback offer is eligible only when the selected offer still satisfies the order contract, including where applicable:

- exact canonical product;
- exact variant;
- required compliance;
- delivery region;
- delivery promise/tolerance;
- customer-visible price already committed;
- return/support capability;
- any origin/customs constraints defined by Gate B.

If no eligible offer exists:

DO NOT SILENTLY SUBSTITUTE.

Use the canonical exception / cancellation / customer-remedy path.

======================================================================
0B.7 STOCK TRUTH MUST BE SELLABLE-STOCK TRUTH
======================================================================

SUPPLIER RAW STOCK
≠ LOADIFY SELLABLE STOCK.

Sellability must consider more than supplier quantity.

At minimum:

supplier quantity
+ freshness timestamp
+ source confidence
+ reservation state
+ regional shipping availability
+ variant availability
+ supplier/account health
+ compliance state
+ pricing/margin guard
+ provider incident/kill switch
→ LOADIFY SELLABLE STOCK.

Stale supplier inventory must fail safely according to the Phase H contract.

No Loadify-owned warehouse is required for this invariant.

======================================================================
0B.8 AI PRODUCT BUILDER IS EXPANDED BUT REMAINS FACT-LOCKED
======================================================================

AI Product Builder / Merchandising may assist with:

- product title;
- short/long description;
- benefits presentation;
- specifications formatting;
- FAQ;
- SEO title/meta structure;
- category suggestions;
- variant presentation;
- comparison presentation;
- product-page structure;
- marketing copy;
- channel-specific ad copy;
- social captions;
- ad creative briefs/scripts;
- presentation/image enhancement where rights permit.

AI FACTS LOCK remains absolute:

VERIFIED FACT
→ AI PRESENTATION.

Never:

AI CLAIM
→ PRODUCT FACT.

AI must not invent or imply unsupported claims such as certification, safety, materials, origin, warranty, compatibility, performance, environmental claims, medical claims, authenticity or delivery promises.

AI-generated marketing content remains subject to the same rights, consumer-protection, pricing and review-provenance rules as the product page.

======================================================================
0B.9 CONTENT, MEDIA AND UGC RIGHTS ARE A HARD PUBLISHING GATE
======================================================================

External product pages, TikTok/social videos, marketplace images, reviews and ad creatives are not assumed reusable merely because they are publicly visible.

For every externally sourced content asset used commercially, Loadify must retain sufficient evidence of:

- source;
- owner/licensor where relevant;
- permitted commercial use;
- permitted modification/derivative use where relevant;
- permitted territory/channel where relevant;
- attribution obligations where relevant;
- expiry/revocation where relevant.

No rights evidence where rights are required
→ asset not publishable.

Discovery/reference use and commercial republication are separate permissions.

======================================================================
0B.10 REVIEW / RATING PROVENANCE — NO REVIEW LAUNDERING
======================================================================

External marketplace ratings/reviews MUST NOT be presented as Loadify customer reviews unless they are factually Loadify customer reviews.

Review records/content shown to buyers must preserve provenance such as:

- Loadify verified purchase review;
- seller-provided testimonial, where lawful and clearly identified;
- licensed external review source, only where current terms and law permit and source is disclosed;
- other explicitly classified evidence approved by the business/legal contract.

Never convert:

EXTERNAL 4.9 RATING / 9,658 REVIEWS
→ LOADIFY 4.9 RATING / 9,658 REVIEWS.

Fake-review prevention, review suppression/moderation and review-source disclosure must be included in consumer-protection governance.

======================================================================
0B.11 PRICE TRANSPARENCY — NO DRIP-PRICE ARCHITECTURE
======================================================================

The customer-facing price contract must support current UK consumer-protection requirements.

Mandatory fees, taxes and charges that can be calculated in advance must not be intentionally withheld merely to make an earlier displayed price appear lower.

Architecture must distinguish:

- base merchandise price;
- mandatory fees;
- shipping;
- taxes/VAT;
- customs/import amounts where the business model makes them relevant;
- optional add-ons requiring genuine customer choice.

Gate B must determine the customer-facing disclosure contract for each operating mode and territory.

Pricing UI must consume canonical pricing truth rather than reconstructing totals independently in multiple surfaces.

======================================================================
0B.12 CONSIGNMENT-AWARE VAT / CUSTOMS ENGINE
======================================================================

The existing Tax/VAT/Customs work in Phase G must explicitly support shipment/consignment context rather than only per-product or per-line tax.

For UK flows, the model must be capable of evaluating, as applicable:

- stock location at point of sale;
- customer destination/jurisdiction;
- seller/business establishment;
- customer B2B/B2C status and verified VAT details where relevant;
- consignment grouping;
- intrinsic consignment value;
- applicable thresholds/rules;
- excise/restricted category status;
- import VAT/customs responsibility;
- marketplace VAT liability where applicable;
- invoice evidence;
- rule version/effective date.

The system MUST NOT assume that the VAT/customs outcome for one item is sufficient for a multi-item order.

Order split / multi-fulfilment-leg design must preserve the factual relationship between CUSTOMER ORDER, FULFILMENT LEG, CONSIGNMENT and TAX/CUSTOMS EVIDENCE.

Tax/legal rules are versioned external truth and require current-source verification before rollout.

======================================================================
0B.13 DIGITAL PLATFORM SELLER REPORTING / DUE DILIGENCE
======================================================================

Gate B and subsequent platform-control work must explicitly determine whether and how Loadify is a UK reporting platform operator for each relevant activity.

Where applicable, seller governance must support current HMRC digital-platform reporting requirements, including the ability to:

- collect required seller identity information;
- verify required seller information;
- classify reportable/excluded sellers according to current rules;
- retain the evidence required by the reporting contract;
- calculate reportable transaction/payment totals and relevant fees/commissions/taxes;
- associate payout/bank-account evidence where required;
- generate/export the required reporting dataset/schema;
- track reporting periods and filing status;
- provide sellers with the required copy of reported information;
- preserve corrections/audit history.

This is not merely a year-end manual admin task.

If legally applicable, the data model must be capable of producing the report from canonical transaction/financial truth.

Do not create a second reporting ledger.

======================================================================
0B.14 PRODUCT SAFETY / RECALL / MARKET-SURVEILLANCE READINESS
======================================================================

Product compliance must include operational post-publication safety governance, not only a pre-publish certificate checkbox.

The platform must be able to support, as applicable:

- manufacturer/importer/responsible-operator identity evidence;
- category-specific compliance evidence;
- required marking/instructions/warnings evidence;
- product risk classification;
- safety incident/complaint recording;
- recall/withdrawal state;
- authority/regulator requests;
- supplier/product suspension;
- buyer-order traceability for affected products/variants;
- customer notification where required;
- evidence retention;
- emergency kill switch.

Because UK online-marketplace product-safety responsibilities are an evolving regulatory area, the exact legal duties must be checked against current law/regulations before each relevant rollout gate.

Do not freeze a 2026 consultation/proposal as if it were already a final operative duty unless enacted/in force.

======================================================================
0B.15 CUSTOMER EXPERIENCE REMAINS LOADIFY-CENTRIC
======================================================================

The buyer remains inside the Loadify customer journey:

LOADIFY PRODUCT
→ LOADIFY CART
→ LOADIFY CHECKOUT
→ LOADIFY PAYMENT
→ LOADIFY CUSTOMER ORDER
→ LOADIFY TRACKING
→ LOADIFY SUPPORT
→ LOADIFY RETURN / REFUND EXPERIENCE.

Supplier/fulfilment systems operate behind the orchestration boundary.

Where law/business contract requires disclosure of the actual seller, fulfiller, dispatch origin, return location or other material information, Loadify must disclose it accurately without breaking canonical order truth.

Supplier fulfilment is not permission to misrepresent who is selling or fulfilling the product.

======================================================================
0B.16 EXTERNAL SALES CHANNELS ARE A DISTINCT FUTURE INTEGRATION FAMILY
======================================================================

If Loadify later publishes/synchronises products or receives orders through external sales channels, treat this as a distinct integration family:

LOADIFY CANONICAL CATALOG / COMMERCE
↔ SALES CHANNEL CONNECTOR.

A sales-channel connector must not become the canonical product/order/payment ledger.

Channel APIs may provide:

- listing publication/sync;
- channel inventory exposure;
- channel orders;
- channel fulfilment/tracking updates;
- channel refunds/cancellations;
- channel finance evidence;
- webhooks.

Actual capability depends on current provider terms/API permissions and must be verified before implementation.

This clarification does NOT authorise a TikTok Shop, Amazon or other channel implementation now.

======================================================================
0B.17 PROVIDER / LEGAL CAPABILITY REGISTER
======================================================================

Before each provider integration becomes implementation-ready, maintain a versioned capability record containing at minimum:

- provider name;
- role(s);
- territory;
- official documentation/source reference;
- date verified;
- authentication model;
- available APIs/feeds/webhooks;
- catalog rights;
- media/content rights;
- inventory semantics;
- pricing semantics;
- order capability;
- cancellation capability;
- tracking capability;
- returns/reimbursement capability;
- rate limits;
- prohibited/restricted use;
- commercial requirements;
- legal/compliance constraints;
- adapter version;
- monitoring owner;
- kill-switch path.

Stale provider assumptions must not silently become production truth.

======================================================================
0B.18 GATE B ADDITIONAL REQUIRED DECISIONS
======================================================================

In addition to the existing Gate B list, explicitly resolve:

1. Exact meaning and permissible customer-facing use of:
   - Marketplace Seller;
   - Loadify Supplier-Fulfilled;
   - Loadify Direct, if retained.

2. Seller of record / merchant of record / invoice issuer / payment recipient for every mode.

3. Stock owner and fulfilment provider for every mode.

4. Customer-facing disclosure of seller, fulfiller, dispatch origin and returns path where required.

5. Product liability / recall / safety-incident responsibility and escalation.

6. UK digital-platform seller-reporting applicability and operational responsibility.

7. VAT/customs ownership for UK domestic, overseas-stock and multi-consignment cases.

8. Consumer price-transparency contract, including mandatory fees and shipping presentation.

9. Review/rating provenance and moderation contract.

10. Content/image/video/UGC licensing and commercial-use evidence standard.

11. Supplier substitution/fallback rules after customer purchase.

12. Supplier cancellation, non-acknowledgement, stock mismatch and customer remedy.

13. External provider capability verification and re-verification cadence.

14. Sales-channel connector boundary if/when channels are introduced.

15. Operator authority: who may source, approve, publish, suspend, recall and kill a product/supplier/provider.

Gate B PASS requires explicit answers, not assumptions.

======================================================================
0B.19 PHASE MAPPING — NO NEW PARALLEL PHASES
======================================================================

Everything in this clarification maps into the existing phases:

GATE B
→ legal/business responsibility, seller/MoR, tax ownership, disclosures, reporting applicability, review/price/rights responsibilities.

PHASE C
→ provider/legal capability register, feature flags, observability, incidents, retention, kill/recovery foundations.

PHASE D
→ supplier qualification, provider roles, SLA, provenance, safety/compliance governance.

PHASE E
→ canonical product + multiple supplier offers + deduplication.

PHASE F
→ governed import, rights, AI Facts Lock, merchandising, review/provenance checks.

PHASE G
→ landed cost, consignment-aware VAT/tax/customs, pricing transparency, ledger/reportable financial evidence.

PHASE H
→ stock/price freshness and sellability.

PHASE I/J
→ offer routing, reservation, supplier acknowledgement, fallback/exception handling, idempotency and reconciliation.

PHASE K/L
→ tracking, returns, refunds, supplier recovery and customer remedies.

PHASE M
→ supplier/provider control centre, safety incidents, recall/suspension, capability health, kill switches.

PHASE N/O/P/Q
→ simulator, pilot, controlled scale and final production hardening including legal/provider revalidation.

PRODUCT DISCOVERY remains the existing parallel track and may begin only after canonical supplier data exists.

======================================================================
0B.20 FINAL NON-NEGOTIABLE INVARIANTS
======================================================================

NO PARALLEL MARKETPLACE ARCHITECTURE.
NO PARALLEL ORDER TRUTH.
NO PARALLEL PAYMENT TRUTH.
NO PARALLEL FINANCIAL TRUTH.
NO PROVIDER-SPECIFIC COMMERCE CORE.
NO OWNER PUBLISH BYPASS.
NO DISCOVERY AUTO-PUBLISH.
NO AI-INVENTED PRODUCT FACTS.
NO UNLICENSED COMMERCIAL CONTENT ASSUMPTION.
NO EXTERNAL REVIEW LAUNDERING.
NO DRIP-PRICE DESIGN.
NO RAW-SUPPLIER-STOCK = SELLABLE-STOCK ASSUMPTION.
NO SILENT NON-EQUIVALENT SUPPLIER SUBSTITUTION.
NO TAX RESULT FROM PRICE ALONE.
NO DIGITAL-PLATFORM REPORTING FROM A PARALLEL LEDGER.
NO PRODUCT-SAFETY CHECKBOX WITHOUT INCIDENT/RECALL GOVERNANCE.
NO PROVIDER CAPABILITY IMPLEMENTED FROM MEMORY.

ONE CANONICAL PRODUCT.
MULTIPLE GOVERNED SUPPLIER OFFERS.
ONE CUSTOMER ORDER.
MULTIPLE FULFILMENT LEGS WHERE REQUIRED.
ONE CANONICAL FINANCIAL TRUTH.
ONE GOVERNED CUSTOMER EXPERIENCE.

======================================================================
0B.21 EXECUTION GUARD
======================================================================

This clarification is now input to Gate B and the existing C → Q execution contract.

It does NOT authorise implementation before Gate B PASS.

It does NOT modify the frozen foundation merely to support a future idea.

It does NOT import PagePilot, AliExpress, TikTok, Amazon, Avasam or any other provider into the commerce core.

It does NOT alter Workspace / Super Admin visual design by itself.

Branch Guard and No Fake PASS remain mandatory.
