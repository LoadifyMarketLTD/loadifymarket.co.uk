# AI FACTS LOCK AND MERCHANDISING CONTRACT

Status: PREPARATION ONLY. This defines what AI may and may not do inside Loadify product sourcing/merchandising.

## 1. Purpose

AI Product Builder exists to improve presentation, not to manufacture product truth.

VERIFIED FACTS
→ MERCHANDISING TRANSFORMATION
→ REVIEW
→ BUYER-FACING CONTENT.

AI output must remain traceable to factual evidence.

## 2. Hard invariant

AI MAY REWRITE.
AI MAY SUMMARISE.
AI MAY STRUCTURE.
AI MAY SUGGEST.
AI MAY NOT INVENT MATERIAL PRODUCT FACTS.

If a fact is absent, uncertain or unsupported, AI must not fill the gap as if it were known.

## 3. Fact classes

The pipeline should distinguish at responsibility level:

- verified fact;
- source-reported fact;
- conflicting fact;
- inferred candidate;
- missing/unknown;
- generated merchandising text.

Generated merchandising text must never silently become the evidence source for its own claims.

## 4. High-risk claims

Extra evidence/review is required for claims about:

- certifications;
- regulatory compliance;
- safety;
- medical/health benefits;
- ingredients/material composition;
- electrical/technical ratings;
- compatibility;
- origin/manufacturer;
- warranty;
- age suitability;
- dimensions/weight where operationally material;
- environmental/ethical claims;
- authenticity/brand claims.

AI should omit or clearly defer unsupported claims rather than make a plausible guess.

## 5. Allowed merchandising outputs

Subject to verified facts, AI may create/suggest:

- product title;
- short description;
- long description;
- bullet benefits;
- feature grouping;
- SEO title/meta copy;
- FAQ;
- comparison-friendly wording;
- variant labels;
- category suggestions;
- search keywords;
- alt-text based on approved media/facts;
- internal merchandising notes.

## 6. Evidence linkage

Material generated claims should be explainable back to source facts/evidence.

At minimum the architecture should support answering:

- which facts were provided to the builder;
- which evidence/version supported those facts;
- which model/prompt/rule version generated the content where relevant;
- who approved/edited the result;
- what changed between content versions.

## 7. Conflict handling

If two sources conflict on a material fact:

- do not pick the more convenient value silently;
- preserve the conflict;
- lower confidence/hold publishability as policy requires;
- request authoritative evidence or operator review.

AI cannot resolve a compliance-relevant factual conflict merely by probability.

## 8. Missing data

Missing information should remain missing unless obtained from an approved source or operator evidence.

Examples:

- unknown material → do not say `premium aluminium`;
- unknown warranty → do not say `1-year warranty`;
- unknown country of origin → do not infer from supplier address;
- unknown certification → do not infer from marketplace category.

## 9. Source text transformation

Where content rights permit factual extraction but not verbatim republication, AI Product Builder may produce original merchandising from verified facts without copying protected source wording.

Rights policy remains authoritative; AI transformation is not a mechanism for bypassing source/content rights.

## 10. Images

AI/media workflows must preserve separation between:

- source image evidence/reference;
- licensed/approved buyer-facing media;
- generated media;
- operator-uploaded media.

Generated imagery must not falsely depict material product features that are not evidenced.

## 11. Human/operator review

Review requirements may vary by risk/category/confidence.

Possible policy outcomes:

AUTO-APPROVE LOW-RISK PRESENTATION
OPERATOR REVIEW
COMPLIANCE REVIEW
HOLD
REJECT

Final thresholds are not fixed here.

## 12. Versioning

Published merchandising should be versionable so historical orders/listings can be reconstructed when needed.

Changing current description must not erase:

- source/evidence history;
- prior approved version;
- material claims used at purchase time where retention is required.

## 13. Opportunity Intelligence separation

Product Discovery may recommend that a product is commercially interesting.

That recommendation is not permission to:

- publish it;
- claim facts;
- approve compliance;
- select a supplier without evidence;
- create financial truth.

DISCOVERY SCORE ≠ PRODUCT FACT.

## 14. Prompt/model governance

Provider/model details are implementation concerns, but the contract requires:

- versioned prompt/rule behavior where material;
- deterministic validations around high-risk fields;
- no secret/provider credentials in client code;
- failure/timeout handling;
- observability and audit of material generation failures;
- ability to replace AI provider without redefining product truth.

## 15. Fail closed

If the AI service:

- times out;
- returns malformed content;
- contradicts facts;
- adds unsupported material claims;
- exceeds confidence/policy boundaries;

then merchandising generation/review fails; canonical product truth remains intact.

Commerce must not depend on an AI service being continuously available after approved buyer-facing content exists.

## 16. E2E acceptance

Future E2E must prove:

1. unsupported certification cannot reach published copy;
2. known facts can be professionally rewritten without altering their meaning;
3. conflicting facts trigger hold/review instead of silent selection;
4. missing warranty remains absent;
5. AI failure cannot corrupt canonical product facts;
6. published content retains source/evidence traceability;
7. operator edit remains distinct from source fact;
8. a new AI provider/model does not change canonical product identity;
9. generated image/content cannot bypass rights/compliance gates;
10. Product Discovery score cannot auto-publish by itself.

## 17. Gate rule

Implementation waits for the canonical sequence and the final product/evidence schema design after Gate B.

The invariant that survives every implementation choice is:

AI MERCHANDISING IS A CONSUMER OF VERIFIED PRODUCT TRUTH, NEVER ITS UNCONTROLLED AUTHOR.