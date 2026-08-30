# Avasam Gate B — Executable Capability Policy — 2026-08-30

## Purpose

This checkpoint converts the Avasam commercial capability gap from documentation-only knowledge into a fail-closed executable policy.

It does **not** activate Orders, PII, Supplier Commerce hosted state, marketplace listing, order submission, tracking, cancellation, returns or reimbursement.

## Baseline

Authoritative product baseline when this work started:

`main@1484c564ee85b7a421efe6bb97ebad748590b57d`

Existing verified Avasam state remains:

- provider: `avasam`;
- controlled supplier terms reference: `GB010107`;
- controlled SKU: `S0671779793`;
- territory: `GB`;
- adapter version: `1.1.0-read-only-pilot`;
- verified live capabilities: `catalog`, `stock`, `price`;
- Orders permission: OFF;
- PII permission: OFF;
- hosted Supplier Commerce activation: OFF.

## Public documentation re-check

A targeted public-web check on 2026-08-30 found current Avasam public pages describing automated order management, shipping, returns and inventory synchronization at product/platform level.

That public material did **not** provide an authoritative Seller API contract resolving the Gate B gaps recorded in checkpoint 20, including:

- canonical order-create endpoint;
- stable provider order identifier;
- idempotency / lost-response recovery;
- deterministic acknowledgement lookup;
- pre-order shipping service/quote contract;
- dedicated least-privilege tracking endpoint;
- cancellation API;
- return-creation API;
- reimbursement finality/reconciliation contract;
- transactional rate limits/retry rules;
- order-lifecycle webhook contract.

Therefore no commercial capability is promoted from platform marketing statements or undocumented inference.

## Executable policy

New module:

`netlify/functions/_shared/avasamCommercialCapabilityPolicy.ts`

It classifies the complete `SupplierAdapterV1` capability surface using the checkpoint-20 vocabulary:

- `VERIFIED_IMPLEMENTABLE`
- `VERIFIED_MANUAL_ONLY`
- `REQUIRES_PII_PERMISSION`
- `REQUIRES_ORDERS_PERMISSION`
- `PROVIDER_CONTRACT_STILL_MISSING`
- `NOT_SUPPORTED`

The policy also records:

- whether adapter advertisement is allowed;
- whether automated execution is allowed;
- required account permissions;
- explicit blockers;
- concise evidence/rationale.

## Current classifications

| Capability | Classification | Adapter advertisement | Automated execution |
|---|---|---:|---:|
| supplier_identity | PROVIDER_CONTRACT_STILL_MISSING | NO | NO |
| catalog | VERIFIED_IMPLEMENTABLE | YES | YES |
| variants | PROVIDER_CONTRACT_STILL_MISSING | NO | NO |
| stock | VERIFIED_IMPLEMENTABLE | YES | YES |
| price | VERIFIED_IMPLEMENTABLE | YES | YES |
| shipping | PROVIDER_CONTRACT_STILL_MISSING | NO | NO |
| order_submission | PROVIDER_CONTRACT_STILL_MISSING | NO | NO |
| acknowledgement | PROVIDER_CONTRACT_STILL_MISSING | NO | NO |
| tracking | REQUIRES_PII_PERMISSION | NO | NO |
| cancellation | VERIFIED_MANUAL_ONLY | NO | NO |
| returns | PROVIDER_CONTRACT_STILL_MISSING | NO | NO |
| reimbursement | PROVIDER_CONTRACT_STILL_MISSING | NO | NO |

### Cancellation scope note

`VERIFIED_MANUAL_ONLY` applies to the controlled supplier policy `GB010107`: the supplier-specific terms require a support-mediated cancellation request, standard cancellation is disabled, and cancellation is not guaranteed.

This must not be generalized into an automated Avasam cancellation capability.

## Registry convergence

`netlify/functions/_shared/supplierProviderRegistry.ts` now derives Avasam `verifiedCapabilities` from the executable Gate B policy rather than duplicating a literal list.

The provider registry still reports:

- `codeState = verified_read_only`;
- `hostedActivation = off`.

`potentialCapabilities` now represents the complete Gate B research surface only. It does not mean those capabilities are enabled or provider-verified.

## Regression gates

New test:

`netlify/functions/__tests__/avasam-commercial-capability-policy.test.ts`

It proves that:

1. every `SupplierAdapterV1` capability is classified;
2. only `catalog`, `stock`, `price` may be advertised;
3. the runtime Avasam adapter and provider registry remain aligned to those verified capabilities;
4. order submission remains blocked by canonical-endpoint, stable-ID, idempotency, lost-response, Orders and PII gates;
5. tracking remains a least-privilege PII boundary;
6. controlled-supplier cancellation remains manual-only;
7. shipping, acknowledgement, returns and reimbursement remain fail-closed.

## Promotion rule after Avasam reply

A capability may change classification only when authoritative provider evidence is available, such as:

- current official endpoint/method/request/response documentation;
- exact required permission;
- stable order identifier/reconciliation rule;
- documented idempotency/retry/lost-response semantics;
- explicit statement that the supported process is manual-only;
- dedicated tracking/PII minimisation contract;
- webhook schema/signature/retry contract;
- rate-limit policy.

Changing a classification to `VERIFIED_IMPLEMENTABLE` is still **not hosted activation**. A new implementation and verification gate is required, followed by the existing Supplier Commerce simulator/governance/readiness chain.

## Safety state

Unchanged:

- Orders OFF;
- PII OFF;
- listing OFF;
- order submission OFF;
- hosted Supplier Commerce OFF;
- no supplier order call;
- no customer PII disclosure;
- no Stripe/payment mutation;
- no Web Mobile / Seller Workspace / Super Admin / Auth changes;
- no GitHub Actions.

## Next step

With Avasam Gate B now encoded fail-closed, continue the main Supplier Commerce workstream in parallel with provider clarification:

1. keep checkpoint 20 ready for Avasam support;
2. move to BigBuy authorized read-only verification when credentials/sandbox access are available;
3. continue Direct Supplier canonical ingestion design without activating a provider;
4. return to Avasam commercial implementation only when authoritative evidence promotes a capability.
