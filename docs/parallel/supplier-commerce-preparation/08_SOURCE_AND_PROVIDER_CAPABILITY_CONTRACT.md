# SOURCE / PROVIDER CAPABILITY CONTRACT — PREPARATION

Status: PREPARATION ONLY. Provider-specific implementation is NOT authorised.

Purpose: prevent brand names such as TikTok, Amazon, Alibaba, AliExpress, wholesalers or manufacturers from becoming architecture types.

## 1. Core rule

A provider is not a business role merely because Loadify can reach it.

Every external integration must declare factual capabilities.

Provider brand
→ capability evidence
→ one or more canonical roles
→ adapter/connector
→ Loadify contract.

## 2. Canonical external roles

### Discovery Source
Can provide permitted signals useful for deciding what may be worth selling.

Possible signals:
- trend;
- demand;
- engagement;
- category movement;
- price/competition observation;
- product references.

Discovery output is recommendation/evidence only.

### Catalog Source
Can provide permitted factual catalog/product data.

Possible capabilities:
- product identifier;
- title/source description;
- variant references;
- media references where rights permit;
- factual attributes;
- category/source taxonomy;
- source timestamps.

Catalog data is not automatically publishable Loadify truth.

### Supplier
Commercial source that may provide an offer Loadify can procure/fulfil against.

Possible capabilities:
- supplier identity;
- supplier SKU/reference;
- product cost;
- currency;
- stock evidence;
- territory;
- dispatch SLA;
- order acceptance;
- cancellation;
- return/reimbursement rules.

### Fulfilment Provider
Entity/system that executes dispatch/fulfilment if separate from supplier.

Possible capabilities:
- accept fulfilment instruction;
- dispatch;
- carrier selection;
- fulfilment status;
- tracking handoff;
- return routing.

### Carrier
Transport/tracking source.

Possible capabilities:
- tracking events;
- delivery exceptions;
- POD/delivery confirmation;
- estimated delivery.

## 3. One provider may have several roles

Example only:

An external marketplace could be both:
- discovery source;
- catalog source;
- supplier ordering surface.

Another source might be only discovery intelligence.

A wholesaler might be supplier + fulfilment provider.

A manufacturer might be supplier but use a third-party fulfilment provider/carrier.

Core code must still consume role-specific canonical interfaces.

## 4. Capability evidence required before implementation

For every provider, collect current official evidence for:

- API/integration availability;
- authentication method;
- permitted data access;
- catalog/product data rights;
- image/content usage rights;
- rate limits;
- webhooks/events;
- stock semantics;
- price semantics;
- order submission semantics;
- idempotency support;
- acknowledgement semantics;
- tracking semantics;
- cancellation rules;
- return/reimbursement capabilities;
- territories;
- privacy/data processing;
- terms/policy restrictions;
- versioning/deprecation policy.

Do not implement a capability because a consumer website visually appears to support it.

## 5. Connector boundaries

### Discovery connector must output

Conceptually:
- source identity;
- external product/reference identity;
- observed evidence;
- observed timestamp;
- freshness;
- confidence/quality metadata;
- permitted source URL/reference;
- recommendation inputs.

It must NOT directly create:
- customer order;
- financial entry;
- supplier payable;
- published product without review pipeline.

### Catalog connector must output

Conceptually:
- source reference;
- raw factual payload/evidence;
- extracted factual candidates;
- source timestamp/version;
- media rights/provenance state where known.

It must NOT define final Loadify product truth by itself.

### Supplier adapter must expose canonical operations

Conceptually, only where provider supports them:
- get capabilities;
- get/refresh offer;
- get stock;
- get price;
- submit supplier order;
- query/recover supplier order;
- cancel supplier order;
- fetch/receive tracking;
- create/query return;
- query reimbursement/recovery.

Exact API names are not mandated here.

## 6. Adapter response principles

Every operational response must distinguish:

- SUCCESS;
- REJECTED;
- TEMPORARY FAILURE;
- PERMANENT FAILURE;
- UNKNOWN / RESPONSE LOST;
- UNSUPPORTED.

Never collapse UNKNOWN into FAILED if the provider may already have accepted the order.

## 7. Idempotency contract

Supplier order submission must have a canonical Loadify idempotency identity.

If provider supports native idempotency:
- use it according to current official provider contract.

If provider does not:
- Loadify must maintain its own submission/recovery discipline;
- do not blindly resend after timeout;
- query/reconcile external state where possible.

## 8. Provider raw payload rule

Raw provider payload may be retained where justified for:
- audit;
- troubleshooting;
- replay;
- evidence;
- reconciliation.

But raw payload is NOT canonical business truth.

Do not make core business code depend on arbitrary provider JSON structure.

## 9. Product identity rule

External source identifier
≠ Loadify canonical product ID.

Supplier SKU
≠ Loadify canonical product ID.

Marketplace listing ID
≠ Loadify canonical product ID.

All external identifiers are mappings/evidence around canonical identity.

## 10. Media/content rule

External image or text availability does not prove reuse rights.

Pipeline must preserve:
- source;
- rights/licence status;
- review state;
- transformed/original distinction where relevant.

AI rewriting does not automatically cure copyright/licensing restrictions.

## 11. Product Discovery examples

TikTok/Amazon/other consumer marketplaces may be evaluated as potential discovery/intelligence sources only if current permitted access and policies support the intended use.

Do not hardcode assumptions such as:
- public page = permitted ingestion;
- visible sales popularity = API-accessible metric;
- image visible = reusable image;
- marketplace seller = supplier Loadify may order from programmatically.

## 12. Supplier examples

Alibaba/AliExpress/wholesalers/manufacturers may be evaluated as supplier/catalog/fulfilment sources only after current capability/policy verification.

Do not assume:
- stable stock API;
- stable price API;
- direct shipping capability;
- UK compliance;
- returns/reimbursement automation;
- buyer-address data permissions;
- SLA quality.

Qualification and adapter capability evidence decide eligibility.

## 13. Fallback supplier selection

Multiple Supplier Offers do not automatically mean Loadify may switch suppliers after customer payment.

Gate B and later orchestration policy must define:
- pre-payment offer selection;
- post-payment price tolerance;
- permitted fallback supplier;
- delivery-promise impact;
- compliance equivalence;
- variant equivalence;
- customer notification/consent if required;
- financial adjustment rules.

Never substitute a merely similar product.

## 14. Provider failure isolation

Provider outage must not corrupt Loadify core.

Expected architecture:
PROVIDER FAILURE
→ adapter/connector failure state
→ canonical exception/incident
→ controlled hold/fallback/recovery
→ buyer/admin outcome.

No provider exception should leak arbitrary lifecycle states into core tables.

## 15. Versioning

Provider API version and Loadify adapter version are distinct.

Record enough evidence to know:
- which provider API/version produced data/action;
- which Loadify adapter contract version interpreted it.

A provider API upgrade must not silently change historical order semantics.

## 16. Security

Supplier/provider credentials:
- server side only;
- least privilege;
- rotation capable;
- never exposed to browser/mobile;
- never stored in product metadata;
- never logged in plaintext.

Buyer personal data sent to a supplier/fulfilment provider must be limited to contractually/operationally necessary fields and governed by the privacy contract.

## 17. Provider onboarding PASS

A provider is not production-ready because an API call works.

PASS requires evidence, according to relevant contract, for:
- identity/qualification;
- capabilities;
- security;
- data/privacy;
- catalog/product provenance;
- compliance;
- stock/price behavior;
- order idempotency/acknowledgement;
- tracking;
- cancellation/return/recovery;
- failure paths;
- observability;
- simulator;
- controlled pilot.

## 18. Architectural conclusion

Loadify architecture must remain stable if a provider is replaced.

Correct dependency:

LOADIFY BUSINESS CONTRACT
→ CANONICAL INTERFACE
→ PROVIDER ADAPTER/CONNECTOR
→ EXTERNAL PROVIDER.

Never:

EXTERNAL PROVIDER
→ dictates Loadify product/order/payment architecture.