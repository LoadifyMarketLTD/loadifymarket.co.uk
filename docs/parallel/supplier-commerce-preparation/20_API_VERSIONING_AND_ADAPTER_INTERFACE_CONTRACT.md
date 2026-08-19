# API VERSIONING AND ADAPTER INTERFACE CONTRACT

Status: PREPARATION ONLY. No runtime/API implementation is authorised by this document.

## Purpose

Define how Supplier Commerce capabilities must enter Loadify without allowing provider-specific contracts, unstable external payloads, or future API changes to become core platform truth.

## Core rule

EXTERNAL PROVIDER CONTRACT
→ PROVIDER ADAPTER / CONNECTOR
→ VERSIONED CANONICAL LOADIFY INTERFACE
→ CANONICAL DOMAIN SERVICE
→ EXISTING LOADIFY ORDER / PAYMENT / PRODUCT / SHIPMENT / RETURN SURFACES.

The external provider never becomes the domain model.

## Versioning principles

1. Canonical Loadify interfaces are explicitly versioned.
2. Provider API versions are tracked independently from Loadify interface versions.
3. A provider upgrade must not silently change canonical semantics.
4. Breaking changes require a new canonical interface version or an explicit compatibility layer.
5. Deprecated canonical versions must have an owner, migration path and removal gate.
6. Stored operational history must preserve which provider contract/version produced the event or snapshot.
7. Web and mobile must consume the same canonical server contract; no mobile-only supplier API semantics.

## Adapter capability boundaries

### Discovery connector
May expose:
- source identity;
- source item reference;
- observed product facts;
- trend/opportunity evidence;
- freshness;
- confidence;
- permitted source metadata.

Must not expose into core as financial or supplier truth unless separately validated through the appropriate canonical pipeline.

### Catalog connector
May expose:
- source catalog identity;
- factual attributes;
- variants;
- media references;
- source timestamps;
- provenance/evidence.

### Supplier adapter
May expose canonical operations such as:
- capabilities();
- catalog();
- stock();
- price();
- quote() where supported;
- reserve() where supported;
- submitOrder();
- getOrder();
- cancelOrder();
- tracking();
- returnRequest();
- reimbursementStatus().

These names are conceptual. Final method names are not mandated before Gate B/schema/API design.

### Fulfilment provider adapter
May expose:
- fulfilment acceptance;
- dispatch;
- package/tracking references;
- fulfilment events;
- delivery evidence;
- return routing where supported.

### Carrier adapter
May expose:
- carrier tracking identifier;
- normalized shipment event stream;
- delivery proof metadata where legally/contractually permitted.

## Canonical request/response requirements

Every state-changing canonical operation should eventually include, where relevant:
- canonical request identifier;
- idempotency key;
- correlation/trace identifier;
- actor/system identity;
- canonical entity reference;
- provider reference;
- interface version;
- provider adapter version;
- timestamp;
- timeout policy;
- retry classification;
- deterministic result class;
- raw provider evidence reference where retention policy permits.

## Result classification

Adapters must normalize provider responses into stable classes such as:
- SUCCESS;
- ACCEPTED_PENDING;
- RETRYABLE_FAILURE;
- PERMANENT_REJECTION;
- AUTH_CONFIGURATION_FAILURE;
- RATE_LIMITED;
- PRICE_CHANGED;
- STOCK_CHANGED;
- UNKNOWN_OUTCOME;
- MANUAL_REVIEW_REQUIRED.

Provider-specific status strings may be retained as evidence but must not drive core lifecycle directly.

## Unknown outcome rule

A timeout/network loss after a state-changing provider request is not equivalent to failure.

The canonical engine must treat it as UNKNOWN_OUTCOME until reconciliation proves whether the provider accepted the request.

Never blindly retry an external order submission without idempotency/reconciliation evidence.

## Capability negotiation

Do not assume all suppliers support the same features.

Capabilities may differ for:
- real-time stock;
- real-time price;
- reservation;
- order acknowledgement;
- cancellation;
- partial fulfilment;
- tracking webhook;
- polling;
- return authorization;
- supplier reimbursement;
- product content/media rights.

Core orchestration must branch on canonical capabilities, not provider brand names.

## Compatibility rule

A new adapter may be added only if it can map provider behaviour to existing canonical responsibilities or an explicitly approved canonical extension.

Never add provider-specific columns/lifecycle states to core merely because one integration exposes them.

## Security

- provider credentials server-side only;
- least privilege;
- secrets never serialized into canonical payloads/logs;
- webhook authenticity verified according to current official provider docs;
- adapter access is auditable;
- credential rotation does not alter canonical identity/history.

## Contract tests

Every adapter implementation must later pass a provider-independent contract suite covering:
- auth/config failure;
- supported/unsupported capability;
- success normalization;
- retryable failure;
- permanent rejection;
- timeout/unknown outcome;
- idempotency;
- duplicate callback/event;
- stale event;
- out-of-order event;
- malformed provider payload;
- version mismatch;
- replay/reconciliation.

## API change governance

Before changing a canonical Supplier Commerce API:
1. identify consumers;
2. identify stored-history implications;
3. classify additive vs breaking;
4. define compatibility window;
5. update tests/simulator;
6. update observability;
7. update web/mobile consumers together where relevant;
8. Branch Guard verifies no parallel contract was introduced.

## PASS criteria

This contract is satisfied in implementation only when:
- provider payloads are isolated behind adapters/connectors;
- canonical APIs are versioned;
- unknown outcomes are explicitly represented;
- idempotency and reconciliation exist for state-changing provider actions;
- provider status strings do not leak into core lifecycle;
- web/mobile share the same business contract;
- external API upgrades cannot silently rewrite Loadify semantics.
