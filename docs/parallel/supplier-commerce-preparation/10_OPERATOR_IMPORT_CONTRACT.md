# OPERATOR IMPORT CONTRACT

Status: PREPARATION ONLY. No runtime/schema implementation is authorised by this document.

Purpose: define the first-class Loadify operator sourcing/import capability without creating an admin bypass around canonical product, supplier, compliance or finance controls.

## 1. Business intent

An authorised Loadify operator may identify a product elsewhere and bring it into the Loadify sourcing/review pipeline.

This is a normal governed platform capability.

It is NOT:
- direct DB insertion into published products;
- URL -> publish;
- copy-anything scraping permission;
- automatic declaration that the source is the supplier;
- automatic proof of image/content rights;
- automatic proof of compliance;
- automatic proof of profitability.

## 2. Supported entry classes

The future implementation may support, subject to provider rights/capability verification:
- manual product entry;
- external product URL;
- supplier product URL;
- approved catalog import;
- approved feed import;
- supplier API/catalog;
- approved file import;
- Product Discovery recommendation;
- re-import/update of an existing source.

Entry method must remain separate from source role.

## 3. Canonical pipeline

INPUT
-> CREATE IMPORT ATTEMPT
-> IDENTIFY SOURCE
-> CLASSIFY SOURCE ROLE(S)
-> EXTRACT FACTUAL DATA
-> PRESERVE RAW EVIDENCE/REFERENCE
-> NORMALIZE
-> IDENTIFY PRODUCT CANDIDATE
-> CANONICAL MATCH / CREATE CANDIDATE
-> IDENTIFY/MATCH SUPPLIER OR FULFILMENT SOURCE
-> CREATE/UPDATE SUPPLIER OFFER CANDIDATE
-> PROVENANCE CHECK
-> CONTENT/IMAGE RIGHTS CHECK
-> PRODUCT COMPLIANCE CHECK
-> COMMERCIAL ECONOMICS
-> AI PRODUCT BUILDER
-> HUMAN/CONTROLLED REVIEW
-> APPROVE / REJECT / HOLD
-> PUBLISH OR UPDATE.

No step may be skipped merely because the caller is Loadify operator/admin.

## 4. Import attempt identity

Every attempt needs an idempotent identity/retry strategy.

The design must distinguish:
- same request retried;
- same source re-imported intentionally;
- same product discovered from another source;
- same source with a changed external version;
- operator correction of previously extracted data.

Retry must not create uncontrolled duplicate products or offers.

## 5. Raw source evidence

Where legally/contractually permitted, preserve enough source evidence/reference to explain:
- where a fact came from;
- when it was observed;
- what source/provider role was assumed at that time;
- what data was transformed;
- what was accepted/rejected by review.

Raw source evidence is not automatically publishable content.

## 6. Source role classification

A submitted URL may point to:
- Discovery Source;
- Catalog Source;
- Supplier;
- Fulfilment Provider;
- Marketplace listing;
- unknown/unsupported source.

The pipeline must not infer `supplier` merely because a product is purchasable at a URL.

Unsupported/ambiguous role -> REVIEW/HOLD, not fabricated supplier identity.

## 7. Factual extraction

Extraction may identify candidate facts such as:
- source title;
- source description;
- identifiers;
- variant labels;
- dimensions;
- weight;
- materials;
- brand/manufacturer where evidenced;
- source price;
- source currency;
- images/reference URLs;
- stock/availability indicators;
- shipping/dispatch indicators;
- source product reference/SKU;
- compliance claims.

Extraction confidence does not equal truth acceptance.

## 8. Normalisation

Normalisation may:
- convert units;
- standardise formatting;
- map category vocabulary;
- split product vs variant facts;
- standardise identifiers;
- normalize currencies for comparison while preserving source currency;
- clean presentation noise.

Normalisation must not invent missing facts.

## 9. Canonical identity matching

Match signals may include, after Gate B design:
- GTIN/EAN/UPC/MPN;
- brand + model;
- manufacturer identifiers;
- variant identifiers;
- normalized key attributes;
- trusted source mappings;
- image similarity only as supporting evidence, never sole truth where unsafe.

Outputs:
- MATCH;
- NEW CANDIDATE;
- AMBIGUOUS/REVIEW;
- REJECT.

False-positive merge must be reversible/reviewable.

## 10. Supplier matching

After product identity, identify whether an approved supplier/fulfilment source can actually fulfil the product.

Possible outcomes:
- approved existing supplier offer match;
- new offer candidate for approved supplier;
- supplier qualification required;
- source is discovery/catalog only, no supplier identified;
- unsupported/unverified supplier;
- cannot fulfil -> HOLD.

A product may exist canonically before there is a sellable supplier offer.

## 11. Provenance and rights

Separate checks:
- source provenance;
- right to use factual data;
- right to use images/media;
- right to use branded copy/assets;
- right to sell/distribute where applicable.

Do not conflate publicly visible content with permission to republish it.

## 12. Compliance

Compliance review is category/territory dependent and must be based on current authoritative rules before implementation.

Potential evidence classes include:
- product safety;
- labelling;
- restricted/prohibited categories;
- electrical/chemical/cosmetic/toy/medical/etc. requirements where applicable;
- age restrictions;
- origin/manufacturer/importer obligations;
- certifications where required.

AI cannot self-certify compliance.

## 13. Commercial economics

Before publish/sellable state, calculate enough economics to determine whether an offer is commercially viable under Gate B.

Separate:
- supplier product cost;
- supplier shipping/fulfilment cost;
- customs/duty/tax where applicable;
- FX;
- payment/provider fees;
- customer shipping charge;
- target sell price;
- expected Loadify revenue/margin/contribution;
- risk/allowance policy if approved.

Do not publish a price merely by adding an arbitrary percentage to source price.

## 14. AI Product Builder

AI receives verified/approved factual inputs.

May generate:
- Loadify title;
- description;
- benefit wording grounded in facts;
- SEO metadata;
- FAQ;
- structured presentation.

Cannot generate factual authority for:
- certification;
- origin;
- material;
- dimensions;
- warranty;
- safety;
- medical/technical performance;
unless evidence exists.

## 15. Review states

Conceptual states may include responsibilities such as:
- draft;
- extracting;
- normalized;
- identity_review;
- supplier_review;
- compliance_review;
- rights_review;
- commercial_review;
- merchandising_review;
- approved;
- rejected;
- held;
- published.

These are conceptual responsibilities, NOT mandated final enum names.

## 16. Failure and retry

E2E must cover:
- invalid URL/input;
- provider unavailable;
- extraction incomplete;
- source changed during import;
- ambiguous canonical match;
- duplicate import;
- supplier not identified;
- stock unknown;
- price unknown/stale;
- rights unknown;
- compliance blocked;
- margin below floor;
- AI generation failure;
- publish failure after approval;
- retry after partial completion.

Partial failure must not create partially sellable state.

## 17. Update/re-import

Re-import of an existing source must distinguish:
- factual product changes;
- supplier offer changes;
- price changes;
- stock changes;
- content changes;
- compliance/provenance changes.

A source update must not silently rewrite paid order history.

## 18. Operator permissions

Operator privileges allow initiating/reviewing governed workflows, not bypassing canonical rules.

Sensitive actions require auditable authorization according to final foundation auth contract.

## 19. Admin/Super Admin integration

Future UI should fit existing admin governance rather than create a parallel admin application.

Likely responsibilities:
- new import;
- import queue;
- source evidence;
- identity match review;
- supplier match review;
- compliance/rights review;
- economics preview;
- merchandising preview;
- publish approval;
- failure/retry controls;
- audit history.

Visual implementation waits for authorised phase and must preserve established admin design unless explicitly changed.

## 20. PASS criteria

Operator Import capability is not PASS until evidence proves:
- operator can source/import without direct DB bypass;
- source roles are correctly separated;
- duplicate product prevention/review works;
- product and supplier offer responsibilities remain separate;
- rights/compliance can block publication;
- commercial economics can block unsafe/unprofitable publication according to policy;
- AI Facts Lock holds;
- retry is idempotent;
- publication is audited;
- web/mobile consumer truth remains canonical;
- no physical Loadify warehouse dependency is introduced.
